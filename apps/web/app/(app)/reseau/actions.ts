'use server'

// Server Actions du scope RÉSEAU (NET-003). Toutes appellent les RPC SECURITY DEFINER d'écriture
// (migration 042) via le client serveur (session + cookies) : c'est le RPC qui vérifie l'autorité
// `network_admin` (helper is_network_admin() fail-closed) AVANT d'écrire, et qui journalise
// l'événement dans network_events. JAMAIS de service-role ici — tout passe par la RLS de la session.
//
// On valide aussi côté serveur (Zod / contexte réseau) avant l'appel : une entrée invalide ou un
// caller non membre réseau → erreur métier stable, sans toucher la DB. Le contrôle d'autorité réel
// reste la garde de la RPC (défense en profondeur).
//
// Réf : apps/web/app/(app)/admin/actions.ts (modèle), lib/data/network.ts (resolveNetworkContext),
// migration 042 (RPC + audit), CLAUDE.md (RLS, jamais service-role côté app).

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient, type Database } from '@evolve/data'
import { resolveNetworkContext } from '@/lib/data/network'
import { buildUpdateArgs, validateInput, type ClubSettingsInput } from '@/lib/data/clubSettings'
import { captureActionError } from '@/lib/monitoring/sentry'

type NetworkRole = Database['public']['Enums']['network_role']
type NetworkTitle = Database['public']['Enums']['network_title']
type StaffRole = Extract<Database['public']['Enums']['member_role'], 'president' | 'treasurer'>

/** Résultat sans payload (sheet/provision/grant/revoke). */
export type NetworkActionResult = { ok: true } | { ok: false; error: string }
/** Résultat de création de club : renvoie l'id du club créé. */
export type CreateClubResult = { ok: true; clubId: string } | { ok: false; error: string }

/**
 * Issue du dry-run `sheet-probe` (NET-004), normalisée pour l'UI (NET-006). `status` pilote les
 * 3 états visuels de SheetConnectionTest (success / not_shared / structure / invalid / error).
 */
export type ProbeStatus = 'success' | 'not_shared' | 'structure' | 'invalid' | 'error'
export type ProbeResult =
  | { status: 'success'; preview: { members: number; positions: number; tabsFound: number } }
  | { status: 'structure'; missingTabs: string[] }
  | { status: 'not_shared' }
  | { status: 'invalid' }
  | { status: 'error'; detail?: string }

/** Résultat de la sync initiale (étape 3) : compte importé + warnings molles. */
export type InitialSyncResult =
  | { ok: true; members: number; warnings: string[] }
  | { ok: false; error: string; warnings?: string[] }

/** Membre importé d'un club (étape 3 — désigner le premier responsable). */
export interface ClubMemberOption {
  userId: string
  fullName: string
  email: string
}
export type ClubMembersResult =
  | { ok: true; members: ClubMemberOption[] }
  | { ok: false; error: string }

// ── Seam de mock e2e ────────────────────────────────────────────────────────
// Les vraies invocations Edge (sheet-probe → Google, sync → Google + écriture DB) sont
// IMPOSSIBLES à jouer en e2e local sans matrice Google réelle. Derrière le SEUL flag
// `E2E_NETWORK_MOCKS=1` (jamais posé en prod), `probeSheet` / `triggerInitialSync` renvoient des
// réponses canoniques DÉTERMINISTES dérivées du sheet_id saisi :
//   - sheet_id contenant 'notshared'  → ProbeResult not_shared
//   - sheet_id contenant 'missingtab' → ProbeResult structure (missingTabs:[POSITIONS])
//   - sinon                           → success { members:18, positions:24, tabsFound:6 }
// Garde-fou : le mock n'est JAMAIS sur le chemin de prod (lu uniquement quand le flag vaut '1').
function e2eMocksEnabled(): boolean {
  return process.env['E2E_NETWORK_MOCKS'] === '1'
}

async function serverClient() {
  return createServerClient(await cookies())
}

/** Codes Postgres → erreurs métier stables (consommées par l'UI pour un message i18n). */
function mapPgError(code: string | undefined): string {
  if (code === '23505') return 'duplicate' // unique_violation : slug déjà utilisé
  if (code === '42501') return 'forbidden' // insufficient_privilege : RAISE « network_admin requis »
  if (code === '22023') return 'invalid' // invalid_parameter_value : nom/slug/pays/devise invalide
  if (code === '23514') return 'invalid' // check_violation : rôle non-staff / dernier admin
  if (code === 'P0002') return 'not_found' // no_data_found : club / utilisateur introuvable
  return 'unknown'
}

/** Capture une erreur Supabase inattendue (code PG non mappé → 'unknown'). */
function captureIfUnknown(
  error: { code?: string; message?: string } | null | undefined,
  action: string,
  userId?: string
): void {
  if (!error) return
  if (mapPgError(error.code) !== 'unknown') return
  captureActionError(error, { action, userId, extra: { code: error.code, message: error.message } })
}

/**
 * Authentifie le caller ET vérifie qu'il appartient à l'équipe réseau (network_admin / board).
 * Renvoie l'userId si OK, sinon une erreur métier stable. La garde d'autorité fine (admin requis
 * pour les writes) reste dans la RPC ; ce pré-check évite un aller-retour DB pour un non-membre.
 */
async function requireNetworkMember(
  supabase: Awaited<ReturnType<typeof serverClient>>
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveNetworkContext(supabase, user.id)
  if (!ctx) return { ok: false, error: 'forbidden' }
  return { ok: true, userId: user.id }
}

/**
 * Variante stricte de {@link requireNetworkMember} : exige le rôle `network_admin`.
 * À utiliser pour les actions dont l'autorité fine n'est PAS portée par une RPC/Edge
 * gardée (ex. `triggerInitialSync` : l'Edge `sync` tourne en service-role sans garde
 * caller → le pré-check admin doit vivre ici, comme les writes réservés network_admin).
 */
async function requireNetworkAdmin(
  supabase: Awaited<ReturnType<typeof serverClient>>
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveNetworkContext(supabase, user.id)
  if (!ctx || ctx.role !== 'network_admin') return { ok: false, error: 'forbidden' }
  return { ok: true, userId: user.id }
}

// ── Schémas d'entrée ──────────────────────────────────────────────────────────
// Forme UUID 8-4-4-4-12 (toute version). On NE force PAS la version v4 de `z.string().uuid()` :
// l'identité réelle d'un club est portée par la DB (la RPC vérifie l'existence + l'autorité), et
// on veut accepter tout UUID syntaxiquement valide (fixtures incluses). Garde de format seulement.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
function isUuidLike(value: string): boolean {
  return UUID_RE.test(value)
}

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug')
const iso2Schema = z
  .string()
  .trim()
  .length(2)
  .regex(/^[A-Za-z]{2}$/)
const iso3Schema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/)

const createClubSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  city: z.string().trim().max(120).optional(),
  country: iso2Schema.optional(),
  currency: iso3Schema.optional(),
  minContribution: z.number().nonnegative().optional(),
})
export type CreateClubInput = z.infer<typeof createClubSchema>

/**
 * Créer un club (network_admin uniquement). Le slug dupliqué remonte en erreur `duplicate`.
 * Renvoie l'id du club créé pour enchaîner sur le branchement de la matrice / le provisioning.
 */
export async function createClubAction(rawInput: CreateClubInput): Promise<CreateClubResult> {
  const parsed = createClubSchema.safeParse(rawInput)
  if (!parsed.success) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const { name, slug, city, country, currency, minContribution } = parsed.data
  const { data, error } = await supabase.rpc('network_create_club', {
    p_name: name,
    p_slug: slug,
    p_city: city,
    p_country: country,
    p_currency: currency,
    p_min_contribution: minContribution,
  })
  if (error) {
    captureIfUnknown(error, 'createClub', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  revalidatePath('/reseau')
  return { ok: true, clubId: data }
}

/**
 * Brancher / mettre à jour la matrice Google Sheets d'un club (network_admin). Une chaîne vide
 * débranche la matrice (sheet_id → NULL côté RPC).
 */
export async function setClubSheetAction(
  clubId: string,
  sheetId: string
): Promise<NetworkActionResult> {
  if (!isUuidLike(clubId)) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const { error } = await supabase.rpc('network_set_club_sheet', {
    p_club_id: clubId,
    p_sheet_id: sheetId.trim(),
  })
  if (error) {
    captureIfUnknown(error, 'setClubSheet', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  revalidatePath('/reseau')
  return { ok: true }
}

/**
 * Provisionner le premier staff d'un club (network_admin) par user_id — voie « membre importé ».
 * Le rôle est restreint à president / treasurer (la RPC refuse les autres en check_violation).
 * La voie INVITATION PAR EMAIL est différée (NET-006, réutilisera l'invitation existante).
 */
export async function provisionFirstStaffAction(
  clubId: string,
  userId: string,
  role: StaffRole
): Promise<NetworkActionResult> {
  if (!isUuidLike(clubId)) return { ok: false, error: 'invalid' }
  if (!isUuidLike(userId)) return { ok: false, error: 'invalid' }
  if (role !== 'president' && role !== 'treasurer') return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const { error } = await supabase.rpc('network_provision_first_staff', {
    p_club_id: clubId,
    p_user_id: userId,
    p_role: role,
  })
  if (error) {
    captureIfUnknown(error, 'provisionFirstStaff', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  revalidatePath('/reseau')
  return { ok: true }
}

/**
 * Attribuer / mettre à jour un rôle réseau (network_admin) : upsert d'une ligne network_members
 * (rôle + titre optionnel). Idempotent côté RPC (ON CONFLICT (user_id)).
 */
export async function grantNetworkRoleAction(
  userId: string,
  role: NetworkRole,
  title: NetworkTitle | null = null
): Promise<NetworkActionResult> {
  if (!isUuidLike(userId)) return { ok: false, error: 'invalid' }
  if (role !== 'network_admin' && role !== 'network_board') return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const { error } = await supabase.rpc('network_grant_role', {
    p_user_id: userId,
    p_role: role,
    p_title: title ?? undefined,
  })
  if (error) {
    captureIfUnknown(error, 'grantNetworkRole', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  revalidatePath('/reseau')
  return { ok: true }
}

/**
 * Retirer un membre de l'équipe réseau (network_admin). Idempotent (no-op si déjà absent).
 * Le garde-fou « dernier administrateur réseau » est dans la RPC : retirer le dernier admin
 * remonte en erreur `invalid` (check_violation) plutôt que de verrouiller le réseau.
 */
export async function revokeNetworkRoleAction(userId: string): Promise<NetworkActionResult> {
  if (!isUuidLike(userId)) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const { error } = await supabase.rpc('network_revoke_role', { p_user_id: userId })
  if (error) {
    captureIfUnknown(error, 'revokeNetworkRole', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  revalidatePath('/reseau')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// NET-007 — Fiche club : historique des syncs + édition des paramètres (réseau).
// ─────────────────────────────────────────────────────────────────────────────

/** Une passe de synchronisation, normalisée pour l'historique de la fiche club. */
export interface SheetSnapshotEntry {
  /** Horodatage ISO de la sync. */
  syncedAt: string
  /** Total des lignes importées (somme des feuilles de la passe). */
  totalRows: number
  /** Pire statut de la passe (failed > partial > success). */
  status: 'success' | 'partial' | 'failed'
  /** Nombre de feuilles importées dans la passe. */
  sheetsCount: number
  /** 1er message d'erreur non vide de la passe (détail affichable), si présent. */
  firstError: string | null
}
export type SheetSnapshotsResult =
  | { ok: true; snapshots: SheetSnapshotEntry[] }
  | { ok: false; error: string }

/**
 * Historique des synchronisations d'un club (fiche club, NET-007). Passe par le RPC SECURITY
 * DEFINER `network_list_sheet_snapshots` gardé `is_network_admin` (migration 045) : la RLS per-club
 * de `sheet_snapshots` (migration 011) n'exposerait rien à un network_admin non-membre. LECTURE
 * SEULE. JAMAIS de service-role : garde dans le RPC + pré-check réseau.
 */
export async function listSheetSnapshots(
  clubId: string,
  limit = 10
): Promise<SheetSnapshotsResult> {
  if (!isUuidLike(clubId)) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const { data, error } = await supabase.rpc('network_list_sheet_snapshots', {
    p_club_id: clubId,
    p_limit: limit,
  })
  if (error) {
    captureIfUnknown(error, 'listSheetSnapshots', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  type Row = Database['public']['Functions']['network_list_sheet_snapshots']['Returns'][number]
  const snapshots: SheetSnapshotEntry[] = ((data ?? []) as Row[]).map((s) => ({
    syncedAt: s.synced_at,
    totalRows: Number(s.total_rows ?? 0),
    status: s.status,
    sheetsCount: Number(s.sheets_count ?? 0),
    // `first_error` est typé non-null par types.gen.ts mais le RPC peut renvoyer NULL.
    firstError: (s.first_error as string | null) ?? null,
  }))
  return { ok: true, snapshots }
}

/**
 * Édite les paramètres d'un club (fiche club, NET-007). Passe par le RPC SECURITY DEFINER
 * `network_update_club_settings` gardé `is_network_admin` (migration 045) — et NON
 * `update_club_settings` (gardé is_club_staff, inaccessible à un network_admin non-membre).
 * Validation pure réutilisée de `lib/data/clubSettings` (mêmes règles que la voie staff).
 * JAMAIS de service-role : garde dans le RPC + pré-check réseau.
 */
export async function updateNetworkClubSettings(
  clubId: string,
  input: ClubSettingsInput
): Promise<NetworkActionResult> {
  if (!isUuidLike(clubId)) return { ok: false, error: 'invalid' }
  if (validateInput(input).length > 0) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const args = buildUpdateArgs(clubId, input)
  const { error } = await supabase.rpc('network_update_club_settings', {
    p_club_id: args.p_club_id,
    p_name: args.p_name,
    p_city: args.p_city ?? undefined,
    p_country: args.p_country ?? undefined,
    p_broker_account_ref: args.p_broker_account_ref ?? undefined,
    p_annual_investment_cap: args.p_annual_investment_cap ?? undefined,
    p_min_contribution: args.p_min_contribution ?? undefined,
  })
  if (error) {
    captureIfUnknown(error, 'updateNetworkClubSettings', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  revalidatePath('/reseau')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// NET-006 — Assistant « Ajouter un club » : dry-run matrice, sync initiale, listing membres.
// ─────────────────────────────────────────────────────────────────────────────

/** Forme brute de la réponse `sheet-probe` (NET-004). On lit défensivement (Edge non typée). */
interface SheetProbeBody {
  ok?: boolean
  foundTabs?: unknown
  missingTabs?: unknown
  preview?: { members?: unknown; positions?: unknown }
  error?: unknown
}

/** Lit le corps JSON d'une réponse d'erreur d'Edge (functions.invoke met la Response dans context). */
async function readErrorBody(error: unknown): Promise<SheetProbeBody | null> {
  const ctx = (error as { context?: unknown })?.context
  if (ctx instanceof Response) {
    try {
      return (await ctx.clone().json()) as SheetProbeBody
    } catch {
      return null
    }
  }
  return null
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** Mappe un corps `sheet-probe` (succès 200 ou erreur) vers un `ProbeResult` normalisé. */
function mapProbeBody(body: SheetProbeBody | null, httpError: boolean): ProbeResult {
  if (!body) return { status: 'error' }
  const errCode = typeof body.error === 'string' ? body.error : null
  if (errCode === 'not_shared') return { status: 'not_shared' }
  if (errCode === 'invalid_id') return { status: 'invalid' }
  if (errCode === 'forbidden') return { status: 'error', detail: 'forbidden' }
  if (errCode) return { status: 'error', detail: errCode }
  // 200 : ok=true → succès ; ok=false → structure (onglets bloquants manquants).
  if (body.ok === true) {
    return {
      status: 'success',
      preview: {
        members: num(body.preview?.members),
        positions: num(body.preview?.positions),
        tabsFound: strArray(body.foundTabs).length,
      },
    }
  }
  const missing = strArray(body.missingTabs)
  if (missing.length > 0) return { status: 'structure', missingTabs: missing }
  return { status: 'error', detail: httpError ? 'http' : undefined }
}

/**
 * Dry-run de validation d'une matrice Google Sheets (NET-006, étape 2). Invoque l'Edge
 * `sheet-probe` AVEC LE CLIENT DE SESSION : le JWT du caller est forwardé automatiquement, et la
 * garde `network_admin` est portée CÔTÉ EDGE (is_network_admin sur un client porté par ce JWT).
 * Lecture seule — aucune écriture DB ni Sheets. Le pré-check `requireNetworkMember` évite un
 * aller-retour Edge pour un non-membre réseau (défense en profondeur, jamais l'autorité finale).
 *
 * `sheet_id` accepte une URL Google Sheets OU un ID brut (l'Edge ré-extrait défensivement).
 */
export async function probeSheet(sheetId: string): Promise<ProbeResult> {
  const trimmed = sheetId.trim()
  if (trimmed === '') return { status: 'invalid' }

  // Seam e2e : réponses déterministes selon le sheet_id, jamais sur le chemin de prod.
  if (e2eMocksEnabled()) {
    if (trimmed.includes('notshared')) return { status: 'not_shared' }
    if (trimmed.includes('missingtab')) return { status: 'structure', missingTabs: ['POSITIONS'] }
    return { status: 'success', preview: { members: 18, positions: 24, tabsFound: 6 } }
  }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return { status: 'error', detail: auth.error }

  const { data, error } = await supabase.functions.invoke<SheetProbeBody>('sheet-probe', {
    body: { sheet_id: trimmed },
  })
  if (error) {
    // Erreur HTTP (403 not_shared / 400-404 invalid_id / 403 forbidden) : le corps est dans context.
    const body = await readErrorBody(error)
    if (!body) {
      captureActionError(error, { action: 'probeSheet', userId: auth.userId })
      return { status: 'error', detail: error.message }
    }
    return mapProbeBody(body, true)
  }
  return mapProbeBody(data ?? null, false)
}

/**
 * Déclenche la sync initiale d'un club fraîchement branché (NET-006, étape 3). Invoque l'Edge
 * `sync` (qui utilise le SERVICE_ROLE en interne pour écrire, bypass RLS) avec le client de
 * session ; la garde d'autorité réseau est portée ICI (`requireNetworkMember`) — on NE passe PAS
 * par /api/sync car son contrôle `get_user_role_in_club` (trésorier per-club) bloquerait un
 * network_admin qui n'a pas encore de membership dans ce club neuf.
 *
 * `sync` répond TOUJOURS 200 : on lit `success` + `errors[]` + `warnings[]` dans le corps. On
 * relit ensuite le nombre de membres importés (memberships actifs du club) pour le SyncBanner.
 */
export async function triggerInitialSync(clubId: string): Promise<InitialSyncResult> {
  if (!isUuidLike(clubId)) return { ok: false, error: 'invalid' }

  // Seam e2e : sync mockée déterministe (18 membres importés), jamais sur le chemin de prod.
  if (e2eMocksEnabled()) {
    return { ok: true, members: 18, warnings: [] }
  }

  const supabase = await serverClient()
  // network_admin REQUIS : l'Edge `sync` tourne en service-role sans garde caller, donc
  // c'est le seul rempart. On n'autorise pas un network_board à déclencher une sync arbitraire.
  const auth = await requireNetworkAdmin(supabase)
  if (!auth.ok) return { ok: false, error: auth.error }

  const { data, error } = await supabase.functions.invoke<{
    success?: boolean
    errors?: unknown
    warnings?: unknown
  }>('sync', { body: { club_id: clubId } })
  if (error) {
    captureActionError(error, { action: 'triggerInitialSync', userId: auth.userId })
    return { ok: false, error: 'sync_failed' }
  }
  const errors = strArray(data?.errors)
  const warnings = strArray(data?.warnings)
  if (data?.success !== true || errors.length > 0) {
    return { ok: false, error: 'sync_failed', warnings }
  }

  // Nombre de membres importés via le RPC gardé (network_admin lit les membres d'un club arbitraire).
  const { data: members, error: listError } = await supabase.rpc('network_list_club_members', {
    p_club_id: clubId,
  })
  const count = listError ? 0 : (members ?? []).length
  revalidatePath('/reseau')
  return { ok: true, members: count, warnings }
}

/**
 * Liste les membres importés d'un club (NET-006, étape 3 — select du premier responsable). Passe
 * par le RPC SECURITY DEFINER `network_list_club_members` gardé `is_network_admin` (migration 044) :
 * un network_admin qui vient de créer un club n'en est PAS membre, la RLS per-club ne lui exposerait
 * donc aucun membre. JAMAIS de service-role : la garde est dans le RPC + le pré-check réseau.
 */
export async function listClubMembers(clubId: string): Promise<ClubMembersResult> {
  if (!isUuidLike(clubId)) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkMember(supabase)
  if (!auth.ok) return auth

  const { data, error } = await supabase.rpc('network_list_club_members', { p_club_id: clubId })
  if (error) {
    captureIfUnknown(error, 'listClubMembers', auth.userId)
    return { ok: false, error: mapPgError(error.code) }
  }
  type MemberRow = Database['public']['Functions']['network_list_club_members']['Returns'][number]
  const members: ClubMemberOption[] = ((data ?? []) as MemberRow[]).map((m) => ({
    userId: m.user_id,
    fullName: m.full_name,
    email: m.email,
  }))
  return { ok: true, members }
}

/**
 * Dérive l'email du Service Account Google à partager en lecture (encart de l'étape 2). L'email
 * du SA n'est PAS un secret (il est destiné à être partagé avec le propriétaire de la feuille) :
 *   1. `GOOGLE_SA_EMAIL` — variable d'affichage dédiée (recommandée côté app).
 *   2. sinon, on décode `client_email` depuis `GOOGLE_SA_KEY_BASE64` (même source que l'Edge).
 * `null` si rien n'est configuré → l'UI affiche « — » et désactive le bouton « Copier ».
 */
function deriveServiceAccountEmail(): string | null {
  const direct = process.env['GOOGLE_SA_EMAIL']
  if (direct && direct.trim() !== '') return direct.trim()
  const raw = process.env['GOOGLE_SA_KEY_BASE64']
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
      client_email?: unknown
    }
    return typeof parsed.client_email === 'string' ? parsed.client_email : null
  } catch {
    return null
  }
}

/**
 * Renvoie l'email du Service Account Google à partager en lecture (affiché dans l'encart de
 * l'étape 2). Server-only ; `null` si non configuré → l'UI affiche un fallback « — ».
 */
export async function getServiceAccountEmail(): Promise<string | null> {
  return deriveServiceAccountEmail()
}
