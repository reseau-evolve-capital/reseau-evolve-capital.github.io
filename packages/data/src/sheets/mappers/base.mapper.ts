import { z } from 'zod'
import type { BaseRowDTO, UserUpsert, MembershipUpsert } from '../../types/sheets'
import { toIsoDate } from './_shared'

const emailSchema = z.email() // zod v4

/**
 * Mappe une ligne de la feuille Base (l'ancre) vers un couple user + membership.
 * L'email est la clé naturelle de matching : il est normalisé (trim + lowercase)
 * puis validé. Un email invalide fait échouer l'import de la ligne (throw).
 */
export function mapBaseRowToMember(
  row: BaseRowDTO,
  clubId: string
): { user: UserUpsert; membership: MembershipUpsert } {
  const email = row.email.trim().toLowerCase()
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) {
    throw new Error(`Email invalide pour "${row.fullName}": "${row.email}"`)
  }
  const fullName = row.fullName.trim()
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
    user: {
      email,
      full_name: fullName,
      lastname,
      firstname,
      phone: row.phone ?? null,
      address: row.address ?? null,
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
