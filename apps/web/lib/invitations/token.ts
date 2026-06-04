// Token d'invitation (ADM-007). NOTRE token applicatif (≠ expiry Supabase) : un secret
// aléatoire part dans le lien, seul son sha256 est stocké en base (invitations.token_hash).
// Server-only (node:crypto). Le même hash doit être produit côté création (Server Action)
// ET côté acceptation (route /login/invite) → helpers partagés ici.

import { createHash, randomBytes } from 'node:crypto'

/** Token clair d'invitation (jamais stocké en base ; renvoyé à l'UI / au lien une seule fois). */
export function newInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

/** sha256 hex du token — la valeur stockée et comparée en base (invitations.token_hash). */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Origin de l'app — jamais un header attaquant-contrôlé (cf. /api/auth/magic-link). */
export function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
}

/** Lien d'invitation public à copier-coller (V0) / à envoyer (E-NTF). */
export function inviteUrl(token: string): string {
  return `${siteOrigin()}/login/invite?token=${encodeURIComponent(token)}`
}
