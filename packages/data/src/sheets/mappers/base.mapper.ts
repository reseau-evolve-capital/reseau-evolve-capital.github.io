import { slugify } from '@evolve/utils'
import type { BaseRowDTO, UserUpsert, MembershipUpsert } from '../../types/sheets'
import { toIsoDate } from './_shared'

/**
 * Email synthétique DÉTERMINISTE pour un membre Base sans email (typiquement un
 * sortant). Idempotent : même nom + même club → même email à chaque sync, pour que
 * l'upsert onConflict(email) matche et ne crée jamais de doublon. Le domaine `.local`
 * et le préfixe `sans-email.` garantissent qu'il n'est ni invité ni sur l'allowlist
 * → aucun magic link possible (cf. migration 026). On slugifie le full_name (fallback
 * "anonyme" si vide) ; le clubId (UUID stable) borne l'unicité inter-clubs.
 */
function placeholderEmail(fullName: string, clubId: string): string {
  const nameSlug = slugify(fullName) || 'anonyme'
  return `sans-email.${nameSlug}@${clubId}.local`
}

/**
 * Mappe une ligne de la feuille Base (l'ancre) vers un couple user + membership.
 * L'email est la clé naturelle de matching : il est normalisé (trim + lowercase).
 *
 * Principe owner « aucune perte à l'import » :
 *   - email VIDE  → email placeholder déterministe + email_is_placeholder = true ;
 *   - email NON VIDE (même malformé) → conservé tel quel (trim+lowercase),
 *     email_is_placeholder = false. On ne perd pas l'info ; de toute façon un email
 *     hors allowlist ne reçoit pas de magic link.
 * Le mapper ne throw plus sur l'email (seul un statut inconnu reste bloquant).
 *
 * `sheetEmailEmpty` signale que la feuille ne fournit PAS d'email pour cette ligne. Le mapper
 * reste PUR (il ne connaît pas la DB) : il expose juste ce drapeau. La résolution DB-aware
 * (réutiliser l'email existant plutôt que d'écraser) vit dans `resolveBaseEmail`
 * (cf. baseEmailResolution.ts), appelée par l'Edge Function `sync`.
 */
export function mapBaseRowToMember(
  row: BaseRowDTO,
  clubId: string
): { user: UserUpsert; membership: MembershipUpsert; sheetEmailEmpty: boolean } {
  const fullName = row.fullName.trim()
  const rawEmail = row.email.trim().toLowerCase()
  const emailIsPlaceholder = rawEmail === ''
  const email = emailIsPlaceholder ? placeholderEmail(fullName, clubId) : rawEmail
  // Décomposition heuristique : full_name reste la référence (cf. DATA_MODEL §2.2).
  // Le 1er token est traité comme nom (NOM en majuscules dans la Sheet), le reste
  // comme prénom(s). Un mononyme (un seul token) produit firstname=''.
  const [lastname = '', ...rest] = fullName.split(/\s+/)
  const firstname = rest.join(' ')
  const rawStatus = row.status.trim()
  if (rawStatus !== 'Membre actif' && rawStatus !== 'Membre sorti') {
    throw new Error(
      `Statut inconnu "${row.status}" pour "${row.fullName}" (attendu: "Membre actif" ou "Membre sorti").`
    )
  }
  const isActive = rawStatus === 'Membre actif'

  return {
    sheetEmailEmpty: emailIsPlaceholder,
    user: {
      email,
      full_name: fullName,
      lastname,
      firstname,
      phone: row.phone ?? null,
      address: row.address ?? null,
      email_is_placeholder: emailIsPlaceholder,
    },
    membership: {
      club_id: clubId,
      role: 'member',
      status: isActive ? 'active' : 'left',
      joined_at: toIsoDate(row.joinedAt),
      leave_at: toIsoDate(row.leftAt),
      leave_with_amount: row.leftWithAmount ?? null,
    },
  }
}
