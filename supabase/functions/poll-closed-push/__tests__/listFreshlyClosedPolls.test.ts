// Test Deno THIN de `poll-closed-push` — la logique de DÉDUP (gotcha de timing §8.3).
//
// EXÉCUTION
//   deno test --no-check --allow-all --config supabase/functions/poll-closed-push/deno.json \
//     supabase/functions/poll-closed-push/__tests__/
//
// On stubbe un client PostgREST chaînable minimal : `from('polls')…` renvoie deux polls
// clôturés, `from('push_delivery_log')…` renvoie une entrée 'poll.closed' pour l'un d'eux.
// On vérifie que listFreshlyClosedPolls EXCLUT le poll déjà poussé (anti double-push, couvre
// aussi la clôture manuelle ayant déjà dispatché).

import { assertEquals } from 'jsr:@std/assert@^1'

import { listFreshlyClosedPolls } from '../index.ts'

// Client chaînable minimal : chaque méthode de filtre renvoie `this` ; `await` résout `result`.
function makeQuery(result: { data: unknown; error: null }) {
  const q: Record<string, unknown> = {}
  const passthrough = () => q
  for (const m of ['select', 'eq', 'not', 'lt', 'gte', 'lte', 'in']) {
    q[m] = passthrough
  }
  // thenable → `await q` résout `result`.
  q.then = (resolve: (v: unknown) => unknown) => resolve(result)
  return q
}

Deno.test(
  'listFreshlyClosedPolls : exclut un poll déjà poussé (dédup push_delivery_log)',
  async () => {
    const polls = [
      {
        id: 'p1',
        club_id: 'clubA',
        title: 'A',
        closes_at: '2026-06-01T00:00:00Z',
        closed_manually_at: '2026-06-01T00:05:00Z',
      },
      {
        id: 'p2',
        club_id: 'clubA',
        title: 'B',
        closes_at: '2026-06-02T00:00:00Z',
        closed_manually_at: '2026-06-02T00:05:00Z',
      },
    ]
    // push_delivery_log a déjà une entrée 'poll.closed' pour p1 → p1 exclu.
    const log = [{ poll_id: 'p1' }]

    const supabase = {
      from(table: string) {
        if (table === 'polls') return makeQuery({ data: polls, error: null })
        if (table === 'push_delivery_log') return makeQuery({ data: log, error: null })
        return makeQuery({ data: [], error: null })
      },
      // deno-lint-ignore no-explicit-any
    } as any

    const fresh = await listFreshlyClosedPolls(supabase)

    // Seul p2 reste (p1 déjà poussé).
    assertEquals(
      fresh.map((p) => p.id),
      ['p2']
    )
    assertEquals(fresh[0].club_id, 'clubA')
  }
)

Deno.test(
  'listFreshlyClosedPolls : aucun poll clôturé → liste vide (pas de requête log)',
  async () => {
    const supabase = {
      from(table: string) {
        if (table === 'polls') return makeQuery({ data: [], error: null })
        return makeQuery({ data: [], error: null })
      },
      // deno-lint-ignore no-explicit-any
    } as any

    const fresh = await listFreshlyClosedPolls(supabase)
    assertEquals(fresh, [])
  }
)
