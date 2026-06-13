// Couche d'abstraction IA multi-providers pour `feedback-dispatch` (Feedback Widget V0).
//
// POURQUOI
// --------
// Le triage IA ne doit plus être figé sur Anthropic. Cette couche expose un unique
// `callAi(deps, systemPrompt, userPrompt)` qui route vers le provider choisi par env
// (`FEEDBACK_AI_PROVIDER`), normalise les défauts de modèle/base URL, et renvoie le
// texte brut du modèle (le parsing JSON reste dans handler.ts via `parseAiJson`).
//
// PROVIDERS
// ---------
//   - anthropic : API Messages (`POST {base}/v1/messages`), header `x-api-key` +
//                 `anthropic-version: 2023-06-01`, body { model, max_tokens, system, messages }.
//   - openai / deepseek : API OpenAI Chat Completions (DeepSeek est OpenAI-compatible) —
//                 `POST {base}/chat/completions`, header `Authorization: Bearer`,
//                 body { model, messages:[system,user], response_format: json_object }.
//
// BEST-EFFORT
// -----------
// `callAi` THROW si pas de clé pour le provider sélectionné ou en cas d'erreur réseau/HTTP.
// L'appelant (handler) attrape et applique un fallback ; le fan-out continue toujours.
//
// TESTABILITÉ : aucun I/O concret n'est importé ; `fetch` et `env` arrivent par deps.

// ── Types ────────────────────────────────────────────────────────────────────

export type AiProvider = 'anthropic' | 'openai' | 'deepseek'

/** Sous-ensemble des deps nécessaire à la couche IA (injecté pour les tests). */
export interface AiDeps {
  env(name: string): string | undefined
  fetch: typeof fetch
}

// ── Constantes / défauts ────────────────────────────────────────────────────

const ANTHROPIC_VERSION = '2023-06-01'
const MAX_TOKENS = 512

const DEFAULT_BASE_URL: Record<AiProvider, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
}

const DEFAULT_MODEL: Record<AiProvider, string> = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
}

const API_KEY_ENV: Record<AiProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
}

const VALID_PROVIDERS: readonly AiProvider[] = ['anthropic', 'openai', 'deepseek']

// ── Résolution de la config depuis l'environnement ──────────────────────────

export interface AiConfig {
  provider: AiProvider
  model: string
  baseUrl: string
  apiKey: string | undefined
}

/** Lit la config IA depuis l'env (provider, modèle, base URL, clé). Défaut : anthropic. */
export function resolveAiConfig(env: (name: string) => string | undefined): AiConfig {
  const rawProvider = (env('FEEDBACK_AI_PROVIDER') ?? '').trim().toLowerCase()
  const provider: AiProvider = (VALID_PROVIDERS as readonly string[]).includes(rawProvider)
    ? (rawProvider as AiProvider)
    : 'anthropic'

  const model = env('FEEDBACK_AI_MODEL')?.trim() || DEFAULT_MODEL[provider]
  const baseUrl = (env('FEEDBACK_AI_BASE_URL')?.trim() || DEFAULT_BASE_URL[provider]).replace(
    /\/$/,
    ''
  )
  const apiKey = env(API_KEY_ENV[provider])

  return { provider, model, baseUrl, apiKey }
}

/** Indique si une clé est posée pour le provider sélectionné (sinon → fallback côté handler). */
export function hasAiKey(env: (name: string) => string | undefined): boolean {
  return Boolean(resolveAiConfig(env).apiKey)
}

// ── Adaptateurs ──────────────────────────────────────────────────────────────

/** Anthropic Messages : POST {base}/v1/messages, x-api-key + anthropic-version. */
async function callAnthropic(
  deps: AiDeps,
  cfg: AiConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await deps.fetch(`${cfg.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey as string,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`anthropic ${res.status}: ${detail}`)
  }
  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  return (data.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n')
}

/** OpenAI / DeepSeek (Chat Completions) : POST {base}/chat/completions, Bearer key. */
async function callOpenAiCompatible(
  deps: AiDeps,
  cfg: AiConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await deps.fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey as string}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      // Aide le parsing : on attend un objet JSON strict. Les endpoints qui ne
      // supportent pas response_format tolèrent généralement ce champ inconnu.
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${cfg.provider} ${res.status}: ${detail}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Façade ───────────────────────────────────────────────────────────────────

/**
 * Appelle le provider IA sélectionné par env et renvoie le texte brut du modèle.
 * THROW si pas de clé pour le provider ou en cas d'erreur — l'appelant fait le fallback.
 */
export async function callAi(
  deps: AiDeps,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const cfg = resolveAiConfig(deps.env)
  if (!cfg.apiKey) throw new Error(`Clé IA absente (${API_KEY_ENV[cfg.provider]}).`)

  if (cfg.provider === 'anthropic') {
    return callAnthropic(deps, cfg, systemPrompt, userPrompt)
  }
  // openai + deepseek partagent l'API OpenAI Chat Completions.
  return callOpenAiCompatible(deps, cfg, systemPrompt, userPrompt)
}
