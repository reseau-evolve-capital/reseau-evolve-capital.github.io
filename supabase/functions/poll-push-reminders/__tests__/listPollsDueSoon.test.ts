// Test Deno THIN de `poll-push-reminders` — la sélection des polls échéant sous 24 h.
//
// EXÉCUTION
//   deno test --no-check --allow-all --config supabase/functions/poll-push-reminders/deno.json \
//     supabase/functions/poll-push-reminders/__tests__/
//
// On stubbe un client PostgREST chaînable minimal et on vérifie que listPollsDueSoon
// retourne les polls normalisés ({id, club_id, title, closes_at}) issus de la requête
// (status='open' + fenêtre [now, now+24h] appliquée côté DB ; ici on valide le mapping).

import { assertEquals } from 'jsr:@std/assert@^1'

import { listPollsDueSoon } from '../index.ts'

function makeQuery(result: { data: unknown; error: null }) {
  const q: Record<string, unknown> = {}
  const passthrough = () => q
  for (const m of ['select', 'eq', 'not', 'gte', 'lte']) {
    q[m] = passthrough
  }
  q.then = (resolve: (v: unknown) => unknown) => resolve(result)
  return q
}

Deno.test('listPollsDueSoon : normalise les polls éligibles au rappel J-1', async () => {
  const rows = [
    { id: 'p1', club_id: 'clubA', title: 'Vote 1', closes_at: '2026-06-17T00:00:00Z' },
    { id: 'p2', club_id: 'clubB', title: 'Vote 2', closes_at: '2026-06-17T06:00:00Z' },
  ]
  const supabase = {
    from() {
      return makeQuery({ data: rows, error: null })
    },
    // deno-lint-ignore no-explicit-any
  } as any

  const due = await listPollsDueSoon(supabase)
  assertEquals(
    due.map((p) => p.id),
    ['p1', 'p2']
  )
  assertEquals(due[0].club_id, 'clubA')
  assertEquals(due[1].title, 'Vote 2')
})

Deno.test('listPollsDueSoon : aucun poll éligible → liste vide', async () => {
  const supabase = {
    from() {
      return makeQuery({ data: [], error: null })
    },
    // deno-lint-ignore no-explicit-any
  } as any

  assertEquals(await listPollsDueSoon(supabase), [])
})
