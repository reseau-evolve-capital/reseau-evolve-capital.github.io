// Couche data de la console feedbacks RÉSEAU (NET-019, écran /reseau/retours).
//
// Le membre réseau (network_admin / network_board) lit TOUS les feedbacks via la policy RLS
// « feedback: network read all » (migration 051). On lit donc `feedback` directement sous la
// session (RLS appliquée) — JAMAIS de service-role. La liste des clubs (pour le filtre + le
// libellé « Club » par ligne + les barres « Volume par club ») vient du RPC `network_list_clubs()`
// (gardé is_network_member, migration 043), déjà utilisé par /reseau/clubs.
//
// RGPD (cf. prompt design) : on n'expose JAMAIS de montant/quote-part dans cet écran ; l'auteur
// est réduit à un prénom/initiale dérivé de l'email (la table `users` n'est lisible qu'intra-club
// — la dérivation depuis `feedback.user_email` évite tout trou RLS cross-club).
//
// Réf : lib/data/network.ts (modèle), migration 036/051 (feedback + RLS), CLAUDE.md (RLS, jamais
//   service-role, formatage via @evolve/utils, jamais NaN/undefined à l'écran).

import type { createServerClient, Database } from '@evolve/data'

type ServerClient = ReturnType<typeof createServerClient>
type FeedbackRow = Database['public']['Tables']['feedback']['Row']
type NetworkListClubsRow = Database['public']['Functions']['network_list_clubs']['Returns'][number]

// ─────────────────────────────────────────────────────────────────────────────
// Types métier (déjà mappés/normalisés pour l'UI).
// ─────────────────────────────────────────────────────────────────────────────

export type FeedbackType = 'bug' | 'feature' | 'question'
export type FeedbackSeverity = 'blocking' | 'annoying' | 'minor'
export type FeedbackStatus = 'received' | 'in_progress' | 'done' | 'closed'

/** Statuts valides — source unique (réutilisée par la Server Action de changement de statut). */
export const FEEDBACK_STATUSES: readonly FeedbackStatus[] = [
  'received',
  'in_progress',
  'done',
  'closed',
] as const

const TYPES: readonly FeedbackType[] = ['bug', 'feature', 'question'] as const
const SEVERITIES: readonly FeedbackSeverity[] = ['blocking', 'annoying', 'minor'] as const

/** Une ligne de feedback normalisée pour la console (réseau & club). */
export interface FeedbackItem {
  id: string
  createdAt: string
  type: FeedbackType
  /** Sévérité IA (bugs) — null si non triée ou non-bug. */
  severity: FeedbackSeverity | null
  status: FeedbackStatus
  /** Titre IA court (fallback : 1ʳᵉ ligne du message, jamais vide → « — » côté UI si absent). */
  aiTitle: string | null
  /** Diagnostic IA (slide-over). */
  aiSummary: string | null
  /** Catégorie IA (donut). Null → bucket « autre ». */
  aiCategory: string | null
  message: string
  /** URLs signées des captures (badge 📎 + galerie slide-over). */
  screenshotUrls: string[]
  pageRoute: string
  userAgent: string | null
  /** Prénom/initiale dérivé de l'email (RGPD : jamais de nom complet cross-club). */
  authorName: string
  /** Club rattaché (null pour les feedbacks antérieurs à la migration 051). */
  clubId: string | null
  /** Nom du club (résolu via network_list_clubs). Null si club_id null ou club introuvable. */
  clubName: string | null
  githubIssueUrl: string | null
  notionPageId: string | null
}

/** Un club listé pour le filtre « Club » de la console réseau. */
export interface FeedbackClubOption {
  id: string
  name: string
}

/** KPIs du bandeau (période en cours, calculés côté serveur). */
export interface FeedbackKpis {
  /** Volume total de la période. */
  total: number
  /** Nombre de bugs. */
  bugs: number
  /** Nombre de bugs « bloquants » (sévérité blocking). */
  blockingBugs: number
  /** Nombre d'idées (feature). */
  ideas: number
  /** Taux de traitement = (done + closed) / total, fraction 0..1. Null si total = 0. */
  treatmentRate: number | null
}

/** Une part du donut « Par catégorie » (compteur par catégorie IA). */
export interface FeedbackCategorySlice {
  category: string
  count: number
}

/** Une barre « Volume par club » (top clubs). */
export interface FeedbackClubVolume {
  clubId: string | null
  clubName: string
  count: number
}

/** Une barre « Volume par semaine » (console club ADM-009). */
export interface FeedbackWeekVolume {
  /** Clé ISO triable « YYYY-Www » (ex. « 2026-W24 »). */
  weekKey: string
  /** Libellé court affiché (« S24 ») — déterministe, indépendant de la locale. */
  label: string
  count: number
}

/** Payload complet de la console réseau. */
export interface NetworkFeedbackPayload {
  items: FeedbackItem[]
  clubs: FeedbackClubOption[]
  kpis: FeedbackKpis
  byCategory: FeedbackCategorySlice[]
  byClub: FeedbackClubVolume[]
}

/**
 * Payload de la console feedbacks CLUB (ADM-009, /admin/retours), scopée à un seul club.
 * Pas de liste de clubs ni d'agrégat par club : la dataviz secondaire est « Volume par semaine ».
 */
export interface ClubFeedbackPayload {
  items: FeedbackItem[]
  kpis: FeedbackKpis
  byCategory: FeedbackCategorySlice[]
  byWeek: FeedbackWeekVolume[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Mappers & dérivations pures (exportées pour test).
// ─────────────────────────────────────────────────────────────────────────────

const isType = (v: string | null): v is FeedbackType => TYPES.includes(v as FeedbackType)
const isSeverity = (v: string | null): v is FeedbackSeverity =>
  SEVERITIES.includes(v as FeedbackSeverity)
const isStatus = (v: string | null): v is FeedbackStatus =>
  FEEDBACK_STATUSES.includes(v as FeedbackStatus)

/**
 * Prénom/initiale lisible dérivé de l'email (RGPD). `lea.martin@club.fr` → « Lea ».
 * Fallback « Membre » si l'email est vide/illisible (jamais de chaîne vide à l'écran).
 */
export function deriveAuthorName(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return 'Membre'
  const local = email.split('@')[0] ?? ''
  const first = local.split(/[.\-_+]/)[0] ?? ''
  if (!first) return 'Membre'
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

/** Mappe une ligne brute `feedback` + l'index des clubs → FeedbackItem normalisé. */
export function mapFeedbackRow(row: FeedbackRow, clubNameById: Map<string, string>): FeedbackItem {
  const clubId = row.club_id ?? null
  return {
    id: row.id,
    createdAt: row.created_at,
    type: isType(row.type) ? row.type : 'question',
    severity: isSeverity(row.ai_severity) ? row.ai_severity : null,
    status: isStatus(row.status) ? row.status : 'received',
    aiTitle: row.ai_title?.trim() ? row.ai_title.trim() : null,
    aiSummary: row.ai_summary?.trim() ? row.ai_summary.trim() : null,
    aiCategory: row.ai_category?.trim() ? row.ai_category.trim() : null,
    message: row.message,
    screenshotUrls: Array.isArray(row.screenshot_urls) ? row.screenshot_urls : [],
    pageRoute: row.page_route,
    userAgent: row.user_agent,
    authorName: deriveAuthorName(row.user_email),
    clubId,
    clubName: clubId ? (clubNameById.get(clubId) ?? null) : null,
    githubIssueUrl: row.github_issue_url,
    notionPageId: row.notion_page_id,
  }
}

/** Calcule les KPIs du bandeau depuis les items déjà mappés (filtrés période). */
export function deriveFeedbackKpis(items: FeedbackItem[]): FeedbackKpis {
  const total = items.length
  const bugs = items.filter((i) => i.type === 'bug').length
  const blockingBugs = items.filter((i) => i.type === 'bug' && i.severity === 'blocking').length
  const ideas = items.filter((i) => i.type === 'feature').length
  const treated = items.filter((i) => i.status === 'done' || i.status === 'closed').length
  return {
    total,
    bugs,
    blockingBugs,
    ideas,
    treatmentRate: total === 0 ? null : treated / total,
  }
}

/** Libellé du bucket « autre » (catégorie IA absente). Source unique (UI = i18n). */
export const OTHER_CATEGORY_KEY = '__other__'

/** Agrège le volume par catégorie IA (bucket « autre » pour les catégories absentes). */
export function deriveByCategory(items: FeedbackItem[]): FeedbackCategorySlice[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = item.aiCategory ?? OTHER_CATEGORY_KEY
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

/** Libellé du bucket « sans club » (feedbacks antérieurs à la migration 051). */
export const NO_CLUB_KEY = '__no_club__'

/**
 * Agrège le volume par club (top N). Les feedbacks sans club (`club_id` null) sont regroupés
 * sous un bucket dédié `NO_CLUB_KEY` (clubId null), rendu en dernier si présent.
 */
export function deriveByClub(items: FeedbackItem[], topN = 5): FeedbackClubVolume[] {
  const counts = new Map<string, { clubId: string | null; clubName: string; count: number }>()
  for (const item of items) {
    const key = item.clubId ?? NO_CLUB_KEY
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, {
        clubId: item.clubId,
        clubName: item.clubName ?? NO_CLUB_KEY,
        count: 1,
      })
    }
  }
  return [...counts.values()]
    .sort((a, b) => {
      // Le bucket « sans club » est toujours relégué en dernier.
      if (a.clubId === null) return 1
      if (b.clubId === null) return -1
      return b.count - a.count
    })
    .slice(0, topN)
}

/**
 * Numéro de semaine ISO-8601 (1..53) + année ISO associée d'une date. ISO : la semaine 1 est
 * celle qui contient le 1ᵉʳ jeudi de l'année ; les semaines commencent le lundi. Pur et
 * déterministe (UTC) — testable. Réf : algorithme ISO-week standard.
 */
export function isoWeek(date: Date): { isoYear: number; isoWeek: number } {
  // Copie en UTC pour éviter les décalages de fuseau.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Jour ISO : lundi = 1 … dimanche = 7.
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  // Décale au jeudi de la semaine courante (le jeudi détermine l'année ISO).
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const isoYear = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { isoYear, isoWeek: week }
}

/**
 * Agrège le volume par semaine ISO (console club). Retourne les `lastN` dernières semaines
 * RÉELLEMENT présentes dans les données, triées chronologiquement (ancienne → récente) pour un
 * rendu en barres lisible. Les items hors période ont déjà été bornés en amont (requête `since`).
 */
export function deriveByWeek(items: FeedbackItem[], lastN = 8): FeedbackWeekVolume[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const d = new Date(item.createdAt)
    if (isNaN(d.getTime())) continue
    const { isoYear, isoWeek: w } = isoWeek(d)
    const weekKey = `${isoYear}-W${String(w).padStart(2, '0')}`
    counts.set(weekKey, (counts.get(weekKey) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([weekKey, count]) => ({
      weekKey,
      // Libellé court déterministe « Sxx » (sans dépendre de la locale) — cohérent maquette écran 02.
      label: `S${weekKey.slice(weekKey.indexOf('W') + 1)}`,
      count,
    }))
    .sort((a, b) => (a.weekKey < b.weekKey ? -1 : a.weekKey > b.weekKey ? 1 : 0))
    .slice(-lastN)
}

/** Critères de filtrage de la console (tous optionnels — `all`/vide = pas de contrainte). */
export interface FeedbackFilters {
  type: FeedbackType | 'all'
  severity: FeedbackSeverity | 'all'
  status: FeedbackStatus | 'all'
  /** id de club, ou 'all'. */
  club: string
  /** Recherche libre (titre IA / message / auteur / club). */
  search: string
}

/**
 * Filtre pur des items selon les critères (exporté pour test). La recherche est insensible à la
 * casse et porte sur titre IA + message + auteur + nom de club.
 */
export function filterFeedback(items: FeedbackItem[], f: FeedbackFilters): FeedbackItem[] {
  const q = f.search.trim().toLowerCase()
  return items.filter((i) => {
    if (f.type !== 'all' && i.type !== f.type) return false
    if (f.severity !== 'all' && i.severity !== f.severity) return false
    if (f.status !== 'all' && i.status !== f.status) return false
    if (f.club !== 'all' && (i.clubId ?? '') !== f.club) return false
    if (q) {
      const hay =
        `${i.aiTitle ?? ''} ${i.message} ${i.authorName} ${i.clubName ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecture serveur (RLS de session, jamais service-role).
// ─────────────────────────────────────────────────────────────────────────────

/** Limite de lecture : on charge la console avec une borne raisonnable (anti-OOM). */
const FEEDBACK_READ_LIMIT = 1000

/**
 * Charge la console feedbacks RÉSEAU : tous les feedbacks lisibles sous la RLS (membre réseau →
 * tout), enrichis du nom de club, + la liste des clubs (filtre) + KPIs + dataviz pré-agrégés.
 *
 * `sinceIso` borne la période (created_at >= sinceIso). `null` = « Tout ».
 */
export async function getNetworkFeedback(
  supabase: ServerClient,
  sinceIso: string | null = null
): Promise<NetworkFeedbackPayload> {
  // Index des clubs (nom par id) + options de filtre — via RPC gardé is_network_member.
  const { data: clubsData, error: clubsError } = await supabase.rpc('network_list_clubs')
  if (clubsError) throw clubsError
  const clubRows = (clubsData ?? []) as NetworkListClubsRow[]
  const clubNameById = new Map<string, string>(clubRows.map((c) => [c.id, c.name]))
  const clubs: FeedbackClubOption[] = clubRows
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  let query = supabase
    .from('feedback')
    .select(
      'id, created_at, type, ai_severity, status, ai_title, ai_summary, ai_category, message, screenshot_urls, page_route, user_agent, user_email, club_id, github_issue_url, notion_page_id'
    )
    .order('created_at', { ascending: false })
    .limit(FEEDBACK_READ_LIMIT)
  if (sinceIso) query = query.gte('created_at', sinceIso)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as FeedbackRow[]
  const items = rows.map((r) => mapFeedbackRow(r, clubNameById))

  return {
    items,
    clubs,
    kpis: deriveFeedbackKpis(items),
    byCategory: deriveByCategory(items),
    byClub: deriveByClub(items),
  }
}

/**
 * Charge la console feedbacks CLUB (ADM-009 : bureau de club, /admin/retours) scopée à `clubId`.
 *
 * Double scoping en défense :
 *   - RLS « feedback: club staff read » (migration 051) : le staff ne voit déjà QUE les feedbacks
 *     de ses clubs où il est staff. Aucun service-role.
 *   - filtre explicite `.eq('club_id', clubId)` : restreint au club ACTIF (un staff multi-club ne
 *     mélange pas ses clubs dans la console) et ne s'appuie pas sur la seule RLS pour le scoping UI.
 *
 * Pas d'enrichissement « nom de club » (mono-club) ni de liste de clubs ; la dataviz secondaire est
 * « Volume par semaine » au lieu de « par club ». `sinceIso` borne la période (null = « Tout »).
 */
export async function getClubFeedback(
  supabase: ServerClient,
  clubId: string,
  sinceIso: string | null = null
): Promise<ClubFeedbackPayload> {
  // Console mono-club : pas de résolution de nom de club par ligne (clubName reste null, non affiché).
  const emptyClubNames = new Map<string, string>()

  let query = supabase
    .from('feedback')
    .select(
      'id, created_at, type, ai_severity, status, ai_title, ai_summary, ai_category, message, screenshot_urls, page_route, user_agent, user_email, club_id, github_issue_url, notion_page_id'
    )
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(FEEDBACK_READ_LIMIT)
  if (sinceIso) query = query.gte('created_at', sinceIso)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as FeedbackRow[]
  const items = rows.map((r) => mapFeedbackRow(r, emptyClubNames))

  return {
    items,
    kpis: deriveFeedbackKpis(items),
    byCategory: deriveByCategory(items),
    byWeek: deriveByWeek(items),
  }
}
