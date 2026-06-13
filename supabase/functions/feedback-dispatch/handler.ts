// Handler PUR de l'Edge Function `feedback-dispatch` (Feedback Widget V0).
//
// Rôle
// ----
// Déclenché par un trigger Postgres AFTER INSERT ON public.feedback (migration 036),
// qui POST `{ record }` ici. Le handler :
//   1. Construit un prompt selon `record.type` et appelle Claude Haiku (claude-haiku-4-5)
//      pour produire { title, severity?, summary, category? } — 1er appel Anthropic du repo.
//   2. UPDATE feedback SET ai_title, ai_severity, ai_summary, ai_category.
//   3. Fan-out résilient (Promise.allSettled, chaque branche try/catch isolé) :
//        a) Discord webhook (tous types)
//        b) Notion API (tous types)
//        c) GitHub Issues API (type=bug uniquement)
//        d) Brevo email accusé de réception (tous types)
//   4. UPDATE feedback SET github_issue_url, notion_page_id, discord_notified, email_sent
//      selon les branches RÉUSSIES (un échec laisse le flag false → retry manuel possible).
//
// Résilience : si une destination échoue (API down, rate limit, secret absent), les
// autres continuent ; le feedback reste intègre. L'IA elle-même est best-effort : si
// Claude échoue, on fan-out quand même avec un fallback (title = message tronqué).
//
// Architecture : AUCUN I/O concret n'est importé ici — tout passe par `FeedbackDispatchDeps`
// (env getter, supabase updater, fetch). Donc 100% testable côté Deno sans réseau réel.
// Les `fetch` Anthropic/Discord/Notion/GitHub/Brevo sont injectés via deps.fetch.

// ── Types ────────────────────────────────────────────────────────────────────

export type FeedbackType = 'bug' | 'feature' | 'question'
export type AiSeverity = 'blocking' | 'annoying' | 'minor'

/** Ligne `public.feedback` telle que sérialisée par `row_to_json(NEW)` dans le trigger. */
export interface FeedbackRecord {
  id: string
  user_id: string
  user_email: string
  type: FeedbackType
  message: string
  screenshot_url: string | null
  page_url: string
  page_route: string
  user_agent: string | null
  created_at?: string
}

/** Résultat structuré renvoyé par Claude Haiku (parsé/normalisé). */
export interface AiTriage {
  title: string
  severity: AiSeverity | null
  summary: string
  category: string | null
}

/** Résultat d'une branche du fan-out — alimente l'UPDATE final. */
export interface DispatchResult {
  ai: AiTriage
  githubIssueUrl: string | null
  notionPageId: string | null
  discordNotified: boolean
  emailSent: boolean
}

/** Sous-ensemble du client Supabase service-role utilisé par le handler. */
export interface FeedbackUpdater {
  updateAi(id: string, ai: AiTriage): Promise<void>
  updateDestinations(
    id: string,
    fields: {
      github_issue_url: string | null
      notion_page_id: string | null
      discord_notified: boolean
      email_sent: boolean
    }
  ): Promise<void>
}

/** Dépendances injectables (env + I/O). Permet de tout stubber dans les tests. */
export interface FeedbackDispatchDeps {
  env(name: string): string | undefined
  fetch: typeof fetch
  updater: FeedbackUpdater
  /** Base URL Supabase (pour le lien admin/feedback dans les notifs). */
  adminFeedbackUrl(id: string): string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-haiku-4-5'
const ANTHROPIC_VERSION = '2023-06-01'
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'
const GITHUB_API = 'https://api.github.com'
const NOTION_API = 'https://api.notion.com/v1/pages'
const NOTION_VERSION = '2022-06-28'

// Couleurs d'embed Discord (entiers décimaux) : rouge=bug, bleu=feature, gris=question.
const DISCORD_COLOR: Record<FeedbackType, number> = {
  bug: 0xc53030, // rouge dataviz (pas le rouge brand)
  feature: 0x2b6cb0, // bleu
  question: 0x718096, // gris
}

const TYPE_LABEL: Record<FeedbackType, string> = {
  bug: 'Bug',
  feature: 'Idée',
  question: 'Question',
}

// ── 1. Prompt builder (par type) — logique pure, testée ───────────────────────

const SEVERITY_VALUES: readonly AiSeverity[] = ['blocking', 'annoying', 'minor']

/**
 * Construit le prompt Claude Haiku selon le type de feedback (spec §5 étape 2).
 *   bug      → titre ≤ 80c, sévérité (blocking/annoying/minor), diagnostic préliminaire.
 *   feature  → titre, résumé, catégorie (UX/données/perf/admin/autre).
 *   question → titre, résumé, intention (technique/métier/facturation/autre).
 * Demande une SORTIE JSON STRICTE — parsée par `parseAiJson`.
 */
export function buildPrompt(record: FeedbackRecord): string {
  const ctx = [
    `Page : ${record.page_route}`,
    record.user_agent ? `Navigateur : ${summarizeUserAgent(record.user_agent)}` : null,
    record.screenshot_url ? `Capture jointe : oui` : `Capture jointe : non`,
  ]
    .filter(Boolean)
    .join('\n')

  const verbatim = `Message de l'utilisateur (verbatim) :\n"""\n${record.message}\n"""`

  if (record.type === 'bug') {
    return [
      "Tu es un assistant de triage de bugs pour une application web de gestion d'investissement (français).",
      'À partir du retour utilisateur ci-dessous, produis STRICTEMENT un objet JSON, sans aucun texte autour, avec les clés :',
      '- "title": un titre de bug structuré et actionnable, en français, MAXIMUM 80 caractères.',
      '- "severity": l\'une de "blocking" (l\'utilisateur est bloqué), "annoying" (gênant mais contournable), "minor" (cosmétique).',
      '- "summary": un diagnostic préliminaire de 2 à 3 phrases en français (cause probable, où regarder).',
      '- "category": null.',
      '',
      ctx,
      '',
      verbatim,
    ].join('\n')
  }

  if (record.type === 'feature') {
    return [
      "Tu es un assistant de triage de demandes de fonctionnalités pour une application web de gestion d'investissement (français).",
      'À partir du retour utilisateur ci-dessous, produis STRICTEMENT un objet JSON, sans aucun texte autour, avec les clés :',
      '- "title": un titre court et clair de la fonctionnalité demandée, en français, MAXIMUM 80 caractères.',
      '- "severity": null.',
      '- "summary": un résumé de 2 à 3 phrases en français reformulant le besoin et la valeur attendue.',
      '- "category": l\'une de "UX", "données", "perf", "admin", "autre".',
      '',
      ctx,
      '',
      verbatim,
    ].join('\n')
  }

  // question
  return [
    "Tu es un assistant de triage de questions pour une application web de gestion d'investissement (français).",
    'À partir du retour utilisateur ci-dessous, produis STRICTEMENT un objet JSON, sans aucun texte autour, avec les clés :',
    '- "title": un titre court reformulant la question, en français, MAXIMUM 80 caractères.',
    '- "severity": null.',
    '- "summary": un résumé de 2 à 3 phrases en français clarifiant ce que demande l\'utilisateur.',
    '- "category": l\'intention, l\'une de "technique", "métier", "facturation", "autre".',
    '',
    ctx,
    '',
    verbatim,
  ].join('\n')
}

/** Résumé compact du user-agent pour les notifications (évite le bruit). */
export function summarizeUserAgent(ua: string): string {
  const trimmed = ua.trim()
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
}

// ── 2. Parsing robuste du JSON Claude ──────────────────────────────────────────

/**
 * Extrait + normalise l'objet JSON renvoyé par Claude Haiku. Le modèle peut entourer
 * le JSON de texte (préambule, fences markdown) → on extrait le 1er bloc `{…}` équilibré.
 * Normalise `severity` (null hors enum) et tronque `title` à 80 caractères.
 * `record.type` sert de fallback pour garantir une sortie cohérente.
 */
export function parseAiJson(raw: string, type: FeedbackType): AiTriage {
  const obj = extractJsonObject(raw)
  const title = clampTitle(typeof obj.title === 'string' ? obj.title : '')
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : ''

  let severity: AiSeverity | null = null
  if (type === 'bug') {
    const s = typeof obj.severity === 'string' ? obj.severity.trim() : ''
    severity = (SEVERITY_VALUES as readonly string[]).includes(s) ? (s as AiSeverity) : 'minor'
  }

  let category: string | null = null
  if (type !== 'bug') {
    category =
      typeof obj.category === 'string' && obj.category.trim() !== '' ? obj.category.trim() : 'autre'
  }

  return { title, severity, summary, category }
}

/** Extrait le 1er objet JSON équilibré d'une chaîne (tolère fences/texte autour). Throw si aucun. */
function extractJsonObject(raw: string): Record<string, unknown> {
  const start = raw.indexOf('{')
  if (start === -1) throw new Error('Aucun objet JSON dans la réponse du modèle.')
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const slice = raw.slice(start, i + 1)
        return JSON.parse(slice) as Record<string, unknown>
      }
    }
  }
  throw new Error('Objet JSON non terminé dans la réponse du modèle.')
}

function clampTitle(t: string): string {
  const trimmed = t.trim()
  if (trimmed === '') return 'Retour utilisateur'
  return trimmed.length > 80 ? `${trimmed.slice(0, 79)}…` : trimmed
}

// ── Appel Claude Haiku ──────────────────────────────────────────────────────────

/** Appelle Claude Haiku et renvoie le triage IA. Best-effort : fallback si pas de clé ou erreur. */
async function callClaude(deps: FeedbackDispatchDeps, record: FeedbackRecord): Promise<AiTriage> {
  const apiKey = deps.env('ANTHROPIC_API_KEY')
  const fallback: AiTriage = {
    title: clampTitle(record.message),
    severity: record.type === 'bug' ? 'minor' : null,
    summary: '',
    category: record.type === 'bug' ? null : 'autre',
  }
  if (!apiKey) return fallback

  try {
    const res = await deps.fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: buildPrompt(record) }],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Anthropic ${res.status}: ${detail}`)
    }
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('\n')
    return parseAiJson(text, record.type)
  } catch {
    // L'IA est best-effort : on dispatche quand même avec le fallback.
    return fallback
  }
}

// ── 3. Fan-out (branches isolées) ───────────────────────────────────────────────

/** a) Discord — embed (type pill + titre IA + page_route + lien admin). Tous types. */
async function notifyDiscord(
  deps: FeedbackDispatchDeps,
  record: FeedbackRecord,
  ai: AiTriage
): Promise<void> {
  const url = deps.env('DISCORD_FEEDBACK_WEBHOOK_URL')
  if (!url) throw new Error('DISCORD_FEEDBACK_WEBHOOK_URL manquante.')

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Type', value: TYPE_LABEL[record.type], inline: true },
    { name: 'Page', value: record.page_route, inline: true },
  ]
  if (record.type === 'bug' && ai.severity) {
    fields.push({ name: 'Sévérité', value: ai.severity, inline: true })
  }
  if (ai.category) fields.push({ name: 'Catégorie', value: ai.category, inline: true })
  fields.push({ name: 'Message', value: truncate(record.message, 1000) })
  fields.push({ name: 'Admin', value: deps.adminFeedbackUrl(record.id) })

  const res = await deps.fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: ai.title,
          description: ai.summary || undefined,
          color: DISCORD_COLOR[record.type],
          fields,
          timestamp: record.created_at ?? new Date().toISOString(),
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Discord ${res.status}`)
}

/** b) Notion — crée une page dans la DB feedback. Tous types. */
async function pushNotion(
  deps: FeedbackDispatchDeps,
  record: FeedbackRecord,
  ai: AiTriage
): Promise<string> {
  const token = deps.env('NOTION_TOKEN')
  const dbId = deps.env('NOTION_FEEDBACK_DB_ID')
  if (!token || !dbId) throw new Error('NOTION_TOKEN / NOTION_FEEDBACK_DB_ID manquant(s).')

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: ai.title } }] },
    Type: { select: { name: TYPE_LABEL[record.type] } },
    Page: { rich_text: [{ text: { content: record.page_route } }] },
    Message: { rich_text: [{ text: { content: truncate(record.message, 1900) } }] },
  }
  if (record.type === 'bug' && ai.severity) properties.Severity = { select: { name: ai.severity } }
  if (ai.category) properties.Category = { select: { name: ai.category } }
  if (record.screenshot_url) properties.Screenshot = { url: record.screenshot_url }

  const res = await deps.fetch(NOTION_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ parent: { database_id: dbId }, properties }),
  })
  if (!res.ok) throw new Error(`Notion ${res.status}`)
  const data = (await res.json()) as { id?: string }
  if (!data.id) throw new Error('Notion: réponse sans id.')
  return data.id
}

/** c) GitHub Issues — bug UNIQUEMENT. Labels ['bug','user-reported',severity]. */
async function openGithubIssue(
  deps: FeedbackDispatchDeps,
  record: FeedbackRecord,
  ai: AiTriage
): Promise<string> {
  if (record.type !== 'bug') throw new Error('GitHub: type non-bug ignoré.')
  const token = deps.env('GITHUB_TOKEN')
  const repo = deps.env('GITHUB_REPO')
  if (!token || !repo) throw new Error('GITHUB_TOKEN / GITHUB_REPO manquant(s).')

  const body = [
    `**Sévérité estimée** : ${ai.severity ?? 'minor'}`,
    `**Page** : \`${record.page_route}\` · ${record.user_agent ? summarizeUserAgent(record.user_agent) : 'UA inconnu'}`,
    '',
    '**Description utilisateur (verbatim)**',
    '> ' + record.message.replace(/\n/g, '\n> '),
    '',
    '**Diagnostic IA**',
    ai.summary || '_(aucun)_',
    '',
    record.screenshot_url ? `**Capture** : ${record.screenshot_url}` : '_(pas de capture)_',
    '',
    `**Feedback Supabase** : ${deps.adminFeedbackUrl(record.id)}`,
  ].join('\n')

  const labels = ['bug', 'user-reported']
  if (ai.severity) labels.push(ai.severity)

  const res = await deps.fetch(`${GITHUB_API}/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'content-type': 'application/json',
      'User-Agent': 'evolve-feedback-dispatch',
    },
    body: JSON.stringify({ title: ai.title, body, labels }),
  })
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const data = (await res.json()) as { html_url?: string }
  if (!data.html_url) throw new Error('GitHub: réponse sans html_url.')
  return data.html_url
}

/** d) Brevo — email accusé de réception. Tous types. Destinataire = user_email. */
async function sendBrevoAck(
  deps: FeedbackDispatchDeps,
  record: FeedbackRecord,
  ai: AiTriage
): Promise<void> {
  const apiKey = deps.env('BREVO_API_KEY')
  if (!apiKey) throw new Error('BREVO_API_KEY manquante.')
  const senderEmail = deps.env('BREVO_SENDER_EMAIL') ?? 'noreply@mail.evolve-capital.fr'

  const typeFr = TYPE_LABEL[record.type].toLowerCase()
  const htmlContent = [
    '<p>Bonjour,</p>',
    `<p>Nous avons bien reçu votre retour (<strong>${typeFr}</strong>) et l'équipe a été notifiée.</p>`,
    ai.title ? `<p><em>${escapeHtml(ai.title)}</em></p>` : '',
    "<p>Merci d'aider à améliorer l'application.</p>",
    "<p>— L'équipe Evolve Capital</p>",
  ]
    .filter(Boolean)
    .join('')

  const res = await deps.fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      to: [{ email: record.user_email }],
      sender: { email: senderEmail, name: 'Evolve Capital' },
      subject: 'Nous avons bien reçu votre retour',
      htmlContent,
    }),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}`)
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Orchestrateur (testé) ───────────────────────────────────────────────────────

/**
 * Pipeline complet : triage IA → UPDATE ai_* → fan-out résilient → UPDATE destinations.
 * Chaque branche du fan-out est isolée (Promise.allSettled) : un échec n'affecte pas
 * les autres et laisse le flag correspondant à `false` (retry manuel). GitHub n'est
 * tenté que pour les bugs.
 */
export async function dispatchFeedback(
  deps: FeedbackDispatchDeps,
  record: FeedbackRecord
): Promise<DispatchResult> {
  // 1 + 2 : triage IA puis persistance des champs ai_*.
  const ai = await callClaude(deps, record)
  await deps.updater.updateAi(record.id, ai)

  // 3 : fan-out parallèle, branches isolées.
  const isBug = record.type === 'bug'
  const [discord, notion, github, email] = await Promise.allSettled([
    notifyDiscord(deps, record, ai),
    pushNotion(deps, record, ai),
    isBug ? openGithubIssue(deps, record, ai) : Promise.reject(new Error('skip:non-bug')),
    sendBrevoAck(deps, record, ai),
  ])

  const result: DispatchResult = {
    ai,
    githubIssueUrl: github.status === 'fulfilled' ? (github.value as string) : null,
    notionPageId: notion.status === 'fulfilled' ? (notion.value as string) : null,
    discordNotified: discord.status === 'fulfilled',
    emailSent: email.status === 'fulfilled',
  }

  // 4 : persistance des résultats du fan-out (un échec laisse le flag false).
  await deps.updater.updateDestinations(record.id, {
    github_issue_url: result.githubIssueUrl,
    notion_page_id: result.notionPageId,
    discord_notified: result.discordNotified,
    email_sent: result.emailSent,
  })

  return result
}
