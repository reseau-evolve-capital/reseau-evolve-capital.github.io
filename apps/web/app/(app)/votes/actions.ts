'use server'

// Server Actions du module Vote anonyme — côté membre. Toutes passent par le client serveur
// (session + cookies) : ce sont les RPC SECURITY DEFINER (migration 037) qui appliquent les
// gardes DB (vote ouvert, membre actif du club, pas déjà voté via UNIQUE). JAMAIS de
// service-role ici. On relaie un code d'erreur métier stable que l'UI traduit (i18n).
//
// Réf : spec §6 (anonymat), CLAUDE.md (RLS, jamais service-role client).

import { cookies } from 'next/headers'
import { createServerClient, submitVote } from '@evolve/data'

async function serverClient() {
  return createServerClient(await cookies())
}

/** Résultat sans payload. `error` = code métier stable consommé par l'UI pour un message i18n. */
export type SubmitVoteResult = { ok: true } | { ok: false; error: string }

/** Mappe le message Postgres remonté par les RPC vers un code métier stable. */
function mapSubmitError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('deja') || m.includes('déjà') || m.includes('duplicate') || m.includes('unique'))
    return 'already_voted'
  if (m.includes('ouvert') || m.includes('open') || m.includes('clot') || m.includes('clôt'))
    return 'not_open'
  if (m.includes('membre') || m.includes('acces') || m.includes('accès') || m.includes('privilege'))
    return 'forbidden'
  return 'unknown'
}

/**
 * Soumet la réponse du membre courant. `selectedOptions` pour yes_no/single/multiple,
 * `textResponse` (≤ 280) pour short_text. Le tri/validation fin est fait côté DB (CHECK +
 * RPC) ; ici on garde-fou le format minimal et on relaie le code d'erreur métier.
 */
export async function submitVoteAction(input: {
  pollId: string
  selectedOptions?: string[] | null
  textResponse?: string | null
}): Promise<SubmitVoteResult> {
  if (!input.pollId) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const text = input.textResponse?.trim() ?? null
  if (text != null && text.length > 280) return { ok: false, error: 'too_long' }
  const options = input.selectedOptions?.length ? input.selectedOptions : null

  try {
    await submitVote(supabase, {
      pollId: input.pollId,
      selectedOptions: options,
      textResponse: text && text.length > 0 ? text : null,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: mapSubmitError(e instanceof Error ? e.message : 'unknown') }
  }
}
