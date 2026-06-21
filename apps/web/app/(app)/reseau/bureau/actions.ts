'use server'

// Server Actions de l'écran « Bureau du réseau » (NET-020) : attribution / retrait d'un rôle
// RÉSEAU. Toutes appellent les RPC SECURITY DEFINER d'écriture (migration 042) via le client de
// session : c'est la RPC qui vérifie l'autorité `network_admin` (is_network_admin() fail-closed)
// AVANT d'écrire, et qui porte le garde-fou « dernier admin » (network_revoke_role). On revalide
// aussi le rôle côté serveur (pré-check) pour éviter un aller-retour DB inutile à un non-admin.
// JAMAIS de service-role ici — tout passe par la RLS / les gardes RPC de la session.
//
// On NE touche PAS reseau/actions.ts (fichier partagé) : ces actions vivent ici et sont enveloppées
// par `withAudit` (OPS-007) pour journaliser grant/revoke dans audit_log (fire-and-forget, ne fait
// jamais échouer la mutation).
//
// Réf : migration 042 (network_grant_role / network_revoke_role + garde-fou dernier admin),
//   migration 055 (RPC de lecture du bureau), lib/actions/withAudit.ts, reseau/actions.ts (modèle
//   mapPgError + requireNetworkAdmin), CLAUDE.md (RLS, jamais service-role, TS strict zéro any).

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient, type Database } from '@evolve/data'
import { resolveNetworkContext } from '@/lib/data/network'
import { captureActionError } from '@/lib/monitoring/sentry'
import { withAudit } from '@/lib/actions/withAudit'

type NetworkRole = Database['public']['Enums']['network_role']
type NetworkTitle = Database['public']['Enums']['network_title']

/** Résultat discriminé sans payload. `error` est une clé métier stable (mappée i18n côté UI). */
export type BureauActionResult = { ok: true } | { ok: false; error: string }

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
function isUuidLike(value: string): boolean {
  return UUID_RE.test(value)
}

const NETWORK_ROLES: readonly NetworkRole[] = ['network_admin', 'network_board']
const NETWORK_TITLES: readonly NetworkTitle[] = [
  'president',
  'vice_president',
  'treasurer',
  'secretary',
]
function isNetworkRole(v: unknown): v is NetworkRole {
  return typeof v === 'string' && (NETWORK_ROLES as readonly string[]).includes(v)
}
function isNetworkTitle(v: unknown): v is NetworkTitle {
  return typeof v === 'string' && (NETWORK_TITLES as readonly string[]).includes(v)
}

async function serverClient() {
  return createServerClient(await cookies())
}

/**
 * Codes Postgres → clés métier stables. Aligné sur reseau/actions.ts. `last_admin` distingue le
 * garde-fou « dernier administrateur réseau » des autres check_violation pour un message dédié.
 */
function mapPgError(code: string | undefined, message: string | undefined): string {
  if (code === '42501') return 'forbidden' // insufficient_privilege : RAISE « network_admin requis »
  if (code === '23514') {
    // check_violation : peut être le garde-fou « dernier admin » → message dédié si reconnu.
    if (message && /dernier administrateur/i.test(message)) return 'last_admin'
    return 'invalid'
  }
  if (code === 'P0002') return 'not_found' // no_data_found : utilisateur introuvable
  if (code === '22023') return 'invalid' // invalid_parameter_value
  return 'unknown'
}

function captureIfUnknown(
  error: { code?: string; message?: string } | null | undefined,
  action: string,
  userId?: string
): void {
  if (!error) return
  if (mapPgError(error.code, error.message) !== 'unknown') return
  captureActionError(error, { action, userId, extra: { code: error.code, message: error.message } })
}

/** Authentifie le caller ET exige le rôle `network_admin` (les writes du bureau y sont réservés). */
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

/**
 * Attribue / met à jour un rôle réseau (network_admin uniquement). Upsert idempotent côté RPC
 * (ON CONFLICT (user_id)). Le titre est optionnel.
 */
async function _grantBoardRoleAction(
  userId: string,
  role: NetworkRole,
  title: NetworkTitle | null = null
): Promise<BureauActionResult> {
  if (!isUuidLike(userId)) return { ok: false, error: 'invalid' }
  if (!isNetworkRole(role)) return { ok: false, error: 'invalid' }
  if (title !== null && !isNetworkTitle(title)) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkAdmin(supabase)
  if (!auth.ok) return auth

  const { error } = await supabase.rpc('network_grant_role', {
    p_user_id: userId,
    p_role: role,
    p_title: title ?? undefined,
  })
  if (error) {
    captureIfUnknown(error, 'grantBoardRole', auth.userId)
    return { ok: false, error: mapPgError(error.code, error.message) }
  }
  revalidatePath('/reseau/bureau')
  return { ok: true }
}

/**
 * Retire un membre de l'équipe réseau (network_admin uniquement). Le garde-fou « dernier admin »
 * vit dans la RPC (migration 042) : retirer le dernier network_admin remonte `last_admin` (rendu
 * en `data-warning` côté UI), JAMAIS dupliqué côté client.
 */
async function _revokeBoardRoleAction(userId: string): Promise<BureauActionResult> {
  if (!isUuidLike(userId)) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const auth = await requireNetworkAdmin(supabase)
  if (!auth.ok) return auth

  const { error } = await supabase.rpc('network_revoke_role', { p_user_id: userId })
  if (error) {
    captureIfUnknown(error, 'revokeBoardRole', auth.userId)
    return { ok: false, error: mapPgError(error.code, error.message) }
  }
  revalidatePath('/reseau/bureau')
  return { ok: true }
}

/** Attribue un rôle réseau, journalisé (audit fire-and-forget sur succès uniquement). */
export const grantBoardRoleAction = withAudit(_grantBoardRoleAction, {
  action: 'network_grant_role',
  targetType: 'network_member',
  targetId: (_r, userId: string) => userId,
  metadata: (_r, _userId: string, role: NetworkRole, title: NetworkTitle | null = null) => ({
    role,
    title,
  }),
  shouldLog: (r) => r.ok,
})

/** Retire un rôle réseau, journalisé (audit fire-and-forget sur succès uniquement). */
export const revokeBoardRoleAction = withAudit(_revokeBoardRoleAction, {
  action: 'network_revoke_role',
  targetType: 'network_member',
  targetId: (_r, userId: string) => userId,
  shouldLog: (r) => r.ok,
})
