'use server'

// Server Actions du contrôle d'accès (ADM-007). Toutes appellent les RPC SECURITY DEFINER
// via le client serveur (session + cookies) : c'est le RPC qui vérifie l'autorité staff du club.
// JAMAIS de service-role ici (le seul chemin service-role est la route publique /login/invite).
// La génération du token d'invitation est server-only ; seul le LIEN clair est renvoyé à l'UI.
//
// Réf : ADM-007-PLAN.md §API/serveur, migration 016 (RPC), CLAUDE.md (RLS, jamais service-role client).

import { cookies } from 'next/headers'
import { z } from 'zod'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext } from '@/lib/data/admin'
import { getActiveClubId } from '@/lib/data/request'
import { buildUpdateArgs, validateInput, type ClubSettingsInput } from '@/lib/data/clubSettings'
import { getInvitationMailer } from '@/lib/invitations/mailer'
import { newInviteToken, hashInviteToken, inviteUrl } from '@/lib/invitations/token'
import { captureActionError } from '@/lib/monitoring/sentry'
import { withAudit } from '@/lib/actions/withAudit'

/** Rôles club attribuables depuis l'éditeur (network_admin = scope réseau, exclu).
 *  `secretary` = accès LECTURE SEULE (la RPC admin_change_member_role l'accepte, migration 062). */
export type EditableMemberRole = 'member' | 'secretary' | 'treasurer' | 'president'
const EDITABLE_ROLES: readonly EditableMemberRole[] = [
  'member',
  'secretary',
  'treasurer',
  'president',
]

/** Résultat sans payload (lock/unlock/revoke). */
export type ActionResult = { ok: true } | { ok: false; error: string }
/**
 * Résultat de création/renvoi d'invitation. `delivered` distingue « email réellement envoyé »
 * (provider branché) de « lien à copier » (V0 : mailer no-op). Tant que delivered=false, l'UI
 * affiche le lien à transmettre manuellement plutôt qu'un faux « envoyé ».
 */
export type InvitationActionResult =
  | { ok: true; link: string; delivered: boolean }
  | { ok: false; error: string }

async function serverClient() {
  return createServerClient(await cookies())
}

const emailSchema = z.string().email()

/** Codes Postgres → erreurs métier stables (consommées par l'UI pour un message i18n). */
function mapPgError(code: string | undefined): string {
  if (code === '23505') return 'duplicate' // unique_violation : email/invitation déjà utilisé
  if (code === '42501') return 'forbidden' // insufficient_privilege : RAISE « staff requis »
  if (code === '22023') return 'invalid' // invalid_parameter_value : email/pays/plafond invalide
  if (code === 'P0002') return 'not_member' // B5 : RAISE « email hors club » (migration 031)
  return 'unknown'
}

/**
 * Capture une erreur Supabase inattendue (code PG non mappé → 'unknown').
 * Les erreurs métier connues (duplicate/forbidden/invalid/not_member) ne sont pas des bugs.
 */
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
 * Tente l'envoi email de l'invitation. Renvoie `true` SEULEMENT si un provider a réellement
 * délivré le message. En V0 le mailer est un no-op ({ delivered: false }) → on retourne false et
 * l'UI affiche « lien à copier ». Un échec d'envoi (exception du provider) n'est PAS fatal : le
 * lien reste exploitable manuellement, donc on retombe sur false sans faire échouer l'action.
 */
async function tryDeliverInvitation(to: string, link: string): Promise<boolean> {
  try {
    const res = await getInvitationMailer().send({ to, inviteUrl: link })
    return res.delivered
  } catch {
    // L'envoi a échoué (provider indisponible) — le lien reste valide et copiable. Pas fatal.
    return false
  }
}

/**
 * Inviter un email : crée l'invitation pending pour un MEMBRE du club (B5 — la RPC refuse tout
 * email hors club, code 'not_member'), puis tente l'envoi. Renvoie toujours le lien clair et
 * `delivered` (faux en V0) pour que l'UI distingue « envoyé » de « lien à copier ».
 */
async function _createInvitationAction(rawEmail: string): Promise<InvitationActionResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!emailSchema.safeParse(email).success) return { ok: false, error: 'invalid_email' }

  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveAdminContext(supabase, user.id, await getActiveClubId())
  if (!ctx) return { ok: false, error: 'forbidden' }

  const token = newInviteToken()
  const { error } = await supabase.rpc('admin_create_invitation', {
    p_club_id: ctx.clubId,
    p_email: email,
    p_token_hash: hashInviteToken(token),
  })
  if (error) {
    captureIfUnknown(error, 'createInvitation', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }

  const link = inviteUrl(token)
  const delivered = await tryDeliverInvitation(email, link)
  return { ok: true, link, delivered }
}

/**
 * `createInvitationAction` enveloppée par {@link withAudit} : trace dans `audit_log` sur succès.
 * On NE journalise NI l'email (PII) NI le token : seul l'événement « invitation créée » et le
 * fait qu'un email ait réellement été délivré sont tracés.
 */
export const createInvitationAction: (rawEmail: string) => Promise<InvitationActionResult> =
  withAudit(_createInvitationAction, {
    action: 'invitation.create',
    targetType: 'invitation',
    metadata: (result) => {
      const r = result as InvitationActionResult
      return { delivered: r.ok ? r.delivered : false }
    },
    shouldLog: (result) => result.ok,
  })

/** Renvoyer : régénère le token (invalide l'ancien), remet 72 h, renvoie le nouveau lien. */
async function _resendInvitationAction(invitationId: string): Promise<InvitationActionResult> {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const token = newInviteToken()
  const { error } = await supabase.rpc('admin_resend_invitation', {
    p_invitation_id: invitationId,
    p_token_hash: hashInviteToken(token),
  })
  if (error) {
    captureIfUnknown(error, 'resendInvitation', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }

  const link = inviteUrl(token)
  // L'email du destinataire n'est pas renvoyé par la RPC resend ; en V0 le mailer est no-op de
  // toute façon. Quand un provider sera branché, resend relira l'email de l'invitation pour livrer.
  const delivered = false
  return { ok: true, link, delivered }
}

/** Renvoie (régénère le token) une invitation, journalisé (audit fire-and-forget sur succès). */
export const resendInvitationAction: (invitationId: string) => Promise<InvitationActionResult> =
  withAudit(_resendInvitationAction, {
    action: 'invitation.resend',
    targetType: 'invitation',
    targetId: (_result, invitationId: string) => invitationId,
    shouldLog: (result) => result.ok,
  })

/** Révoquer une invitation en attente. */
async function _revokeInvitationAction(invitationId: string): Promise<ActionResult> {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { error } = await supabase.rpc('admin_revoke_invitation', { p_invitation_id: invitationId })
  if (error) {
    captureIfUnknown(error, 'revokeInvitation', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }
  return { ok: true }
}

/** Révoque une invitation, journalisé (audit fire-and-forget sur succès uniquement). */
export const revokeInvitationAction: (invitationId: string) => Promise<ActionResult> = withAudit(
  _revokeInvitationAction,
  {
    action: 'invitation.revoke',
    targetType: 'invitation',
    targetId: (_result, invitationId: string) => invitationId,
    shouldLog: (result) => result.ok,
  }
)

/** Verrouiller un membre (motif optionnel). */
async function _lockMemberAction(
  membershipId: string,
  reason: string | null
): Promise<ActionResult> {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { error } = await supabase.rpc('admin_set_member_access', {
    p_membership_id: membershipId,
    p_locked: true,
    p_reason: reason && reason.trim().length > 0 ? reason.trim() : undefined,
  })
  if (error) {
    captureIfUnknown(error, 'lockMember', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }
  return { ok: true }
}

/**
 * Verrouille l'accès d'un membre, journalisé. Le motif n'est PAS journalisé (peut contenir du
 * texte libre) — seul l'événement « accès verrouillé » et sa cible (membership) sont tracés.
 */
export const lockMemberAction: (
  membershipId: string,
  reason: string | null
) => Promise<ActionResult> = withAudit(_lockMemberAction, {
  action: 'member.lock',
  targetType: 'membership',
  targetId: (_result, membershipId: string) => membershipId,
  shouldLog: (result) => result.ok,
})

/** Déverrouiller un membre. */
async function _unlockMemberAction(membershipId: string): Promise<ActionResult> {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { error } = await supabase.rpc('admin_set_member_access', {
    p_membership_id: membershipId,
    p_locked: false,
    p_reason: undefined,
  })
  if (error) {
    captureIfUnknown(error, 'unlockMember', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }
  return { ok: true }
}

/** Déverrouille l'accès d'un membre, journalisé (audit fire-and-forget sur succès uniquement). */
export const unlockMemberAction: (membershipId: string) => Promise<ActionResult> = withAudit(
  _unlockMemberAction,
  {
    action: 'member.unlock',
    targetType: 'membership',
    targetId: (_result, membershipId: string) => membershipId,
    shouldLog: (result) => result.ok,
  }
)

/**
 * Mettre à jour les paramètres du club (nom, ville, pays, réf. courtier, plafond).
 * La garde staff est dans la RPC `update_club_settings` (SECURITY DEFINER). On valide
 * aussi côté serveur avant l'appel : entrée invalide → erreur métier stable, pas d'appel DB.
 * Le double-warning « opération sensible » sur broker_account_ref est imposé côté UI.
 */
async function _updateClubSettingsAction(input: ClubSettingsInput): Promise<ActionResult> {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveAdminContext(supabase, user.id, await getActiveClubId())
  if (!ctx) return { ok: false, error: 'forbidden' }

  const validationErrors = validateInput(input)
  if (validationErrors.length > 0) {
    return { ok: false, error: validationErrors[0] ?? 'invalid' }
  }

  const { error } = await supabase.rpc('update_club_settings', buildUpdateArgs(ctx.clubId, input))
  if (error) {
    captureIfUnknown(error, 'updateClubSettings', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }
  return { ok: true }
}

/**
 * Met à jour les paramètres du club, journalisé. La cible (club) est le club ACTIF, résolu côté
 * action et non passé en argument — on ne peut donc pas le dériver ici (targetId omis). On journalise
 * les CLÉS de configuration modifiées (pas leurs valeurs, dont la réf. courtier sensible).
 */
export const updateClubSettingsAction: (input: ClubSettingsInput) => Promise<ActionResult> =
  withAudit(_updateClubSettingsAction, {
    action: 'club.update_settings',
    targetType: 'club',
    metadata: (_result, input: ClubSettingsInput) => ({ fields: Object.keys(input) }),
    shouldLog: (result) => result.ok,
  })

/**
 * Renseigner / corriger l'email d'un membre (typiquement un sortant importé sans email,
 * cf. migration 026 : email placeholder + email_is_placeholder=true).
 * La garde staff est dans la RPC `update_member_email` (SECURITY DEFINER, scopée au club
 * DU membership). On valide aussi le format côté serveur avant l'appel. Le conflit d'unicité
 * (email déjà utilisé) remonte en erreur `duplicate`. JAMAIS de service-role ici.
 */
async function _updateMemberEmailAction(
  membershipId: string,
  rawEmail: string
): Promise<ActionResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!emailSchema.safeParse(email).success) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { error } = await supabase.rpc('update_member_email', {
    p_membership_id: membershipId,
    p_email: email,
  })
  if (error) {
    captureIfUnknown(error, 'updateMemberEmail', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }
  return { ok: true }
}

/**
 * Met à jour / corrige l'email d'un membre, journalisé. Le nouvel email (PII) n'est PAS journalisé :
 * seul l'événement « email du membre modifié » et la cible (membership) sont tracés.
 */
export const updateMemberEmailAction: (
  membershipId: string,
  rawEmail: string
) => Promise<ActionResult> = withAudit(_updateMemberEmailAction, {
  action: 'member.update_email',
  targetType: 'membership',
  targetId: (_result, membershipId: string) => membershipId,
  shouldLog: (result) => result.ok,
})

/**
 * Changer le rôle CLUB d'un membre (ADM-008) : pose `role` + `role_source='manual'` (non réécrit
 * par la sync). La garde staff-par-club ET l'anti-escalade (un trésorier ne peut pas nommer un
 * président) sont DANS la RPC `admin_change_member_role` (SECURITY DEFINER) — code 42501 → 'forbidden'.
 * On borne aussi le rôle côté serveur (jamais network_admin). JAMAIS de service-role ici.
 * Enveloppée par withAudit : l'audit est posé APRÈS un succès (fire-and-forget), jamais bloquant.
 */
async function _changeMemberRoleAction(
  membershipId: string,
  role: EditableMemberRole
): Promise<ActionResult> {
  if (!EDITABLE_ROLES.includes(role)) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { error } = await supabase.rpc('admin_change_member_role', {
    p_membership_id: membershipId,
    p_role: role,
  })
  if (error) {
    captureIfUnknown(error, 'changeMemberRole', user.id)
    return { ok: false, error: mapPgError(error.code) }
  }
  return { ok: true }
}

export const changeMemberRoleAction = withAudit(_changeMemberRoleAction, {
  action: 'admin_change_member_role',
  targetType: 'membership',
  targetId: (_r, membershipId: string) => membershipId,
  metadata: (_r, _membershipId: string, role: EditableMemberRole) => ({ role }),
  // Ne journalise que les changements réellement appliqués (résultat ok).
  shouldLog: (r) => r.ok,
})
