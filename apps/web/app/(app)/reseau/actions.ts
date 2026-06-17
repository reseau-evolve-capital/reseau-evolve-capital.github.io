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
import { captureActionError } from '@/lib/monitoring/sentry'

type NetworkRole = Database['public']['Enums']['network_role']
type NetworkTitle = Database['public']['Enums']['network_title']
type StaffRole = Extract<Database['public']['Enums']['member_role'], 'president' | 'treasurer'>

/** Résultat sans payload (sheet/provision/grant/revoke). */
export type NetworkActionResult = { ok: true } | { ok: false; error: string }
/** Résultat de création de club : renvoie l'id du club créé. */
export type CreateClubResult = { ok: true; clubId: string } | { ok: false; error: string }

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

// ── Schémas d'entrée ──────────────────────────────────────────────────────────
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
  if (!z.string().uuid().safeParse(clubId).success) return { ok: false, error: 'invalid' }

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
  if (!z.string().uuid().safeParse(clubId).success) return { ok: false, error: 'invalid' }
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: 'invalid' }
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
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: 'invalid' }
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
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: 'invalid' }

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
