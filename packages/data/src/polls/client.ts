import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../supabase/types.gen.ts'
import { mapPollResults } from './mappers/pollResults.mapper.ts'
import type { PollResults, PollResultsDTO } from './types.ts'

/**
 * Client Vote anonyme — fines enveloppes typées autour des 3 RPC SECURITY DEFINER (migration 038).
 * À utiliser depuis `apps/web` (Server Action / RSC) avec un client Supabase authentifié
 * (createServerClient / createBrowserClient). Aucune lecture directe de `poll_responses` :
 * l'anonymat est garanti côté DB (REVOKE SELECT), seules les RPC exposent des agrégats.
 *
 * Convention d'erreur : on relaie le `message` de l'erreur Postgres remontée par PostgREST
 * (ex. « vote deja enregistre », « resultats disponibles a la cloture ») dans un `throw`.
 */

type Db = Database

/** Le membre courant a-t-il déjà voté à ce vote ? (sans voir sa propre réponse). */
export async function hasVoted(supabase: SupabaseClient<Db>, pollId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_voted', { p_poll_id: pollId })
  if (error) throw new Error(error.message)
  return data === true
}

/**
 * Soumet la réponse du membre courant. `selectedOptions` pour yes_no/single/multiple,
 * `textResponse` pour short_text. Retourne l'id de la réponse créée.
 * Échoue (throw) si : vote non ouvert, non-membre, ou déjà voté (UNIQUE).
 */
export async function submitVote(
  supabase: SupabaseClient<Db>,
  args: {
    pollId: string
    selectedOptions?: string[] | null
    textResponse?: string | null
  }
): Promise<string> {
  const { data, error } = await supabase.rpc('submit_vote', {
    p_poll_id: args.pollId,
    p_selected_options: args.selectedOptions ?? undefined,
    p_text_response: args.textResponse ?? undefined,
  })
  if (error) throw new Error(error.message)
  if (typeof data !== 'string') {
    throw new Error('submit_vote: réponse inattendue (id manquant)')
  }
  return data
}

/**
 * Récupère les résultats agrégés (anonymes) d'un vote. Échoue si les résultats ne sont
 * pas encore visibles (after_close + vote non clôturé) ou si l'appelant n'est pas membre.
 */
export async function getPollResults(
  supabase: SupabaseClient<Db>,
  pollId: string
): Promise<PollResults> {
  const { data, error } = await supabase.rpc('get_poll_results', { p_poll_id: pollId })
  if (error) throw new Error(error.message)
  // La RPC renvoie un `Json` ; on le traite comme PollResultsDTO et on délègue la
  // normalisation/typage strict au mapper.
  return mapPollResults((data ?? {}) as unknown as PollResultsDTO)
}

// Réexport utilitaire pour les consommateurs qui veulent le mapper seul (tests).
export { mapPollResults }
export type { Json }
