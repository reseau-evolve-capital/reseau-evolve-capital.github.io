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
import { formatCurrency } from '@evolve/utils'
import { buildTimelineYears, type MonthInput } from './contributions'
import { deriveContributionStatus, deriveAmountDue, joinedAtToYM } from './contributionStatus'

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
  /**
   * Origine du rôle (ADM-008) : 'sheet' = dérivé de la feuille PARAMETRAGES par la sync (écrasable) ;
   * 'manual' = défini en app via admin_change_member_role (figé, non réécrit par la sync). L'UI
   * affiche la note « Défini via la matrice (PARAMETRAGES) » tant que 'sheet'.
   */
  roleSource: 'sheet' | 'manual'
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

// ─── Nouveaux types cotisations V2 ──────────────────────────────────────────

/** Membre en retard de cotisation, avec comptage de mois en retard. */
export interface RegulariserMember {
  membershipId: string
  fullName: string
  lateMonthsCount: number
  amountDue: number
  email: string
  emailIsPlaceholder: boolean
}

/** Statistiques de recouvrement du club pour la page cotisations V2. */
export interface ClubCotisationsStats {
  /** Taux de recouvrement : paid / (paid + late + due). Fraction 0..1. Retourne 1 si aucun mois exploitable. */
  recoveryRate: number
  /** Σ amountDue des membres en retard (isUnpaid=true). */
  lateAmount: number
  /** Nombre de membres en retard. */
  lateCount: number
  /** Σ amount des mois avec status='paid'. */
  encaisse: number
}

/** Un mois en retard d'un membre (pour la fiche membre admin). */
export interface LateMonth {
  year: number
  month: number
  amount: number
}

/** Données de cotisation d'un membre spécifique pour la vue trésorier. */
export interface MemberCotisationsData {
  fullName: string
  joinedAt: string | null
  /** Statut dérivé via deriveContributionStatus. */
  status: ContributionStatus
  /** Taux de recouvrement du membre. Fraction 0..1. */
  recoveryRate: number
  amountDue: number
  netMarketValue: number | null
  lateMonths: LateMonth[]
  years: TimelineYear[]
  email: string
  emailIsPlaceholder: boolean
}

/** Payload de l'API cotisations admin V2 (remplace l'ancien payload years+stats). */
export interface AdminContribPayload {
  clubId: string
  clubStats: ClubCotisationsStats
  regulariserList: RegulariserMember[]
  /** null = mode club (vue agrégée) ; non-null = mode membre (fiche individuelle). */
  member: MemberCotisationsData | null
}

/** Paramètres déterministes de la synthèse trésorier (i18n côté UI). */
export interface SyntheseParams {
  /** Taux de recouvrement. Fraction 0..1. */
  recoveryRate: number
  lateCount: number
  lateAmount: number
  /** Nom du premier membre en retard (montant le plus élevé). null si 0 retard. */
  topMemberName: string | null
  /** Montant dû du premier membre. null si 0 retard. */
  topMemberAmount: number | null
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

// ─── Fonctions pures cotisations V2 ─────────────────────────────────────────

/**
 * Taux de recouvrement = paid / (paid + late + due). Exclut exempt.
 * Retourne 1 si aucun mois exploitable (club sans historique).
 */
export function computeRecoveryRate(months: Array<{ status: MonthStatus }>): number {
  let paid = 0
  let late = 0
  let due = 0
  for (const m of months) {
    if (m.status === 'paid') paid++
    else if (m.status === 'late') late++
    else if (m.status === 'due') due++
    // 'exempt' ignoré
  }
  const total = paid + late + due
  if (total === 0) return 1
  return paid / total
}

/**
 * Montant encaissé = Σ amount sur les lignes status='paid'.
 */
export function computeEncaisse(months: Array<{ amount: number; status: MonthStatus }>): number {
  return months.reduce((s, m) => (m.status === 'paid' ? s + m.amount : s), 0)
}

/**
 * Liste nominative des membres en retard (isUnpaid=true), triée par amountDue décroissant.
 * lateMonthsCount = calculé depuis lateMonthsByMembership (Map membershipId → count).
 */
export function buildRegulariserList(
  members: ClubMember[],
  lateMonthsByMembership: Map<string, number>
): RegulariserMember[] {
  return members
    .filter((m) => m.isUnpaid)
    .map((m) => ({
      membershipId: m.id,
      fullName: m.fullName,
      lateMonthsCount: lateMonthsByMembership.get(m.id) ?? 0,
      amountDue: m.amountDue,
      email: m.email,
      emailIsPlaceholder: m.emailIsPlaceholder,
    }))
    .sort((a, b) => b.amountDue - a.amountDue)
}

/**
 * Gabarit synthèse déterministe. Variantes : 0 / 1 / N retards.
 * Retourne un objet { recoveryRate, lateCount, lateAmount, topMemberName, topMemberAmount }
 * pour permettre l'i18n côté UI (la traduction se fait dans le composant, pas ici).
 */
export function buildSyntheseParams(
  clubStats: ClubCotisationsStats,
  regulariserList: RegulariserMember[]
): SyntheseParams {
  const top = regulariserList.length > 0 ? regulariserList[0] : null
  return {
    recoveryRate: clubStats.recoveryRate,
    lateCount: clubStats.lateCount,
    lateAmount: clubStats.lateAmount,
    topMemberName: top?.fullName ?? null,
    topMemberAmount: top?.amountDue ?? null,
  }
}

/**
 * Gabarit de message de relance déterministe (v1).
 * Retourne le message texte complet (éditable dans la modale).
 */
export function buildRelanceMessage(params: {
  memberName: string
  lateMonthLabels: string[]
  amountDue: number
  currency: string
}): string {
  const { memberName, lateMonthLabels, amountDue, currency } = params
  const formattedAmount = formatCurrency(amountDue, currency)

  const monthsLine =
    lateMonthLabels.length > 0
      ? `Mois concernés : ${lateMonthLabels.join(', ')}.`
      : 'Aucun mois spécifié.'

  return [
    `Bonjour ${memberName},`,
    '',
    `Nous vous rappelons que votre cotisation au club présente un solde impayé.`,
    '',
    monthsLine,
    `Montant total dû : ${formattedAmount}`,
    '',
    `Merci de régulariser votre situation dans les meilleurs délais.`,
    '',
    `Cordialement,`,
    `L'équipe du club`,
  ].join('\n')
}

// ─── Helpers DB (session + RLS treasurer) ───────────────────────────────────

/**
 * Résout le contexte staff du user courant, **scopé au club actif** quand il est fourni.
 *
 * - `activeClubId` fourni (cookie `evolve_active_club`) → on ne renvoie un contexte QUE si
 *   l'utilisateur est trésorier+ DANS CE club. S'il y est simple membre → `null` (pas de
 *   retombée sur un autre club : on respecte le club choisi par le ClubSwitcher).
 * - `activeClubId` absent (pas de cookie) → comportement V0 : club staff le plus récent.
 *
 * Sans ce scoping, un membre président d'un club A et simple membre d'un club B continuait
 * de voir les surfaces admin du club A après avoir basculé sur B (cookie ignoré). Réf bug
 * « ClubSwitcher : les vues role-aware ne changent pas au switch ».
 */
export async function resolveAdminContext(
  supabase: ServerClient,
  userId: string,
  activeClubId?: string | null
): Promise<AdminContext | null> {
  let query = supabase
    .from('memberships')
    .select('club_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', STAFF_ROLES as unknown as string[])
  // Scope au club actif : le rôle suit le club sélectionné, pas le plus récent.
  if (activeClubId) query = query.eq('club_id', activeClubId)

  const { data: m } = await query
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
        'id, user_id, role, role_source, is_active, joined_at, status, leave_at, access_status, users!memberships_user_id_fkey!inner(full_name, email, email_is_placeholder)'
      )
      .eq('club_id', clubId)
      .returns<
        {
          id: string
          user_id: string
          role: MemberRole
          role_source: string
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
      // Garde-fou : toute valeur DB inattendue retombe sur 'sheet' (comportement historique).
      roleSource: m.role_source === 'manual' ? 'manual' : 'sheet',
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
  const now = new Date()
  const currentYear = now.getFullYear()
  // Indice ordinal du mois courant pour la dérivation des variantes (mois futurs → `future`).
  // Vue club agrégée → pas d'adhésion individuelle, donc joinedAtYM = null (pas de `not_applicable`).
  const nowYM = currentYear * 12 + now.getMonth()
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
    // joinedAtYM = null (vue club) ; tooltips en défauts FR (pas d'i18n côté admin pour l'instant).
    years: buildTimelineYears(aggregateMonthsByPeriod(months), null, nowYM),
    // Stats = tous les versements individuels (total/nombre/moyenne du club).
    stats: computeContribStats(months.map((m) => m.amount)),
  }
}

// ─── Nouvelles fonctions DB cotisations V2 ───────────────────────────────────

/**
 * Récupère les mois bruts du club (avec membership_id) bornés à l'année courante.
 * Utilisée pour computeRecoveryRate, computeEncaisse et le comptage late par membre.
 * RLS treasurer.
 */
export async function getClubRawMonths(
  supabase: ServerClient,
  clubId: string
): Promise<
  Array<{ membership_id: string; amount: number; status: MonthStatus; year: number; month: number }>
> {
  const currentYear = new Date().getFullYear()
  const { data, error } = await supabase
    .from('contribution_months')
    .select('membership_id, amount, status, year, month')
    .eq('club_id', clubId)
    .lte('year', currentYear)
    .returns<
      {
        membership_id: string
        amount: number | null
        status: MonthStatus
        year: number
        month: number
      }[]
    >()
  if (error) throw error
  return (data ?? []).map((r) => ({
    membership_id: r.membership_id,
    amount: Number(r.amount ?? 0),
    status: r.status,
    year: r.year,
    month: r.month,
  }))
}

/**
 * Données de cotisation d'un membre spécifique pour la vue trésorier.
 * Utilisée par l'API route (mode membre). RLS treasurer.
 * Retourne null si le membership n'appartient pas au club.
 */
export async function getMemberCotisationsForAdmin(
  supabase: ServerClient,
  clubId: string,
  membershipId: string
): Promise<MemberCotisationsData | null> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const nowYM = currentYear * 12 + now.getMonth()

  // Parallélise les trois requêtes indépendantes.
  const [membershipRes, contribRes, monthsRes] = await Promise.all([
    supabase
      .from('memberships')
      .select(
        'id, joined_at, users!memberships_user_id_fkey!inner(full_name, email, email_is_placeholder)'
      )
      .eq('id', membershipId)
      .eq('club_id', clubId)
      .maybeSingle<{
        id: string
        joined_at: string | null
        users: { full_name: string; email: string; email_is_placeholder: boolean }
      }>(),
    supabase
      .from('contributions')
      .select('status, amount_due, net_market_value')
      .eq('membership_id', membershipId)
      .eq('club_id', clubId)
      .maybeSingle<{
        status: ContributionStatus
        amount_due: number | null
        net_market_value: number | null
      }>(),
    supabase
      .from('contribution_months')
      .select('year, month, amount, status, paid_at')
      .eq('membership_id', membershipId)
      .eq('club_id', clubId)
      .lte('year', currentYear)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .returns<
        {
          year: number
          month: number
          amount: number | null
          status: MonthStatus
          paid_at: string | null
        }[]
      >(),
  ])

  if (membershipRes.error) throw membershipRes.error
  if (contribRes.error) throw contribRes.error
  if (monthsRes.error) throw monthsRes.error

  // Membership introuvable dans ce club → null.
  if (!membershipRes.data) return null

  const membership = membershipRes.data
  const contrib = contribRes.data
  const joinedAtYM = joinedAtToYM(membership.joined_at)

  const months: MonthInput[] = (monthsRes.data ?? []).map((r) => ({
    year: r.year,
    month: r.month,
    amount: Number(r.amount ?? 0),
    status: r.status,
    paidAt: r.paid_at,
  }))

  // Statut dérivé (fallback si colonne feuille illisible).
  const sheetStatus: ContributionStatus = contrib?.status ?? 'pending'
  const status = deriveContributionStatus(sheetStatus, months, joinedAtYM, nowYM)

  // Montant dû : donnée source prime, sinon dérivé (minContribution=0 → 0 si absent).
  const amountDue = deriveAmountDue(Number(contrib?.amount_due ?? 0), months, joinedAtYM, nowYM, 0)

  // Mois en retard exploitables (post-adhésion, ≤ mois courant).
  const lateMonths: LateMonth[] = months
    .filter((m) => {
      if (m.status !== 'late') return false
      const ym = m.year * 12 + (m.month - 1)
      if (joinedAtYM != null && ym < joinedAtYM) return false
      if (ym > nowYM) return false
      return true
    })
    .map((m) => ({ year: m.year, month: m.month, amount: m.amount }))

  // Taux de recouvrement du membre (sur ses propres mois).
  const recoveryRate = computeRecoveryRate(months)

  // Frise des années (même logique que la vue membre).
  const years = buildTimelineYears(months, joinedAtYM, nowYM)

  return {
    fullName: membership.users.full_name,
    joinedAt: membership.joined_at,
    status,
    recoveryRate,
    amountDue,
    netMarketValue: contrib?.net_market_value != null ? Number(contrib.net_market_value) : null,
    lateMonths,
    years,
    email: membership.users.email,
    emailIsPlaceholder: membership.users.email_is_placeholder,
  }
}
