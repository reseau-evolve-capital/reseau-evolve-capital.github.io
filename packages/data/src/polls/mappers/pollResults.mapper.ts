import type { PollOptionResult, PollQuestionType, PollResults, PollResultsDTO } from '../types.ts'

const QUESTION_TYPES: readonly PollQuestionType[] = [
  'yes_no',
  'single_choice',
  'multiple_choice',
  'short_text',
]

function isQuestionType(v: string | null): v is PollQuestionType {
  return v != null && (QUESTION_TYPES as readonly string[]).includes(v)
}

/**
 * Mappe le retour brut de la RPC `get_poll_results` (jsonb) vers `PollResults` métier.
 *
 * Tolérant aux valeurs sales (CLAUDE.md : jamais de NaN/undefined à l'écran) :
 *   - options/text_responses null → tableaux vides ;
 *   - une option sans label → ignorée ;
 *   - count/pct null → 0.
 *
 * GARANTIE ANONYMAT : le DTO source ne contient aucun `user_id` (la RPC SECURITY DEFINER
 * ne le renvoie jamais) ; ce mapper ne fait que normaliser des agrégats et des textes
 * non attribués.
 */
export function mapPollResults(dto: PollResultsDTO): PollResults {
  const options: PollOptionResult[] = (dto.options ?? [])
    .filter(
      (o): o is { option: string; count: number | null; pct: number | null } =>
        o != null && typeof o.option === 'string' && o.option.length > 0
    )
    .map((o) => ({
      option: o.option,
      count: o.count ?? 0,
      pct: o.pct ?? 0,
    }))

  const textResponses: string[] = (dto.text_responses ?? []).filter(
    (t): t is string => typeof t === 'string' && t.length > 0
  )

  return {
    pollId: dto.poll_id ?? '',
    questionType: isQuestionType(dto.question_type) ? dto.question_type : 'single_choice',
    totalResponses: dto.total_responses ?? 0,
    eligibleMembers: dto.eligible_members ?? 0,
    options,
    textResponses,
  }
}
