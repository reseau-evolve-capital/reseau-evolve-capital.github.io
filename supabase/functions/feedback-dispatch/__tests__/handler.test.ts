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
//   3. callAi : routage multi-providers (anthropic Messages, openai/deepseek Chat Completions),
//      headers/URL/base par provider, défauts de modèle, throw si clé absente.
//   4. dispatchFeedback : GitHub bug-only, résilience d'une branche en échec, flags reflètent
//      les réussites, multi-images (screenshot_urls), fallback IA sans clé.
import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1'

import { buildPrompt, parseAiJson, dispatchFeedback } from '../handler.ts'
import type { AiTriage, FeedbackDispatchDeps, FeedbackRecord, FeedbackUpdater } from '../handler.ts'
import { callAi, resolveAiConfig } from '../ai.ts'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function record(over: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 'fb-1',
    user_id: 'u-1',
    user_email: 'membre@example.com',
    type: 'bug',
    message: 'Le bouton envoyer ne marche pas sur la page cotisations',
    screenshot_urls: null,
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

/** Réponse OpenAI/DeepSeek Chat Completions minimale. */
function chatCompletionResponse(jsonText: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: jsonText } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

interface FetchLog {
  anthropic: number
  openaiCompat: number
  discord: number
  notion: number
  github: number
  brevo: number
}

const DEFAULT_AI_JSON =
  '{"title":"Bouton envoyer KO","severity":"blocking","summary":"Le handler de submit échoue.","category":null}'

/**
 * Construit des deps de test. `failBranch` force l'échec d'une branche du fan-out.
 * `aiJson` = le texte JSON que l'IA renvoie. `env` permet d'override la config IA
 * (provider, clés). Renvoie aussi le log d'appels + les champs persistés par l'updater.
 */
function makeDeps(
  opts: {
    aiJson?: string
    failBranch?: 'discord' | 'notion' | 'github' | 'brevo'
    noAnthropicKey?: boolean
    env?: Record<string, string>
  } = {}
) {
  const log: FetchLog = {
    anthropic: 0,
    openaiCompat: 0,
    discord: 0,
    notion: 0,
    github: 0,
    brevo: 0,
  }
  const persisted: { ai?: AiTriage; destinations?: Record<string, unknown> } = {}
  const aiJson = opts.aiJson ?? DEFAULT_AI_JSON

  const fetchStub: typeof fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/v1/messages')) {
      log.anthropic++
      return anthropicResponse(aiJson)
    }
    if (url.includes('/chat/completions')) {
      log.openaiCompat++
      return chatCompletionResponse(aiJson)
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
    ...opts.env,
  }
  if (!opts.noAnthropicKey && !opts.env) env.ANTHROPIC_API_KEY = 'sk-ant-x'

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

Deno.test('buildPrompt: plusieurs captures → contexte "Captures jointes : N"', () => {
  const p = buildPrompt(record({ screenshot_urls: ['https://x/1.png', 'https://x/2.png'] }))
  assertStringIncludes(p, 'Captures jointes : 2')
})

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

// ── 3. callAi — abstraction multi-providers ─────────────────────────────────────

/** Capture l'URL + les headers + le body du dernier fetch (pour assertions de routage). */
function captureFetch(responder: (url: string) => Response): {
  fetch: typeof fetch
  calls: Array<{ url: string; init: RequestInit | undefined }>
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push({ url, init })
    return responder(url)
  }
  return { fetch: fetchStub, calls }
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  const h = init?.headers
  if (!h) return null
  if (h instanceof Headers) return h.get(name)
  const rec = h as Record<string, string>
  // case-insensitive lookup
  const key = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? rec[key] : null
}

Deno.test(
  'callAi (anthropic par défaut): appelle /v1/messages avec x-api-key + version',
  async () => {
    const { fetch, calls } = captureFetch(() => anthropicResponse('{"title":"T"}'))
    const out = await callAi(
      { env: (n) => ({ ANTHROPIC_API_KEY: 'sk-ant-x' })[n], fetch },
      'SYS',
      'USR'
    )
    assertEquals(calls.length, 1)
    assertStringIncludes(calls[0].url, 'https://api.anthropic.com/v1/messages')
    assertEquals(headerOf(calls[0].init, 'x-api-key'), 'sk-ant-x')
    assertEquals(headerOf(calls[0].init, 'anthropic-version'), '2023-06-01')
    const body = JSON.parse(calls[0].init?.body as string)
    assertEquals(body.model, 'claude-haiku-4-5') // défaut anthropic
    assertEquals(body.system, 'SYS')
    assertEquals(body.messages[0].content, 'USR')
    assertStringIncludes(out, 'title')
  }
)

Deno.test(
  'callAi (openai): appelle /chat/completions avec Authorization Bearer + base openai',
  async () => {
    const { fetch, calls } = captureFetch(() => chatCompletionResponse('{"title":"T"}'))
    const env: Record<string, string> = {
      FEEDBACK_AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-openai-x',
    }
    await callAi({ env: (n) => env[n], fetch }, 'SYS', 'USR')
    assertEquals(calls.length, 1)
    assertStringIncludes(calls[0].url, 'https://api.openai.com/v1/chat/completions')
    assertEquals(headerOf(calls[0].init, 'Authorization'), 'Bearer sk-openai-x')
    const body = JSON.parse(calls[0].init?.body as string)
    assertEquals(body.model, 'gpt-4o-mini') // défaut openai
    assertEquals(body.messages[0].role, 'system')
    assertEquals(body.messages[0].content, 'SYS')
    assertEquals(body.messages[1].role, 'user')
    assertEquals(body.messages[1].content, 'USR')
    assertEquals(body.response_format.type, 'json_object')
  }
)

Deno.test(
  'callAi (deepseek): /chat/completions, base deepseek, modèle défaut deepseek-chat',
  async () => {
    const { fetch, calls } = captureFetch(() => chatCompletionResponse('{"title":"T"}'))
    const env: Record<string, string> = {
      FEEDBACK_AI_PROVIDER: 'deepseek',
      DEEPSEEK_API_KEY: 'sk-deepseek-x',
    }
    await callAi({ env: (n) => env[n], fetch }, 'SYS', 'USR')
    assertStringIncludes(calls[0].url, 'https://api.deepseek.com/v1/chat/completions')
    assertEquals(headerOf(calls[0].init, 'Authorization'), 'Bearer sk-deepseek-x')
    const body = JSON.parse(calls[0].init?.body as string)
    assertEquals(body.model, 'deepseek-chat') // défaut deepseek
  }
)

Deno.test(
  'callAi: FEEDBACK_AI_BASE_URL override la base (endpoint OpenAI-compatible)',
  async () => {
    const { fetch, calls } = captureFetch(() => chatCompletionResponse('{"title":"T"}'))
    const env: Record<string, string> = {
      FEEDBACK_AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'k',
      FEEDBACK_AI_BASE_URL: 'https://proxy.example.com/v1/',
      FEEDBACK_AI_MODEL: 'custom-model',
    }
    await callAi({ env: (n) => env[n], fetch }, 'SYS', 'USR')
    assertStringIncludes(calls[0].url, 'https://proxy.example.com/v1/chat/completions')
    const body = JSON.parse(calls[0].init?.body as string)
    assertEquals(body.model, 'custom-model')
  }
)

Deno.test('callAi: throw si clé absente pour le provider sélectionné', async () => {
  const { fetch, calls } = captureFetch(() => chatCompletionResponse('{}'))
  let threw = false
  try {
    await callAi({ env: (n) => ({ FEEDBACK_AI_PROVIDER: 'openai' })[n], fetch }, 'S', 'U')
  } catch {
    threw = true
  }
  assert(threw, 'callAi doit throw sans clé')
  assertEquals(calls.length, 0, 'aucun appel réseau sans clé')
})

Deno.test('resolveAiConfig: provider invalide → fallback anthropic + défauts', () => {
  const cfg = resolveAiConfig((n) => ({ FEEDBACK_AI_PROVIDER: 'mistral' })[n])
  assertEquals(cfg.provider, 'anthropic')
  assertEquals(cfg.model, 'claude-haiku-4-5')
  assertEquals(cfg.baseUrl, 'https://api.anthropic.com')
})

// ── 4. dispatchFeedback — fan-out, GitHub bug-only, résilience, multi-images ─────

Deno.test('dispatchFeedback (bug): les 4 branches réussissent → flags true + liens', async () => {
  const { deps, log, persisted } = makeDeps()
  const result = await dispatchFeedback(deps, record({ type: 'bug' }))

  assertEquals(log.anthropic, 1) // provider par défaut = anthropic
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

Deno.test('dispatchFeedback (openai provider): triage via /chat/completions', async () => {
  const { deps, log } = makeDeps({
    env: { OPENAI_API_KEY: 'sk-x', FEEDBACK_AI_PROVIDER: 'openai' },
  })
  await dispatchFeedback(deps, record({ type: 'bug' }))
  assertEquals(log.anthropic, 0) // pas d'appel Messages
  assertEquals(log.openaiCompat, 1) // appel Chat Completions
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
  const { deps, persisted } = makeDeps({ failBranch: 'discord' })
  const result = await dispatchFeedback(deps, record({ type: 'bug' }))

  // Discord a échoué → flag false, mais les autres branches ont réussi.
  assertEquals(result.discordNotified, false)
  assertEquals(result.emailSent, true)
  assertEquals(result.notionPageId, 'notion-page-1')
  assertEquals(result.githubIssueUrl, 'https://github.com/org/repo/issues/42')
  // le flag false est bien persisté (retry manuel possible)
  assertEquals(persisted.destinations?.discord_notified, false)
})

Deno.test('dispatchFeedback: sans clé IA → fallback IA, fan-out continue', async () => {
  const { deps, log, persisted } = makeDeps({ noAnthropicKey: true })
  const result = await dispatchFeedback(deps, record({ type: 'bug' }))

  assertEquals(log.anthropic, 0) // pas d'appel IA sans clé
  assertEquals(log.openaiCompat, 0)
  assert(persisted.ai?.title && persisted.ai.title.length > 0) // fallback titre = message
  assertEquals(result.discordNotified, true) // le fan-out fonctionne quand même
})

Deno.test('dispatchFeedback: multi-images dans GitHub (body) + Discord (embed)', async () => {
  const shots = ['https://x/1.png', 'https://x/2.png', 'https://x/3.png']
  let githubBody = ''
  let discordPayload: Record<string, unknown> = {}
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/v1/messages')) return anthropicResponse(DEFAULT_AI_JSON)
    if (url.includes('api.github.com')) {
      githubBody = JSON.parse(init?.body as string).body
      return new Response(JSON.stringify({ html_url: 'https://github.com/org/repo/issues/7' }), {
        status: 201,
      })
    }
    if (url.includes('discord')) {
      discordPayload = JSON.parse(init?.body as string)
      return new Response(null, { status: 204 })
    }
    if (url.includes('api.notion.com'))
      return new Response(JSON.stringify({ id: 'p' }), { status: 200 })
    if (url.includes('api.brevo.com')) return new Response('', { status: 201 })
    throw new Error(`fetch inattendu: ${url}`)
  }
  const deps: FeedbackDispatchDeps = {
    env: (n) =>
      ({
        ANTHROPIC_API_KEY: 'k',
        DISCORD_FEEDBACK_WEBHOOK_URL: 'https://discord.com/api/webhooks/x',
        NOTION_TOKEN: 't',
        NOTION_FEEDBACK_DB_ID: 'db',
        GITHUB_TOKEN: 'g',
        GITHUB_REPO: 'org/repo',
        BREVO_API_KEY: 'b',
      })[n],
    fetch: fetchStub,
    updater: { async updateAi() {}, async updateDestinations() {} },
    adminFeedbackUrl: (id) => `https://s.test/${id}`,
  }

  await dispatchFeedback(deps, record({ type: 'bug', screenshot_urls: shots }))

  // GitHub : les 3 URLs listées dans le body
  for (const u of shots) assertStringIncludes(githubBody, u)
  // Discord : 1ʳᵉ image en image d'embed + field listant les captures
  const embed = (discordPayload.embeds as Array<Record<string, unknown>>)[0]
  assertEquals((embed.image as { url: string }).url, shots[0])
  const fieldNames = (embed.fields as Array<{ name: string }>).map((f) => f.name)
  assert(
    fieldNames.some((n) => n.includes('Captures')),
    'un field Captures doit lister les images'
  )
})
