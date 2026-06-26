// Paliers de rôle club — source UNIQUE (importable partout, y compris le middleware).
//
// Module volontairement SANS dépendance runtime (seul un import de TYPE depuis @evolve/data) :
// il peut donc être importé par `middleware.ts` sans tirer la logique de `admin.ts`
// (formatCurrency, buildTimelineYears...) dans le bundle middleware.
//
// Deux paliers :
// - `STAFF_ROLES` / `isStaffRole` = ÉCRITURE. Le « staff » garde TOUTES les mutations (RPC
//   SECURITY DEFINER, Server Actions) + le déclenchement de sync. Le secrétaire N'EST PAS staff.
// - `VIEW_ADMIN_ROLES` / `canViewClubAdmin` = LECTURE. Accès LECTURE SEULE à tout l'espace admin
//   (secrétaire + staff). Calqué sur le helper SQL `can_view_club_admin` (migration 062).

import type { Database } from '@evolve/data'

export type MemberRole = Database['public']['Enums']['member_role']

export const STAFF_ROLES: readonly MemberRole[] = ['treasurer', 'president', 'network_admin']

export function isStaffRole(role: unknown): role is MemberRole {
  return typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role)
}

export const VIEW_ADMIN_ROLES: readonly MemberRole[] = [
  'secretary',
  'treasurer',
  'president',
  'network_admin',
]

/** true si le rôle donne accès en LECTURE à l'espace admin (secrétaire inclus). */
export function canViewClubAdmin(role: unknown): role is MemberRole {
  return typeof role === 'string' && (VIEW_ADMIN_ROLES as readonly string[]).includes(role)
}
