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
  await admin.from('clubs').delete().in('id', [CLUB_A, CLUB_B])
  await admin.from('users').delete().in('id', [USER_A, USER_B])

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
}, 60_000)

afterAll(async () => {
  if (!HAS_DB) return
  const admin = createServiceRoleClient()
  // CASCADE : supprimer les clubs efface positions/transactions/contributions/cm/snapshots/
  // invitations ; supprimer les users efface memberships → attestation_sends + access_events.
  await admin.from('clubs').delete().in('id', [CLUB_A, CLUB_B])
  await admin.from('users').delete().in('id', [USER_A, USER_B])
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
})
