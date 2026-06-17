// Tests Deno du parser d'allowlist (PUSH-001 mode test).
//   deno test --no-check --allow-all supabase/functions/_shared/notify-allowlist.test.ts

import { assertEquals } from 'jsr:@std/assert@^1'

import { parseAllowlist } from './notify-allowlist.ts'

Deno.test('vide / absente → [] (comportement normal : aucun filtre)', () => {
  assertEquals(parseAllowlist(undefined), [])
  assertEquals(parseAllowlist(null), [])
  assertEquals(parseAllowlist(''), [])
  assertEquals(parseAllowlist('   '), [])
  assertEquals(parseAllowlist(',, ,'), [])
})

Deno.test('split + trim + minuscule + drop vides', () => {
  assertEquals(parseAllowlist('a@x.com'), ['a@x.com'])
  assertEquals(parseAllowlist('A@X.com, B@Y.com ,, c@z.com '), ['a@x.com', 'b@y.com', 'c@z.com'])
  assertEquals(parseAllowlist('  Moi@Test.FR  '), ['moi@test.fr'])
})
