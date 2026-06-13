// Tests Deno du handler PUR `feedback-dispatch` (Feedback Widget V0).
//
// EXÉCUTION (depuis la racine du repo) :
//     deno test --allow-env --allow-net \
//       supabase/functions/feedback-dispatch/__tests__/handler.test.ts
//   (ajouter --no-check si le type-check Deno bloque sur des préexistants — gotcha repo.)
//
// On teste la LOGIQUE PURE — aucun réseau réel : `fetch` et l'updater Supabase sont
// stubbés via les deps. Couvert :
//   1. buildPrompt : un prompt distinct par type, contraintes (sévérité bug, catégorie feature/question).
//   2. parseAiJson : extraction robuste (fences/texte autour), normalisation severity/category, clamp titre 80c.
//   3. dispatchFeedback : GitHub bug-only, résilience d'une branche en échec, flags reflètent les réussites.
import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1'

import { buildPrompt, parseAiJson, dispatchFeedback } from '../handler.ts'
import type { AiTriage, FeedbackDispatchDeps, FeedbackRecord, FeedbackUpdater } from '../handler.ts'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 'fb-1',
    user_id: 'u-1',
    user_email: 'membre@example.com',
    type: 'bug',
    message: 'Le bouton envoyer ne marche pas sur la page cotisations',
    screenshot_url: null,
    page_url: 'http://localhost:3001/contributions',
    page_route: '/contributions',
    user_agent: 'Mozilla/5.0 iPhone Safari',
    created_at: '2026-06-13T10:00:00.000Z',
    ...over,
  }
}

/** Réponse Anthropic minimale (bloc text contenant le JSON). */
function anthropicResponse(jsonText: string): Response {
  return new Response(JSON.stringify({ content: [{ type: 'text', text: jsonText }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

interface FetchLog {
  anthropic: number
  discord: number
  notion: number
  github: number
  brevo: number
}

/**
 * Construit des deps de test. `failBranch` force l'échec d'une branche du fan-out.
 * `aiJson` = le texte JSON que "Claude" renvoie. Renvoie aussi le log d'appels + les
 * champs persistés par l'updater.
 */
function makeDeps(
  opts: {
    aiJson?: string
    failBranch?: 'discord' | 'notion' | 'github' | 'brevo'
    noAnthropicKey?: boolean
  } = {}
) {
  const log: FetchLog = { anthropic: 0, discord: 0, notion: 0, github: 0, brevo: 0 }
  const persisted: { ai?: AiTriage; destinations?: Record<string, unknown> } = {}

  const fetchStub: typeof fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('api.anthropic.com')) {
      log.anthropic++
      return anthropicResponse(
        opts.aiJson ??
          '{"title":"Bouton envoyer KO","severity":"blocking","summary":"Le handler de submit échoue.","category":null}'
      )
    }
    if (url.includes('discord')) {
      log.discord++
      return opts.failBranch === 'discord'
        ? new Response('err', { status: 500 })
        : new Response(null, { status: 204 })
    }
    if (url.includes('api.notion.com')) {
      log.notion++
      if (opts.failBranch === 'notion') return new Response('err', { status: 500 })
      return new Response(JSON.stringify({ id: 'notion-page-1' }), { status: 200 })
    }
    if (url.includes('api.github.com')) {
      log.github++
      if (opts.failBranch === 'github') return new Response('err', { status: 500 })
      return new Response(JSON.stringify({ html_url: 'https://github.com/org/repo/issues/42' }), {
        status: 201,
      })
    }
    if (url.includes('api.brevo.com')) {
      log.brevo++
      return new Response('', { status: opts.failBranch === 'brevo' ? 500 : 201 })
    }
    throw new Error(`fetch inattendu: ${url}`)
  }

  const updater: FeedbackUpdater = {
    async updateAi(_id, ai) {
      persisted.ai = ai
    },
    async updateDestinations(_id, fields) {
      persisted.destinations = fields
    },
  }

  const env: Record<string, string> = {
    DISCORD_FEEDBACK_WEBHOOK_URL: 'https://discord.com/api/webhooks/x',
    NOTION_TOKEN: 'ntn_x',
    NOTION_FEEDBACK_DB_ID: 'db_x',
    GITHUB_TOKEN: 'ghp_x',
    GITHUB_REPO: 'org/repo',
    BREVO_API_KEY: 'brevo_x',
  }
  if (!opts.noAnthropicKey) env.ANTHROPIC_API_KEY = 'sk-ant-x'

  const deps: FeedbackDispatchDeps = {
    env: (name) => env[name],
    fetch: fetchStub,
    updater,
    adminFeedbackUrl: (id) => `https://supabase.test/feedback/${id}`,
  }

  return { deps, log, persisted }
}

// ── 1. buildPrompt — un prompt distinct par type ────────────────────────────────

Deno.test('buildPrompt: bug demande severity (blocking/annoying/minor) + titre 80c', () => {
  const p = buildPrompt(record({ type: 'bug' }))
  assertStringIncludes(p, '"severity"')
  assertStringIncludes(p, 'blocking')
  assertStringIncludes(p, '80 caractères')
  assertStringIncludes(p, '/contributions') // contexte page injecté
  assertStringIncludes(p, 'Le bouton envoyer') // verbatim
})

Deno.test(
  'buildPrompt: feature demande une catégorie (UX/données/perf/admin/autre), severity null',
  () => {
    const p = buildPrompt(record({ type: 'feature', message: 'Ajouter un export CSV' }))
    assertStringIncludes(p, '"category"')
    assertStringIncludes(p, 'UX')
    assertStringIncludes(p, '"severity": null')
    assertStringIncludes(p, 'Ajouter un export CSV')
  }
)

Deno.test(
  'buildPrompt: question demande une intention (technique/métier/facturation/autre)',
  () => {
    const p = buildPrompt(record({ type: 'question', message: 'Comment retirer mes fonds ?' }))
    assertStringIncludes(p, 'technique')
    assertStringIncludes(p, 'facturation')
    assertStringIncludes(p, 'Comment retirer mes fonds')
  }
)

// ── 2. parseAiJson — extraction robuste + normalisation ─────────────────────────

Deno.test('parseAiJson: extrait le JSON même entouré de texte / fences markdown', () => {
  const raw =
    'Voici le résultat :\n```json\n{"title":"Titre","severity":"annoying","summary":"Résumé.","category":null}\n```\nVoilà.'
  const ai = parseAiJson(raw, 'bug')
  assertEquals(ai.title, 'Titre')
  assertEquals(ai.severity, 'annoying')
  assertEquals(ai.summary, 'Résumé.')
})

Deno.test('parseAiJson: severity hors enum sur un bug → fallback "minor"', () => {
  const ai = parseAiJson('{"title":"X","severity":"catastrophique","summary":"s"}', 'bug')
  assertEquals(ai.severity, 'minor')
})

Deno.test('parseAiJson: feature → severity null, category par défaut "autre" si absente', () => {
  const ai = parseAiJson('{"title":"X","summary":"s"}', 'feature')
  assertEquals(ai.severity, null)
  assertEquals(ai.category, 'autre')
})

Deno.test('parseAiJson: titre > 80 chars est tronqué (… inclus, longueur ≤ 80)', () => {
  const longTitle = 'A'.repeat(120)
  const ai = parseAiJson(`{"title":"${longTitle}","summary":"s"}`, 'question')
  assert(ai.title.length <= 80)
  assertStringIncludes(ai.title, '…')
})

// ── 3. dispatchFeedback — fan-out, GitHub bug-only, résilience ──────────────────

Deno.test('dispatchFeedback (bug): les 4 branches réussissent → flags true + liens', async () => {
  const { deps, log, persisted } = makeDeps()
  const result = await dispatchFeedback(deps, record({ type: 'bug' }))

  assertEquals(log.anthropic, 1)
  assertEquals(log.github, 1) // bug → GitHub appelé
  assertEquals(result.discordNotified, true)
  assertEquals(result.emailSent, true)
  assertEquals(result.notionPageId, 'notion-page-1')
  assertEquals(result.githubIssueUrl, 'https://github.com/org/repo/issues/42')
  // l'IA a bien été persistée
  assertEquals(persisted.ai?.severity, 'blocking')
  // les destinations persistées reflètent les réussites
  assertEquals(persisted.destinations?.discord_notified, true)
  assertEquals(persisted.destinations?.email_sent, true)
})

Deno.test("dispatchFeedback (feature): GitHub N'EST PAS appelé (bug-only)", async () => {
  const { deps, log, persisted } = makeDeps({
    aiJson: '{"title":"Export CSV","summary":"Permet l\'export.","category":"données"}',
  })
  const result = await dispatchFeedback(deps, record({ type: 'feature' }))

  assertEquals(log.github, 0) // feature → pas de GitHub Issue
  assertEquals(result.githubIssueUrl, null)
  assertEquals(result.discordNotified, true)
  assertEquals(result.emailSent, true)
  assertEquals(persisted.ai?.category, 'données')
})

Deno.test("dispatchFeedback: une branche en échec (Discord) n'empêche pas les autres", async () => {
  const {
    deps,
    result: _r,
    persisted,
  } = (() => {
    const m = makeDeps({ failBranch: 'discord' })
    return { ...m, result: undefined }
  })()
  const result = await dispatchFeedback(deps, record({ type: 'bug' }))

  // Discord a échoué → flag false, mais les autres branches ont réussi.
  assertEquals(result.discordNotified, false)
  assertEquals(result.emailSent, true)
  assertEquals(result.notionPageId, 'notion-page-1')
  assertEquals(result.githubIssueUrl, 'https://github.com/org/repo/issues/42')
  // le flag false est bien persisté (retry manuel possible)
  assertEquals(persisted.destinations?.discord_notified, false)
})

Deno.test('dispatchFeedback: sans ANTHROPIC_API_KEY → fallback IA, fan-out continue', async () => {
  const { deps, log, persisted } = makeDeps({ noAnthropicKey: true })
  const result = await dispatchFeedback(deps, record({ type: 'bug' }))

  assertEquals(log.anthropic, 0) // pas d'appel Anthropic sans clé
  assert(persisted.ai?.title && persisted.ai.title.length > 0) // fallback titre = message
  assertEquals(result.discordNotified, true) // le fan-out fonctionne quand même
})
