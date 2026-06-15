// Types Vote anonyme V0 (migration 038 ; spec docs/superpowers/specs/2026-06-13-vote-anonyme-design.md).
//
// Pattern DTO strict du projet : la RPC `get_poll_results` renvoie un `jsonb` (typé `Json`
// dans types.gen.ts). On définit ici le DTO BRUT renvoyé par l'agrégateur SQL (champs tels
// quels), et le mapper (mappers/pollResults.mapper.ts) produit le type métier `PollResults`
// strictement typé. Un changement de structure du jsonb ne touche que le mapper.

/** Type de question d'un vote (CHECK polls.question_type). */
export type PollQuestionType = 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'

/** Visibilité des résultats (CHECK polls.results_visibility). */
export type PollResultsVisibility = 'after_close' | 'live'

/** Cycle de vie d'un vote (CHECK polls.status). */
export type PollStatus = 'draft' | 'open' | 'closed'

/** Option d'un vote single/multiple (colonne polls.options : jsonb [{id,label}]). */
export interface PollOption {
  id: string
  label: string
}

// ── DTO bruts (sortie SQL de get_poll_results, avant mapping) ─────────────────

/** Agrégat brut d'une option tel que renvoyé par get_poll_results.options[]. */
export interface PollOptionResultDTO {
  option: string | null
  count: number | null
  pct: number | null
}

/** Retour brut de la RPC get_poll_results (jsonb). Champs tels quels, défensifs. */
export interface PollResultsDTO {
  poll_id: string | null
  question_type: string | null
  total_responses: number | null
  /** Membres actifs du club (dénominateur de participation). Calculé SECURITY DEFINER. */
  eligible_members: number | null
  options: PollOptionResultDTO[] | null
  text_responses: (string | null)[] | null
}

// ── Types métier (sortie des mappers) ─────────────────────────────────────────

/** Agrégat d'une option, normalisé. `pct` ∈ [0,100]. */
export interface PollOptionResult {
  option: string
  count: number
  pct: number
}

/**
 * Résultats agrégés d'un vote — ANONYMES par construction : aucun `user_id`.
 * `textResponses` : réponses libres sans attribution (short_text).
 */
export interface PollResults {
  pollId: string
  questionType: PollQuestionType
  totalResponses: number
  /** Membres actifs du club = dénominateur « X/Y membres ont voté ». */
  eligibleMembers: number
  options: PollOptionResult[]
  textResponses: string[]
}
