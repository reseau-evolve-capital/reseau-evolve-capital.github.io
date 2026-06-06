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
export type AccessStatus = Database['public']['Enums']['member_access_status']
export type AccessEventAction = Database['public']['Enums']['access_event_action']
/** Statut d'adhésion (≠ accessStatus) : « Membre actif » → active, « Membre sorti » → left (base.mapper). */
export type MemberStatus = Database['public']['Enums']['member_status']

/** Limite légale de membres ACTIFS par club (au-delà : club non conforme). */
export const ACTIVE_MEMBER_LIMIT = 20

/** Un événement du journal d'accès d'un membre (verrou/déverrou). RLS staff. */
export interface AccessEvent {
  id: string
  action: AccessEventAction
  reason: string | null
  createdAt: string
}

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
  /** true = email synthétique généré à l'import (membre Base sans email, cf. migration 026).
   *  L'UI masque alors le placeholder et propose de renseigner le vrai email. */
  emailIsPlaceholder: boolean
  role: MemberRole
  totalContributed: number
  detentionPct: number // fraction 0..1
  monthsCount: number
  /** Valeur boursière nette détenue par le membre (€). null si non renseignée. */
  netMarketValue: number | null
  status: ContributionStatus | null
  amountDue: number
  isUnpaid: boolean
  isActive: boolean
  /** Statut d'adhésion : `left` = membre sorti du club (Base « Date de sortie » remplie). */
  membershipStatus: MemberStatus
  /** Date de sortie (ISO `YYYY-MM-DD`) si membre sorti, sinon null. */
  leaveAt: string | null
  accessStatus: AccessStatus // 'active' | 'locked' (verrou par-club, ADM-007)
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

/** Email affichable d'un membre : `null` si l'email est un placeholder synthétique
 *  (l'UI affiche alors « Email manquant »), sinon l'email réel. Voir migration 026. */
export function displayableEmail(email: string, emailIsPlaceholder: boolean): string | null {
  return emailIsPlaceholder ? null : email
}

export function clubTotalContributed(members: ClubMember[]): number {
  return members.reduce((s, m) => s + m.totalContributed, 0)
}

export function filterMembers(members: ClubMember[], onlyUnpaid: boolean): ClubMember[] {
  return onlyUnpaid ? members.filter((m) => m.isUnpaid) : members
}

/** Filtre par état d'adhésion : tous / actifs uniquement / sortis uniquement. */
export type MemberStateFilter = 'all' | 'active' | 'left'
export function filterByMemberState(members: ClubMember[], state: MemberStateFilter): ClubMember[] {
  switch (state) {
    case 'active':
      return members.filter((m) => m.membershipStatus === 'active')
    case 'left':
      return members.filter((m) => m.membershipStatus === 'left')
    case 'all':
      return members
  }
}

/** Nombre de membres ACTIFS (statut d'adhésion `active`), pour le suivi de la limite légale. */
export function countActiveMembers(members: ClubMember[]): number {
  return members.reduce((n, m) => (m.membershipStatus === 'active' ? n + 1 : n), 0)
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
  if (positions.error) throw positions.error
  if (club.error) throw club.error
  const portfolioValue = (positions.data ?? []).reduce((s, p) => s + Number(p.market_value ?? 0), 0)
  return {
    clubId,
    activeMembers: countActiveMembers(members),
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
      // FK explicite : depuis ADM-007, memberships a 2 FK vers users (user_id + locked_by) →
      // l'embed doit lever l'ambiguïté (sinon PGRST201).
      // On lit TOUTES les lignes du club (actifs ET sortis) : pas de filtre is_active/status.
      // Les membres sortis (Base « Date de sortie » → status `left`) doivent rester visibles.
      .select(
        'id, user_id, role, is_active, joined_at, status, leave_at, access_status, users!memberships_user_id_fkey!inner(full_name, email, email_is_placeholder)'
      )
      .eq('club_id', clubId)
      .returns<
        {
          id: string
          user_id: string
          role: MemberRole
          is_active: boolean | null
          joined_at: string
          status: MemberStatus
          leave_at: string | null
          access_status: AccessStatus
          users: { full_name: string; email: string; email_is_placeholder: boolean }
        }[]
      >(),
    supabase
      .from('contributions')
      .select(
        'membership_id, total_contributed, detention_pct, months_count, net_market_value, status, amount_due'
      )
      .eq('club_id', clubId)
      .returns<
        {
          membership_id: string
          total_contributed: number | null
          detention_pct: number | null
          months_count: number | null
          net_market_value: number | null
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
      emailIsPlaceholder: m.users.email_is_placeholder,
      role: m.role,
      totalContributed: Number(c?.total_contributed ?? 0),
      detentionPct: Number(c?.detention_pct ?? 0),
      monthsCount: Number(c?.months_count ?? 0),
      netMarketValue: c?.net_market_value != null ? Number(c.net_market_value) : null,
      status,
      amountDue,
      isUnpaid: isUnpaid(status, amountDue),
      // is_active est GENERATED (status = 'active') mais nullable au type → on s'aligne sur status.
      isActive: m.status === 'active',
      membershipStatus: m.status,
      leaveAt: m.leave_at,
      accessStatus: m.access_status,
    }
  })
}

/** Journal d'accès (verrou/déverrou) d'un membre — fiche membre. RLS « access events: staff read ». */
export async function getMemberAccessLog(
  supabase: ServerClient,
  membershipId: string
): Promise<AccessEvent[]> {
  const { data, error } = await supabase
    .from('member_access_events')
    .select('id, action, reason, created_at')
    .eq('membership_id', membershipId)
    .order('created_at', { ascending: false })
    .returns<
      { id: string; action: AccessEventAction; reason: string | null; created_at: string }[]
    >()
  if (error) throw error
  return (data ?? []).map((e) => ({
    id: e.id,
    action: e.action,
    reason: e.reason,
    createdAt: e.created_at,
  }))
}

/** Priorité d'agrégation d'un statut mensuel au niveau CLUB : on remonte le plus
 *  « actionnable » (retard > en attente > payé > exempté) pour la cellule du mois. */
const MONTH_STATUS_RANK: Record<MonthStatus, number> = { late: 4, due: 3, paid: 2, exempt: 1 }

/** Agrège les mois en doublon par période (année+mois) en une seule entrée.
 *  Vue club « tous les membres » : la requête renvoie 1 ligne par membre ET par mois ;
 *  la timeline (1 cellule/mois) exige des périodes uniques (sinon clés React dupliquées
 *  + cellules ×N). Statut = le plus actionnable ; montant cumulé ; `paidAt` indéterminé
 *  en agrégat. No-op quand il n'y a qu'une ligne par mois (vue filtrée par membre). */
function aggregateMonthsByPeriod(months: MonthInput[]): MonthInput[] {
  const byPeriod = new Map<string, MonthInput>()
  for (const m of months) {
    const key = `${m.year}-${m.month}`
    const prev = byPeriod.get(key)
    if (!prev) {
      byPeriod.set(key, { ...m })
      continue
    }
    byPeriod.set(key, {
      year: m.year,
      month: m.month,
      amount: prev.amount + m.amount,
      status: MONTH_STATUS_RANK[m.status] > MONTH_STATUS_RANK[prev.status] ? m.status : prev.status,
      paidAt: null,
    })
  }
  return [...byPeriod.values()]
}

/** Timeline + stats des cotisations du club (tous membres), filtrable par membership.
 *  Réutilise buildTimelineYears (contributions.ts). RLS « cm: treasurer read ». */
export async function getClubContributionsTimeline(
  supabase: ServerClient,
  clubId: string,
  membershipId?: string | null
): Promise<{ years: TimelineYear[]; stats: ContribStats }> {
  // D3 — borne la frise à l'année courante (l'échéancier matrice va jusqu'en 2051 en `due`).
  const currentYear = new Date().getFullYear()
  let q = supabase
    .from('contribution_months')
    .select('year, month, amount, status, paid_at')
    .eq('club_id', clubId)
    .lte('year', currentYear)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (membershipId) q = q.eq('membership_id', membershipId)

  const { data, error } = await q.returns<
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
    // Timeline = périodes uniques (agrégées au niveau club si « tous les membres »).
    years: buildTimelineYears(aggregateMonthsByPeriod(months)),
    // Stats = tous les versements individuels (total/nombre/moyenne du club).
    stats: computeContribStats(months.map((m) => m.amount)),
  }
}
