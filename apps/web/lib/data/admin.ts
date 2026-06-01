// Couche data du module admin trésorier (E-ADM).
//
// Chemin MULTI-MEMBRES : on lit TOUTES les lignes du club via les policies RLS
// « treasurer read » (contributions / contribution_months / positions) déjà en place.
// C'est l'INVERSE du bug role-safe du S6 → requêtes en LISTES, jamais .maybeSingle().
// JAMAIS de service-role ici (même côté admin) : la RLS treasurer doit s'appliquer.
//
// « Impayé » = status ∈ (late, pending) OU amount_due > 0 (pas d'annual_quota en DB).
// Formatage exclusivement via @evolve/utils côté UI (ce module renvoie des nombres bruts).
//
// Réf : E-ADM, DATA_MODEL.md §1/§2.6/§2.9/§3, CLAUDE.md (RLS, jamais service-role).

import type { createServerClient, Database } from '@evolve/data'
import type { TimelineYear } from '@evolve/ui'
import { buildTimelineYears, type MonthInput } from './contributions'

type ServerClient = ReturnType<typeof createServerClient>
type MembershipRow = Database['public']['Tables']['memberships']['Row']

export type MemberRole = Database['public']['Enums']['member_role']
export type ContributionStatus = Database['public']['Enums']['contribution_status']
export type MonthStatus = Database['public']['Enums']['month_status']

const STAFF_ROLES: readonly MemberRole[] = ['treasurer', 'president', 'network_admin']
export function isStaffRole(role: unknown): role is MemberRole {
  return typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role)
}

/** Membre du club consolidé (vue trésorier). Aligné sur MemberRow de MembersList (@evolve/ui). */
export interface ClubMember {
  id: string // membership_id
  userId: string
  fullName: string
  email: string
  role: MemberRole
  totalContributed: number
  detentionPct: number // fraction 0..1
  monthsCount: number
  status: ContributionStatus | null
  amountDue: number
  isUnpaid: boolean
  isActive: boolean
}

export interface ClubSummary {
  clubId: string
  activeMembers: number
  portfolioValue: number
  totalContributed: number
  unpaidCount: number
  syncedAt: string | null
  userRole: MemberRole
}

export interface AdminContext {
  userId: string
  clubId: string
  role: MemberRole
}

export interface ContribStats {
  total: number
  count: number
  average: number
}

// ─── Helpers PURS (testés sans DB) ──────────────────────────────────────────

/** Un membre est « en impayé » si retard/en attente OU s'il reste un montant dû. */
export function isUnpaid(status: ContributionStatus | null, amountDue: number): boolean {
  if (amountDue > 0) return true
  return status === 'late' || status === 'pending'
}

export function countUnpaid(members: ClubMember[]): number {
  return members.reduce((n, m) => (m.isUnpaid ? n + 1 : n), 0)
}

export function clubTotalContributed(members: ClubMember[]): number {
  return members.reduce((s, m) => s + m.totalContributed, 0)
}

export function filterMembers(members: ClubMember[], onlyUnpaid: boolean): ClubMember[] {
  return onlyUnpaid ? members.filter((m) => m.isUnpaid) : members
}

export type MemberSortKey = 'name' | 'total' | 'detention' | 'months'
export type SortDir = 'asc' | 'desc'

/** Tri immuable (ne mute pas la source). Nom = comparaison locale FR insensible à la casse. */
export function sortMembers(members: ClubMember[], key: MemberSortKey, dir: SortDir): ClubMember[] {
  const sign = dir === 'asc' ? 1 : -1
  const cmp = (a: ClubMember, b: ClubMember): number => {
    switch (key) {
      case 'name':
        return a.fullName.localeCompare(b.fullName, 'fr', { sensitivity: 'base' })
      case 'total':
        return a.totalContributed - b.totalContributed
      case 'detention':
        return a.detentionPct - b.detentionPct
      case 'months':
        return a.monthsCount - b.monthsCount
    }
  }
  return [...members].sort((a, b) => sign * cmp(a, b))
}

/** Stats agrégées sur une liste de montants. Jamais de NaN (moyenne 0 si vide). */
export function computeContribStats(amounts: number[]): ContribStats {
  const total = amounts.reduce((s, n) => s + n, 0)
  const count = amounts.length
  return { total, count, average: count === 0 ? 0 : total / count }
}

// ─── Helpers DB (session + RLS treasurer) ───────────────────────────────────

/** Résout le club de staff du user courant. Null si trésorier+ dans aucun club. */
export async function resolveAdminContext(
  supabase: ServerClient,
  userId: string
): Promise<AdminContext | null> {
  const { data: m } = await supabase
    .from('memberships')
    .select('club_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', STAFF_ROLES as unknown as string[])
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle<Pick<MembershipRow, 'club_id' | 'role'>>()
  if (!m) return null
  return { userId, clubId: m.club_id, role: m.role }
}

/** KPIs consolidés du club. Toutes les lectures passent par la RLS treasurer. */
export async function getClubSummary(
  supabase: ServerClient,
  clubId: string,
  userRole: MemberRole
): Promise<ClubSummary> {
  const [members, positions, club] = await Promise.all([
    getClubMembers(supabase, clubId),
    supabase
      .from('positions')
      .select('market_value')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .returns<{ market_value: number | null }[]>(),
    supabase.from('clubs').select('synced_at').eq('id', clubId).single(),
  ])
  const portfolioValue = (positions.data ?? []).reduce((s, p) => s + Number(p.market_value ?? 0), 0)
  return {
    clubId,
    activeMembers: members.filter((m) => m.isActive).length,
    portfolioValue,
    totalContributed: clubTotalContributed(members),
    unpaidCount: countUnpaid(members),
    syncedAt: club.data?.synced_at ?? null,
    userRole,
  }
}

/** Tous les membres du club (memberships ⋈ users ⋈ contributions). RLS treasurer. */
export async function getClubMembers(
  supabase: ServerClient,
  clubId: string
): Promise<ClubMember[]> {
  const [{ data: memberships, error: mErr }, { data: contribs, error: cErr }] = await Promise.all([
    supabase
      .from('memberships')
      .select('id, user_id, role, is_active, joined_at, users!inner(full_name, email)')
      .eq('club_id', clubId)
      .returns<
        {
          id: string
          user_id: string
          role: MemberRole
          is_active: boolean
          joined_at: string
          users: { full_name: string; email: string }
        }[]
      >(),
    supabase
      .from('contributions')
      .select('membership_id, total_contributed, detention_pct, months_count, status, amount_due')
      .eq('club_id', clubId)
      .returns<
        {
          membership_id: string
          total_contributed: number | null
          detention_pct: number | null
          months_count: number | null
          status: ContributionStatus
          amount_due: number | null
        }[]
      >(),
  ])
  if (mErr) throw mErr
  if (cErr) throw cErr

  const byMembership = new Map((contribs ?? []).map((c) => [c.membership_id, c]))
  return (memberships ?? []).map((m) => {
    const c = byMembership.get(m.id)
    const status = c?.status ?? null
    const amountDue = Number(c?.amount_due ?? 0)
    return {
      id: m.id,
      userId: m.user_id,
      fullName: m.users.full_name,
      email: m.users.email,
      role: m.role,
      totalContributed: Number(c?.total_contributed ?? 0),
      detentionPct: Number(c?.detention_pct ?? 0),
      monthsCount: Number(c?.months_count ?? 0),
      status,
      amountDue,
      isUnpaid: isUnpaid(status, amountDue),
      isActive: m.is_active,
    }
  })
}

/** Timeline + stats des cotisations du club (tous membres), filtrable par membership.
 *  Réutilise buildTimelineYears (contributions.ts). RLS « cm: treasurer read ». */
export async function getClubContributionsTimeline(
  supabase: ServerClient,
  clubId: string,
  membershipId?: string | null
): Promise<{ years: TimelineYear[]; stats: ContribStats }> {
  let q = supabase
    .from('contribution_months')
    .select('year, month, amount, status, paid_at')
    .eq('club_id', clubId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (membershipId) q = q.eq('membership_id', membershipId)

  const { data, error } =
    await q.returns<
      {
        year: number
        month: number
        amount: number | null
        status: MonthStatus
        paid_at: string | null
      }[]
    >()
  if (error) throw error

  const months: MonthInput[] = (data ?? []).map((r) => ({
    year: r.year,
    month: r.month,
    amount: Number(r.amount ?? 0),
    status: r.status,
    paidAt: r.paid_at,
  }))
  return {
    years: buildTimelineYears(months),
    stats: computeContribStats(months.map((m) => m.amount)),
  }
}
