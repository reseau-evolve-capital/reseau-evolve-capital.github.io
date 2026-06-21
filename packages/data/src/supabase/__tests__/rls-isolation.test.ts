/**
 * rls-isolation.test.ts — OPS-003 : preuve d'isolation cross-club de la RLS.
 *
 * Objectif : démontrer, table par table et opération par opération, qu'un membre
 * authentifié du club A ne peut JAMAIS lire ni écrire les données du club B
 * (SELECT/INSERT/UPDATE/DELETE), tandis que le service role bypasse la RLS.
 *
 * --- Stratégie d'authentification (sans GoTrue) ---
 * La RLS s'appuie sur `auth.uid()`, qui lit le claim `sub` du JWT porté par la requête
 * PostgREST. On n'a donc pas besoin du service d'auth : on signe nous-mêmes un JWT HS256
 * avec le `JWT_SECRET` local (le même que PostgREST vérifie), `role: 'authenticated'` et
 * `sub` = id du user de test. C'est exactement ce qu'un client `supabase-js` enverrait après
 * un login, mais déterministe et hors-ligne. Aucune dépendance ajoutée : HMAC via `node:crypto`.
 *
 * --- Garde-fou CI ---
 * Cette suite a besoin de la stack Supabase locale (DB réelle). Le gate par défaut
 * (`make test`) tourne SANS DB : on `describe.skipIf(...)` quand les env manquent, pour
 * que le gate reste vert. Lancer la suite avec la DB up via `pnpm --filter @evolve/data test:rls`
 * (voir package.json + docs/security/rls-audit.md).
 *
 * --- Cycle de vie ---
 * beforeAll : seed via service role de 2 clubs (A, B), 2 users (A membre actif de A,
 *   B membre actif de B) + 1 ligne par table sensible dans chaque club. Tous les UUID sont
 *   préfixés `f…` (hors plage du seed `a…/b…/c…`) pour ne jamais collisionner avec la fixture.
 * afterAll : suppression en cascade (clubs → tout le reste via ON DELETE CASCADE) + users.
 *
 * Réf : docs/security/rls-audit.md, migrations 010/011/016/020, CLAUDE.md (RLS activée partout).
 */

import crypto from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createServiceRoleClient } from '../admin.ts'
import type { Database } from '../types.gen.ts'

// ─── Env / garde-fou ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// JWT_SECRET local Supabase (fixe en dev — cf. `supabase status -o env`). On le rend
// surchargeable, mais on fournit le défaut public et bien connu de la stack locale.
const JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long'

// On a besoin de l'URL, de la clé service (seed/bypass) ET de la clé anon (apikey du client RLS).
const HAS_DB = Boolean(SUPABASE_URL && SERVICE_KEY && ANON_KEY)

// ─── UUID de test (hors plage du seed) ───────────────────────────────────────

const CLUB_A = 'ffffffff-0000-0000-0000-0000000000a1'
const CLUB_B = 'ffffffff-0000-0000-0000-0000000000b1'
const USER_A = 'ffffffff-0000-0000-0000-0000000000a2'
const USER_B = 'ffffffff-0000-0000-0000-0000000000b2'
const MEM_A = 'ffffffff-0000-0000-0000-0000000000a3'
const MEM_B = 'ffffffff-0000-0000-0000-0000000000b3'
const EMAIL_A = 'rls.member.a@example.test'
const EMAIL_B = 'rls.member.b@example.test'

// NET-019 — fixtures feedback. La table feedback.user_id référence auth.users (≠ public.users) :
// on crée donc de VRAIS comptes auth via l'API admin GoTrue, et on capture leurs IDs générés.
// Acteurs : un auteur dans le club A, un auteur dans le club B, un trésorier (staff) du club A,
// et un membre réseau (network_board). IDs résolus dans beforeAll.
const EMAIL_FB_AUTHOR_A = 'rls.fb.author.a@example.test'
const EMAIL_FB_AUTHOR_B = 'rls.fb.author.b@example.test'
const EMAIL_STAFF_A = 'rls.fb.staff.a@example.test'
const EMAIL_NET = 'rls.fb.network@example.test'
const FB_A = 'ffffffff-0000-0000-0000-0000000000e1' // feedback club A
const FB_B = 'ffffffff-0000-0000-0000-0000000000e2' // feedback club B
const FB_EMAILS = [EMAIL_FB_AUTHOR_A, EMAIL_FB_AUTHOR_B, EMAIL_STAFF_A, EMAIL_NET] as const

/** IDs auth résolus à la création (beforeAll). */
const fbIds = {
  authorA: '',
  authorB: '',
  staffA: '',
  net: '',
}

// ─── Signature JWT HS256 maison (zéro dépendance) ─────────────────────────────

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/** Forge un JWT `authenticated` (claim `sub` = userId) signé avec le secret local. */
function signAuthenticatedJwt(userId: string): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(
    JSON.stringify({
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated',
      iat: now,
      exp: now + 3600,
    })
  )
  const data = `${header}.${payload}`
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest())
  return `${data}.${sig}`
}

/** Client supabase-js authentifié comme `userId` (RLS appliquée, comme en prod). */
function authedClientFor(userId: string): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL as string, ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${signAuthenticatedJwt(userId)}` } },
  })
}

// ─── Seed / teardown (service role — bypass RLS) ──────────────────────────────

const SYNCED = '2025-01-01T00:00:00Z'

/** Insère, pour `clubId`, une ligne dans chaque table sensible référencée par `membershipId`. */
async function seedClubData(
  admin: SupabaseClient<Database>,
  clubId: string,
  membershipId: string
): Promise<void> {
  const expectOk = (label: string, error: { message: string } | null): void => {
    if (error) throw new Error(`seed ${label} (${clubId}) : ${error.message}`)
  }

  expectOk(
    'positions',
    (
      await admin.from('positions').insert({
        club_id: clubId,
        name: `Titre ${clubId.slice(-2)}`,
        symbol: `SYM-${clubId.slice(-2)}`,
        quantity: 10,
        synced_at: SYNCED,
      })
    ).error
  )

  expectOk(
    'transactions',
    (
      await admin.from('transactions').insert({
        club_id: clubId,
        type: 'buy',
        symbol: `SYM-${clubId.slice(-2)}`,
        transaction_date: '2024-12-01',
        synced_at: SYNCED,
      })
    ).error
  )

  expectOk(
    'contributions',
    (
      await admin.from('contributions').insert({
        membership_id: membershipId,
        club_id: clubId,
        detention_pct: 0.05,
        total_contributed: 1000,
        status: 'ok',
        synced_at: SYNCED,
      })
    ).error
  )

  expectOk(
    'contribution_months',
    (
      await admin.from('contribution_months').insert({
        membership_id: membershipId,
        club_id: clubId,
        year: 2024,
        month: 12,
        amount: 100,
        status: 'paid',
        synced_at: SYNCED,
      })
    ).error
  )

  expectOk(
    'sheet_snapshots',
    (
      await admin.from('sheet_snapshots').insert({
        club_id: clubId,
        sheet_name: 'Portefeuille',
        status: 'success',
        raw_data: {},
        row_count: 0,
        checksum: `chk-${clubId}`,
      })
    ).error
  )

  expectOk(
    'attestation_sends',
    (
      await admin.from('attestation_sends').insert({
        membership_id: membershipId,
        period: '2024-12',
      })
    ).error
  )

  expectOk(
    'invitations',
    (
      await admin.from('invitations').insert({
        club_id: clubId,
        email: `invite-${clubId.slice(-2)}@example.test`,
        token_hash: `hash-${clubId}`,
      })
    ).error
  )

  expectOk(
    'member_access_events',
    (
      await admin.from('member_access_events').insert({
        membership_id: membershipId,
        action: 'locked',
        reason: 'seed',
      })
    ).error
  )
}

beforeAll(async () => {
  if (!HAS_DB) return
  const admin = createServiceRoleClient()

  // Nettoyage défensif (run précédent interrompu) puis seed frais.
  await admin.from('feedback').delete().in('id', [FB_A, FB_B])
  await admin.from('clubs').delete().in('id', [CLUB_A, CLUB_B])
  await admin.from('users').delete().in('id', [USER_A, USER_B])
  // Comptes auth des fixtures feedback (createUser échoue sur email dupliqué) — purge préalable.
  {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of list?.users ?? []) {
      if (u.email && (FB_EMAILS as readonly string[]).includes(u.email)) {
        await admin.auth.admin.deleteUser(u.id)
      }
    }
  }

  const ins = async (
    label: string,
    // Les builders supabase-js sont des « thenables », pas des Promise (pas de .catch/.finally).
    p: PromiseLike<{ error: { message: string } | null }>
  ): Promise<void> => {
    const { error } = await p
    if (error) throw new Error(`seed ${label} : ${error.message}`)
  }

  await ins(
    'clubs',
    admin.from('clubs').insert([
      { id: CLUB_A, name: 'RLS Club A', slug: 'rls-club-a' },
      { id: CLUB_B, name: 'RLS Club B', slug: 'rls-club-b' },
    ])
  )
  await ins(
    'users',
    admin.from('users').insert([
      { id: USER_A, email: EMAIL_A, full_name: 'RLS Member A' },
      { id: USER_B, email: EMAIL_B, full_name: 'RLS Member B' },
    ])
  )
  await ins(
    'memberships',
    admin.from('memberships').insert([
      {
        id: MEM_A,
        user_id: USER_A,
        club_id: CLUB_A,
        role: 'member',
        status: 'active',
        joined_at: '2021-01-01',
      },
      {
        id: MEM_B,
        user_id: USER_B,
        club_id: CLUB_B,
        role: 'member',
        status: 'active',
        joined_at: '2021-01-01',
      },
    ])
  )

  await seedClubData(admin, CLUB_A, MEM_A)
  await seedClubData(admin, CLUB_B, MEM_B)

  // ── NET-019 — fixtures feedback (club_id + RLS resserrée, migration 051) ─────
  // feedback.user_id → auth.users : on crée de vrais comptes auth (API admin) et on capture
  // leurs IDs. On insère ensuite les public.users miroir (FK memberships) + memberships +
  // network_member + 2 feedbacks (un par club).
  const createAuth = async (email: string): Promise<string> => {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (error || !data.user) throw new Error(`createUser ${email} : ${error?.message}`)
    return data.user.id
  }
  fbIds.authorA = await createAuth(EMAIL_FB_AUTHOR_A)
  fbIds.authorB = await createAuth(EMAIL_FB_AUTHOR_B)
  fbIds.staffA = await createAuth(EMAIL_STAFF_A)
  fbIds.net = await createAuth(EMAIL_NET)

  // public.users miroir (FK memberships.user_id → public.users). createUser ne déclenche le
  // re-key handle_new_user que s'il existe déjà une ligne public.users au même email (ici non) :
  // on insère donc explicitement, avec les IDs auth générés.
  await ins(
    'users (feedback)',
    admin.from('users').insert([
      { id: fbIds.authorA, email: EMAIL_FB_AUTHOR_A, full_name: 'FB Author A' },
      { id: fbIds.authorB, email: EMAIL_FB_AUTHOR_B, full_name: 'FB Author B' },
      { id: fbIds.staffA, email: EMAIL_STAFF_A, full_name: 'FB Staff A' },
      { id: fbIds.net, email: EMAIL_NET, full_name: 'FB Network' },
    ])
  )
  await ins(
    'memberships (feedback)',
    admin.from('memberships').insert([
      // Auteurs = simples membres de leur club respectif.
      {
        user_id: fbIds.authorA,
        club_id: CLUB_A,
        role: 'member',
        status: 'active',
        joined_at: '2021-01-01',
      },
      {
        user_id: fbIds.authorB,
        club_id: CLUB_B,
        role: 'member',
        status: 'active',
        joined_at: '2021-01-01',
      },
      // Trésorier du club A (staff per-club).
      {
        user_id: fbIds.staffA,
        club_id: CLUB_A,
        role: 'treasurer',
        status: 'active',
        joined_at: '2021-01-01',
      },
      // Membre réseau = simple membre du club B : il verra AUSSI le feedback du club A uniquement
      // grâce à son rôle réseau (pas à une adhésion club A).
      {
        user_id: fbIds.net,
        club_id: CLUB_B,
        role: 'member',
        status: 'active',
        joined_at: '2021-01-01',
      },
    ])
  )
  await ins(
    'network_members (feedback)',
    admin.from('network_members').insert({ user_id: fbIds.net, role: 'network_board' })
  )
  await ins(
    'feedback',
    admin.from('feedback').insert([
      {
        id: FB_A,
        user_id: fbIds.authorA,
        user_email: EMAIL_FB_AUTHOR_A,
        club_id: CLUB_A,
        type: 'bug',
        message: 'Bug club A',
        page_url: 'http://x/a',
        page_route: '/a',
        status: 'received',
      },
      {
        id: FB_B,
        user_id: fbIds.authorB,
        user_email: EMAIL_FB_AUTHOR_B,
        club_id: CLUB_B,
        type: 'bug',
        message: 'Bug club B',
        page_url: 'http://x/b',
        page_route: '/b',
        status: 'received',
      },
    ])
  )
}, 60_000)

afterAll(async () => {
  if (!HAS_DB) return
  const admin = createServiceRoleClient()
  // Feedback : club_id est ON DELETE SET NULL (pas cascade) → on supprime explicitement les lignes
  // avant de retirer clubs/users (sinon elles survivent, orphelines).
  await admin.from('feedback').delete().in('id', [FB_A, FB_B])
  // CASCADE : supprimer les clubs efface positions/transactions/contributions/cm/snapshots/
  // invitations ; supprimer les users efface memberships → attestation_sends + access_events.
  await admin.from('clubs').delete().in('id', [CLUB_A, CLUB_B])
  await admin.from('users').delete().in('id', [USER_A, USER_B])
  // Comptes auth créés pour les fixtures feedback (cascade public.users/memberships/network_members).
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of list?.users ?? []) {
    if (u.email && (FB_EMAILS as readonly string[]).includes(u.email)) {
      await admin.auth.admin.deleteUser(u.id)
    }
  }
})

// ─── Suite ────────────────────────────────────────────────────────────────────

describe.skipIf(!HAS_DB)('RLS — isolation cross-club (OPS-003)', () => {
  // Le membre A authentifié — RLS appliquée comme en prod.
  const asA = (): SupabaseClient<Database> => authedClientFor(USER_A)

  describe('helpers SECURITY DEFINER', () => {
    it('get_user_club_ids() ne renvoie QUE le club du membre', async () => {
      const { data, error } = await asA().rpc('get_user_club_ids')
      expect(error).toBeNull()
      const ids = (data ?? []) as unknown as string[]
      expect(ids).toContain(CLUB_A)
      expect(ids).not.toContain(CLUB_B)
    })

    it('get_user_role_in_club() renvoie le rôle dans SON club, NULL dans le club B', async () => {
      const own = await asA().rpc('get_user_role_in_club', { p_club_id: CLUB_A })
      expect(own.error).toBeNull()
      expect(own.data).toBe('member')

      const foreign = await asA().rpc('get_user_role_in_club', { p_club_id: CLUB_B })
      expect(foreign.error).toBeNull()
      expect(foreign.data).toBeNull()
    })

    // NET-018 — un club DÉSACTIVÉ (clubs.is_active = false) sort de get_user_club_ids() :
    // son membre ne le voit plus via la RLS (aucune donnée supprimée). Réactivé → réapparaît.
    it('club désactivé (is_active=false) sort de get_user_club_ids() ; réactivé → réapparaît', async () => {
      const admin = createServiceRoleClient()
      // 1. État initial : le club A est actif → présent.
      const before = await asA().rpc('get_user_club_ids')
      expect(before.error).toBeNull()
      expect((before.data ?? []) as unknown as string[]).toContain(CLUB_A)

      // 2. Désactivation (soft-disable via service role) → le membre A ne voit plus son club.
      const off = await admin.from('clubs').update({ is_active: false }).eq('id', CLUB_A)
      expect(off.error).toBeNull()
      try {
        const during = await asA().rpc('get_user_club_ids')
        expect(during.error).toBeNull()
        expect((during.data ?? []) as unknown as string[]).not.toContain(CLUB_A)

        // La RLS qui consomme le helper masque alors les positions du club désactivé.
        const positions = await asA().from('positions').select('id').eq('club_id', CLUB_A)
        expect(positions.error).toBeNull()
        expect(positions.data).toEqual([])
      } finally {
        // 3. Réactivation (toujours, même si une assertion échoue) → restauration à l'identique.
        const on = await admin.from('clubs').update({ is_active: true }).eq('id', CLUB_A)
        expect(on.error).toBeNull()
      }

      const after = await asA().rpc('get_user_club_ids')
      expect(after.error).toBeNull()
      expect((after.data ?? []) as unknown as string[]).toContain(CLUB_A)
    })
  })

  describe('clubs', () => {
    it('A lit son club A, jamais le club B', async () => {
      const own = await asA().from('clubs').select('id').eq('id', CLUB_A)
      expect(own.error).toBeNull()
      expect(own.data).toHaveLength(1)

      const foreign = await asA().from('clubs').select('id').eq('id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('A ne peut pas UPDATE le club B (0 ligne affectée)', async () => {
      const { data, error } = await asA()
        .from('clubs')
        .update({ name: 'PWNED' })
        .eq('id', CLUB_B)
        .select('id')
      expect(error).toBeNull()
      expect(data).toEqual([]) // RLS USING filtre → aucune ligne visible/modifiable
    })
  })

  describe('positions (lecture club-scopée, écriture service-role)', () => {
    it('A lit les positions de A, jamais de B', async () => {
      const own = await asA().from('positions').select('id').eq('club_id', CLUB_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBeGreaterThan(0)

      const foreign = await asA().from('positions').select('id').eq('club_id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('A ne peut pas INSERT une position dans le club B', async () => {
      const { error } = await asA().from('positions').insert({
        club_id: CLUB_B,
        name: 'Intrus',
        symbol: 'PWN-B',
        quantity: 1,
        synced_at: SYNCED,
      })
      // Aucune policy INSERT pour authenticated → violation RLS (42501).
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })
  })

  describe('transactions', () => {
    it('A lit les transactions de A, jamais de B', async () => {
      const own = await asA().from('transactions').select('id').eq('club_id', CLUB_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBeGreaterThan(0)

      const foreign = await asA().from('transactions').select('id').eq('club_id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('A ne peut pas INSERT une transaction dans le club B', async () => {
      const { error } = await asA().from('transactions').insert({
        club_id: CLUB_B,
        type: 'buy',
        transaction_date: '2025-01-01',
        synced_at: SYNCED,
      })
      expect(error?.code).toBe('42501')
    })
  })

  describe('contributions (donnée nominative)', () => {
    it('A lit SA contribution (club A), jamais celle du membre B', async () => {
      const own = await asA().from('contributions').select('id').eq('club_id', CLUB_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBeGreaterThan(0)

      const foreign = await asA().from('contributions').select('id').eq('club_id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('A ne peut pas DELETE la contribution du membre B', async () => {
      const { data, error } = await asA()
        .from('contributions')
        .delete()
        .eq('membership_id', MEM_B)
        .select('id')
      expect(error).toBeNull()
      expect(data).toEqual([]) // invisible → rien à supprimer
    })
  })

  describe('contribution_months', () => {
    it('A lit ses mois (club A), jamais ceux du membre B', async () => {
      const own = await asA().from('contribution_months').select('id').eq('club_id', CLUB_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBeGreaterThan(0)

      const foreign = await asA().from('contribution_months').select('id').eq('club_id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })
  })

  describe('sheet_snapshots (staff-only)', () => {
    it('un membre simple ne voit AUCUN snapshot (ni A ni B)', async () => {
      // Réservé treasurer+ : même son propre club est invisible pour un member.
      const own = await asA().from('sheet_snapshots').select('id').eq('club_id', CLUB_A)
      expect(own.error).toBeNull()
      expect(own.data).toEqual([])

      const foreign = await asA().from('sheet_snapshots').select('id').eq('club_id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })
  })

  describe('attestation_sends (lecture par membre)', () => {
    it('A lit ses envois (membership A), jamais ceux du membership B', async () => {
      const own = await asA().from('attestation_sends').select('id').eq('membership_id', MEM_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBeGreaterThan(0)

      const foreign = await asA().from('attestation_sends').select('id').eq('membership_id', MEM_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })
  })

  describe('record_attestation_ref (RT-03 — RPC SECURITY DEFINER scopée auth.uid())', () => {
    // Réf déterministe (REC-AAAAMM-XXXX) de la période seedée pour le membre A.
    const PERIOD = '2024-12'
    const REF_A = 'REC-202412-RLSA'
    const REF_INTRUS = 'REC-202412-PWND'

    it('A persiste la référence de SA membership (mise à jour de SA ligne)', async () => {
      const { error } = await asA().rpc('record_attestation_ref', {
        p_membership_id: MEM_A,
        p_period: PERIOD,
        p_reference: REF_A,
      })
      expect(error).toBeNull()

      // Contrôle service-role : la référence a bien été écrite sur la ligne (MEM_A, 2024-12).
      const admin = createServiceRoleClient()
      const { data } = await admin
        .from('attestation_sends')
        .select('reference')
        .eq('membership_id', MEM_A)
        .eq('period', PERIOD)
        .maybeSingle<{ reference: string | null }>()
      expect(data?.reference).toBe(REF_A)
    })

    it('A ne peut PAS persister la référence de la membership B (refus + 0 écriture)', async () => {
      const { error } = await asA().rpc('record_attestation_ref', {
        p_membership_id: MEM_B,
        p_period: PERIOD,
        p_reference: REF_INTRUS,
      })
      // La RPC lève une exception (ERRCODE 42501) : membership n'appartenant pas à auth.uid().
      expect(error).not.toBeNull()

      // Contrôle service-role : la ligne du membre B n'a JAMAIS reçu la référence intruse.
      const admin = createServiceRoleClient()
      const { data } = await admin
        .from('attestation_sends')
        .select('reference')
        .eq('membership_id', MEM_B)
        .eq('period', PERIOD)
        .maybeSingle<{ reference: string | null }>()
      expect(data?.reference ?? null).not.toBe(REF_INTRUS)
    })
  })

  describe('invitations (staff-only)', () => {
    it('un membre simple ne voit AUCUNE invitation (ni A ni B)', async () => {
      const own = await asA().from('invitations').select('id').eq('club_id', CLUB_A)
      expect(own.error).toBeNull()
      expect(own.data).toEqual([])

      const foreign = await asA().from('invitations').select('id').eq('club_id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })
  })

  describe('member_access_events (staff-only)', () => {
    it('un membre simple ne voit AUCUN événement d’accès (ni A ni B)', async () => {
      const own = await asA().from('member_access_events').select('id').eq('membership_id', MEM_A)
      expect(own.error).toBeNull()
      expect(own.data).toEqual([])

      const foreign = await asA()
        .from('member_access_events')
        .select('id')
        .eq('membership_id', MEM_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })
  })

  describe('users / memberships (annuaire intra-club)', () => {
    it('A voit le profil du membre A, jamais celui du membre B (clubs disjoints)', async () => {
      const own = await asA().from('users').select('id').eq('id', USER_A)
      expect(own.error).toBeNull()
      expect(own.data).toHaveLength(1)

      const foreign = await asA().from('users').select('id').eq('id', USER_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('A voit les memberships du club A, jamais ceux du club B', async () => {
      const own = await asA().from('memberships').select('id').eq('club_id', CLUB_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBeGreaterThan(0)

      const foreign = await asA().from('memberships').select('id').eq('club_id', CLUB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('A ne peut pas UPDATE le membership du membre B (escalade de rôle bloquée)', async () => {
      const { data, error } = await asA()
        .from('memberships')
        .update({ role: 'president' })
        .eq('id', MEM_B)
        .select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
    })
  })

  describe('contrôle — le service role bypasse la RLS', () => {
    it('voit les deux clubs et toutes les positions', async () => {
      const admin = createServiceRoleClient()
      const clubs = await admin.from('clubs').select('id').in('id', [CLUB_A, CLUB_B])
      expect(clubs.error).toBeNull()
      expect(clubs.data).toHaveLength(2)

      const positions = await admin
        .from('positions')
        .select('club_id')
        .in('club_id', [CLUB_A, CLUB_B])
      expect(positions.error).toBeNull()
      const clubIds = new Set((positions.data ?? []).map((p) => p.club_id))
      expect(clubIds.has(CLUB_A)).toBe(true)
      expect(clubIds.has(CLUB_B)).toBe(true)
    })
  })

  // ─── NET-019 — feedback : RLS resserrée (migration 051) ──────────────────────
  // Acteurs créés en beforeAll : auteur A (club A), auteur B (club B), trésorier A (staff club A),
  // membre réseau (network_board, simple membre du club B). On lit feedback sous chaque session.
  describe('feedback (NET-019 — réseau/club/self read)', () => {
    const onlyIds = (data: { id: string }[] | null) => new Set((data ?? []).map((r) => r.id))

    it('le membre réseau lit TOUS les feedbacks (cross-club)', async () => {
      const net = authedClientFor(fbIds.net)
      const { data, error } = await net.from('feedback').select('id').in('id', [FB_A, FB_B])
      expect(error).toBeNull()
      const ids = onlyIds(data)
      expect(ids.has(FB_A)).toBe(true)
      expect(ids.has(FB_B)).toBe(true)
    })

    it('le staff du club A lit le feedback de A, JAMAIS celui de B', async () => {
      const staff = authedClientFor(fbIds.staffA)
      const own = await staff.from('feedback').select('id').eq('id', FB_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBe(1)

      const foreign = await staff.from('feedback').select('id').eq('id', FB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('un membre simple ne lit QUE ses propres feedbacks (pas ceux des autres)', async () => {
      // L'auteur A est simple membre : il voit SON feedback (self read), pas celui de B.
      const author = authedClientFor(fbIds.authorA)
      const own = await author.from('feedback').select('id').eq('id', FB_A)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBe(1)

      const foreign = await author.from('feedback').select('id').eq('id', FB_B)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('un membre simple d’un autre club ne lit pas un feedback dont il n’est pas l’auteur', async () => {
      // L'auteur B (simple membre club B, non staff, non réseau) ne voit pas FB_A.
      const author = authedClientFor(fbIds.authorB)
      const foreign = await author.from('feedback').select('id').eq('id', FB_A)
      expect(foreign.error).toBeNull()
      expect(foreign.data).toEqual([])
    })

    it('le membre réseau peut UPDATE le statut (received → in_progress)', async () => {
      const net = authedClientFor(fbIds.net)
      const { data, error } = await net
        .from('feedback')
        .update({ status: 'in_progress' })
        .eq('id', FB_A)
        .select('id, status')
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0]?.status).toBe('in_progress')
    })

    // ADM-009 (migration 054) — le staff d'un club PEUT désormais changer le statut des feedbacks
    // de SON club, mais JAMAIS ceux d'un autre club (isolation staff club A ≠ club B).
    it('le staff du club A PEUT UPDATE le statut d’un feedback de SON club (A)', async () => {
      const staff = authedClientFor(fbIds.staffA)
      const { data, error } = await staff
        .from('feedback')
        .update({ status: 'done' })
        .eq('id', FB_A)
        .select('id, status')
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0]?.status).toBe('done')
    })

    it('le staff du club A ne peut PAS UPDATE le statut d’un feedback du club B (0 ligne)', async () => {
      // Lecture service-role du statut avant tentative (pour prouver l'absence d'écriture).
      const admin = createServiceRoleClient()
      const before = await admin
        .from('feedback')
        .select('status')
        .eq('id', FB_B)
        .maybeSingle<{ status: string }>()

      const staff = authedClientFor(fbIds.staffA)
      const { data, error } = await staff
        .from('feedback')
        .update({ status: 'closed' })
        .eq('id', FB_B)
        .select('id')
      // RLS « club staff update » : club_id (B) ∉ get_user_club_ids() du staff A → USING false → 0 ligne.
      expect(error).toBeNull()
      expect(data).toEqual([])

      // Contrôle service-role : le statut du feedback B est resté INCHANGÉ (jamais passé à 'closed').
      const after = await admin
        .from('feedback')
        .select('status')
        .eq('id', FB_B)
        .maybeSingle<{ status: string }>()
      expect(after.data?.status).toBe(before.data?.status)
      expect(after.data?.status).not.toBe('closed')
    })
  })
})
