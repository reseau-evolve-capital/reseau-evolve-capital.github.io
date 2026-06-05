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
import { buildUpdateArgs, validateInput, type ClubSettingsInput } from '@/lib/data/clubSettings'
import { getInvitationMailer } from '@/lib/invitations/mailer'
import { newInviteToken, hashInviteToken, inviteUrl } from '@/lib/invitations/token'

/** Résultat sans payload (lock/unlock/revoke). */
export type ActionResult = { ok: true } | { ok: false; error: string }
/** Résultat avec payload (create/resend renvoient le lien clair à copier). */
export type ActionResultWith<T> = ({ ok: true } & T) | { ok: false; error: string }

async function serverClient() {
  return createServerClient(await cookies())
}

const emailSchema = z.string().email()

/** Codes Postgres → erreurs métier stables (consommées par l'UI pour un message i18n). */
function mapPgError(code: string | undefined): string {
  if (code === '23505') return 'duplicate' // unique_violation : invitation pending déjà existante
  if (code === '42501') return 'forbidden' // insufficient_privilege : RAISE « staff requis »
  return 'unknown'
}

/** Inviter un email : crée l'allowlist + l'invitation pending, renvoie le lien clair (copier-coller). */
export async function createInvitationAction(
  rawEmail: string
): Promise<ActionResultWith<{ link: string }>> {
  const email = rawEmail.trim().toLowerCase()
  if (!emailSchema.safeParse(email).success) return { ok: false, error: 'invalid_email' }

  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return { ok: false, error: 'forbidden' }

  const token = newInviteToken()
  const { error } = await supabase.rpc('admin_create_invitation', {
    p_club_id: ctx.clubId,
    p_email: email,
    p_token_hash: hashInviteToken(token),
  })
  if (error) return { ok: false, error: mapPgError(error.code) }

  const link = inviteUrl(token)
  // V0 : mailer no-op (le lien est surfacé dans l'UI). E-NTF branchera l'envoi réel.
  await getInvitationMailer().send({ to: email, inviteUrl: link })
  return { ok: true, link }
}

/** Renvoyer : régénère le token (invalide l'ancien), remet 72 h, renvoie le nouveau lien. */
export async function resendInvitationAction(
  invitationId: string
): Promise<ActionResultWith<{ link: string }>> {
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
  if (error) return { ok: false, error: mapPgError(error.code) }
  return { ok: true, link: inviteUrl(token) }
}

/** Révoquer une invitation en attente. */
export async function revokeInvitationAction(invitationId: string): Promise<ActionResult> {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const { error } = await supabase.rpc('admin_revoke_invitation', { p_invitation_id: invitationId })
  if (error) return { ok: false, error: mapPgError(error.code) }
  return { ok: true }
}

/** Verrouiller un membre (motif optionnel). */
export async function lockMemberAction(
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
  if (error) return { ok: false, error: mapPgError(error.code) }
  return { ok: true }
}

/** Déverrouiller un membre. */
export async function unlockMemberAction(membershipId: string): Promise<ActionResult> {
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
  if (error) return { ok: false, error: mapPgError(error.code) }
  return { ok: true }
}

/**
 * Mettre à jour les paramètres du club (nom, ville, pays, réf. courtier, plafond).
 * La garde staff est dans la RPC `update_club_settings` (SECURITY DEFINER). On valide
 * aussi côté serveur avant l'appel : entrée invalide → erreur métier stable, pas d'appel DB.
 * Le double-warning « opération sensible » sur broker_account_ref est imposé côté UI.
 */
export async function updateClubSettingsAction(input: ClubSettingsInput): Promise<ActionResult> {
  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return { ok: false, error: 'forbidden' }

  const validationErrors = validateInput(input)
  if (validationErrors.length > 0) {
    return { ok: false, error: validationErrors[0] ?? 'invalid' }
  }

  const { error } = await supabase.rpc('update_club_settings', buildUpdateArgs(ctx.clubId, input))
  if (error) return { ok: false, error: mapPgError(error.code) }
  return { ok: true }
}
