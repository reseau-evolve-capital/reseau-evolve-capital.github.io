import { z } from 'zod'
import { parseFrDate } from '@evolve/utils'
import type { BaseRowDTO, UserUpsert, MembershipUpsert } from '../../types/sheets'

const emailSchema = z.email() // zod v4

/** Date FR → "yyyy-mm-dd" (format DATE Postgres) ou null. */
function toIsoDate(input: string | null | undefined): string | null {
  const d = parseFrDate(input)
  return d ? d.toISOString().slice(0, 10) : null
}

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
  const [lastname = '', ...rest] = fullName.split(/\s+/)
  const firstname = rest.join(' ')
  const isActive = row.status.trim() === 'Membre actif'

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
