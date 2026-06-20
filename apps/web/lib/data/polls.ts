// Couche data du module Vote anonyme (apps/web) — lectures serveur (RSC) via la RLS de la
// session courante. JAMAIS de service-role ici : la RLS `polls` (lecture membre des votes
// open/closed de son club, ALL pour le staff) s'applique. Les réponses individuelles ne sont
// JAMAIS lues directement (anonymat by-design) : seuls les agrégats passent par les RPC.
//
// `options` (jsonb) est typé `[{ id, label }]` par la spec §7 ; on le parse défensivement
// (jamais de crash si la structure dévie). Le client (page) consomme `PollSummary`.
//
// Réf : docs/superpowers/specs/2026-06-13-vote-anonyme-design.md §5/§7, CLAUDE.md (RLS).

import type { createServerClient, Database } from '@evolve/data'
import type { PollOption, PollQuestionType, PollResultsVisibility, PollStatus } from '@evolve/data'

type ServerClient = ReturnType<typeof createServerClient>
type PollRow = Database['public']['Tables']['polls']['Row']

/** Vote consolidé pour l'affichage (liste membre + admin). Tous champs normalisés. */
export interface PollSummary {
  id: string
  title: string
  description: string | null
  questionType: PollQuestionType
  options: PollOption[]
  resultsVisibility: PollResultsVisibility
  status: PollStatus
  closesAt: string | null
  closedManuallyAt: string | null
  createdAt: string
  notifyByEmail: boolean
}

const QUESTION_TYPES: readonly PollQuestionType[] = [
  'yes_no',
  'single_choice',
  'multiple_choice',
  'short_text',
]
const STATUSES: readonly PollStatus[] = ['draft', 'open', 'closed']
const VISIBILITIES: readonly PollResultsVisibility[] = ['after_close', 'live']

function asQuestionType(value: string): PollQuestionType {
  return (QUESTION_TYPES as readonly string[]).includes(value)
    ? (value as PollQuestionType)
    : 'single_choice'
}
function asStatus(value: string): PollStatus {
  return (STATUSES as readonly string[]).includes(value) ? (value as PollStatus) : 'draft'
}
function asVisibility(value: string): PollResultsVisibility {
  return (VISIBILITIES as readonly string[]).includes(value)
    ? (value as PollResultsVisibility)
    : 'after_close'
}

/** Parse défensif du jsonb `options` → [{id,label}]. Toute déviation → liste vide (jamais de crash). */
export function parsePollOptions(raw: unknown): PollOption[] {
  if (!Array.isArray(raw)) return []
  const out: PollOption[] = []
  for (const item of raw) {
    if (item && typeof item === 'object' && 'id' in item && 'label' in item) {
      const id = (item as { id: unknown }).id
      const label = (item as { label: unknown }).label
      if (typeof id === 'string' && typeof label === 'string') out.push({ id, label })
    }
  }
  return out
}

function toSummary(row: PollRow): PollSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    questionType: asQuestionType(row.question_type),
    options: parsePollOptions(row.options),
    resultsVisibility: asVisibility(row.results_visibility),
    status: asStatus(row.status),
    closesAt: row.closes_at,
    closedManuallyAt: row.closed_manually_at,
    createdAt: row.created_at,
    notifyByEmail: row.notify_by_email,
  }
}

const POLL_COLUMNS =
  'id, title, description, question_type, options, results_visibility, status, closes_at, closed_manually_at, created_at, notify_by_email'

/**
 * Votes visibles du club actif du membre (RLS membre : open + closed uniquement). Pour la page /votes.
 * `clubId` borne explicitement la requête au club actif — évite de croiser les votes
 * des autres clubs si le membre appartient à plusieurs.
 * Triés par date de création décroissante. Jamais throw — une erreur RLS/réseau remonte
 * (la page a un error.tsx) ; l'absence de données → [].
 */
export async function getMemberPolls(
  supabase: ServerClient,
  clubId: string
): Promise<PollSummary[]> {
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_COLUMNS)
    .eq('club_id', clubId)
    .in('status', ['open', 'closed'])
    .order('created_at', { ascending: false })
    .returns<PollRow[]>()
  if (error) throw error
  return (data ?? []).map(toSummary)
}

/** Un vote précis visible du membre (open/closed). null si introuvable / non visible. */
export async function getPollById(
  supabase: ServerClient,
  pollId: string
): Promise<PollSummary | null> {
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_COLUMNS)
    .eq('id', pollId)
    .maybeSingle<PollRow>()
  if (error) throw error
  return data ? toSummary(data) : null
}

/**
 * Tous les votes du club du staff (draft inclus — RLS staff ALL). Pour /admin/votes.
 * `clubId` borne explicitement la requête (un staff ne gère qu'un club en V0).
 */
export async function getAdminPolls(
  supabase: ServerClient,
  clubId: string
): Promise<PollSummary[]> {
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_COLUMNS)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .returns<PollRow[]>()
  if (error) throw error
  return (data ?? []).map(toSummary)
}

/** Un vote du club staff (draft inclus). null si introuvable / hors club. */
export async function getAdminPollById(
  supabase: ServerClient,
  clubId: string,
  pollId: string
): Promise<PollSummary | null> {
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_COLUMNS)
    .eq('club_id', clubId)
    .eq('id', pollId)
    .maybeSingle<PollRow>()
  if (error) throw error
  return data ? toSummary(data) : null
}

/**
 * Nombre de membres ACTIFS du club (dénominateur de participation « X/Y »). RLS membre.
 * Renvoie 0 si non lisible (jamais throw fatal pour un compteur d'affichage) : la
 * participation retombe alors sur « — » côté UI.
 */
export async function getActiveMemberCount(
  supabase: ServerClient,
  clubId: string
): Promise<number> {
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('is_active', true)
  return count ?? 0
}

/**
 * Le club du membre a-t-il au moins un vote open|closed visible ? (entrée menu avatar §5).
 * Une seule requête `head` (count) — pas de payload. false si rien (entrée masquée).
 */
export async function hasPollActivity(supabase: ServerClient): Promise<boolean> {
  const { count } = await supabase
    .from('polls')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'closed'])
  return (count ?? 0) > 0
}

/** Votes OUVERTS visibles du membre (pour les bannières dashboard). RLS membre. */
export async function getOpenPolls(supabase: ServerClient): Promise<PollSummary[]> {
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_COLUMNS)
    .eq('status', 'open')
    .order('closes_at', { ascending: true, nullsFirst: false })
    .returns<PollRow[]>()
  if (error) throw error
  return (data ?? []).map(toSummary)
}
