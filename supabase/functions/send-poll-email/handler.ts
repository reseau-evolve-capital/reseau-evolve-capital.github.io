// Handler pur de l'Edge Function `send-poll-email` (PUSH-001 V1 email ; spec §7, §12).
//
// Envoie l'email de vote (opened / closed / reminder) aux membres ACTIFS du club du poll.
// AUCUN I/O concret ici : toutes les seams passent par `PollEmailDeps`. Testable en isolation
// côté Deno (pas de réseau, pas de rendu React Email). `index.ts` câble les vraies deps.
//
// CLUB-SCOPING — règle de sécurité NON NÉGOCIABLE (§2.2) :
//   Les destinataires sont EXCLUSIVEMENT les membres ACTIFS de `poll.club_id`. Jamais un
//   autre club. La résolution se fait à la source (`listClubActiveMembers(poll.club_id)`).
//
// IDEMPOTENCE :
//   `poll_email_sends` (UNIQUE poll_id, variant). `alreadySent(poll_id, variant)` court-circuite
//   un 2e envoi (cron rejoué / Edge retriée) ; `recordSent` marque l'envoi APRÈS succès.
//
// ANONYMAT (§2.2) :
//   L'email ne porte que le titre du vote (jamais une identité), le prénom du destinataire
//   (perso légitime), aucune participation, aucun résultat. Le rappel exclut les votants
//   (via des user_id internes jamais exposés).

// ---- Types métier injectés ----

export type PollEmailVariant = 'opened' | 'closed' | 'reminder'

/** Poll minimal nécessaire à l'envoi. */
export interface PollRow {
  id: string
  clubId: string
  title: string
  description: string | null
  questionType: 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'
  closesAt: string | null
  resultsVisibility: 'after_close' | 'live'
  notifyByEmail: boolean
}

/** Membre actif destinataire. */
export interface PollMember {
  email: string
  fullName: string | null
  userId: string
}

/** Props attendues par renderPollEmailHtml (miroir @evolve/data PollEmailProps). */
export interface PollEmailRenderProps {
  memberFirstName: string
  clubName: string
  pollTitle: string
  pollDescription?: string
  questionType: 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'
  closesAt?: string | null
  variant: PollEmailVariant
  appUrl?: string
  locale?: 'fr' | 'en'
}

/** Payload Brevo /v3/smtp/email (un email, un ou plusieurs destinataires). */
export interface BrevoPollEmailPayload {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  sender: { email: string; name: string }
}

export interface BrevoSendResult {
  messageId: string | null
}

/** Erreur transitoire (rate limit Brevo 429) — déclenche le backoff. */
export class BrevoRateLimitError extends Error {
  constructor(message = 'Brevo 429: rate limited') {
    super(message)
    this.name = 'BrevoRateLimitError'
  }
}

export interface PollEmailDeps {
  /** Lit le poll cible (null si introuvable). */
  getPoll: (pollId: string) => Promise<PollRow | null>
  /** Nom du club (corps + footer email). */
  getClubName: (clubId: string) => Promise<string>
  /** Membres ACTIFS du club (status = 'active'). Source du club-scoping. */
  listClubActiveMembers: (clubId: string) => Promise<PollMember[]>
  /** user_id ayant déjà voté (exclusion rappel). Jamais retourné à l'appelant. */
  listUsersWhoVoted: (pollId: string) => Promise<string[]>
  /** Vrai si l'email (poll_id, variant) a DÉJÀ été envoyé (idempotence). */
  alreadySent: (pollId: string, variant: PollEmailVariant) => Promise<boolean>
  /** Marque l'envoi (INSERT poll_email_sends). Idempotent côté DB (UNIQUE). */
  recordSent: (
    pollId: string,
    variant: PollEmailVariant,
    recipientCount: number,
    brevoMessageId: string | null
  ) => Promise<void>
  /** Rend l'email en HTML (React Email côté impl). */
  renderHtml: (props: PollEmailRenderProps) => Promise<string>
  /** Envoie l'email via Brevo. Lève BrevoRateLimitError sur 429. */
  sendBrevo: (payload: BrevoPollEmailPayload) => Promise<BrevoSendResult>
  /** Backoff injectable. */
  sleep: (ms: number) => Promise<void>
  /** Base URL de l'app membre (CTA email). Injectée depuis l'env côté impl ; le handler reste pur. */
  appUrl?: string
  /**
   * Allowlist de TEST (emails normalisés minuscule, depuis NOTIFY_ALLOWLIST). Si NON VIDE, on
   * n'envoie qu'aux membres du club dont l'email y figure — INTERSECTION, jamais additif (le
   * club-scoping reste intact). Vide/undefined → comportement normal (tous les membres actifs).
   */
  allowlistEmails?: string[]
  /** Log diagnostic (injectable). */
  log?: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void
}

const MAX_BREVO_ATTEMPTS = 3
const BACKOFF_BASE_MS = 500

export interface PollEmailSummary {
  variant: PollEmailVariant
  sent: number
  skipped: number
  failed: number
}

/** Prénom à partir du full_name (1er token). */
export function firstNameOf(fullName: string | null): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Sujet FR par variante. */
function subjectFor(variant: PollEmailVariant, pollTitle: string): string {
  switch (variant) {
    case 'opened':
      return `Un vote attend votre avis : ${pollTitle}`
    case 'closed':
      return `Résultats du vote : ${pollTitle}`
    case 'reminder':
      return `Dernière chance de voter : ${pollTitle}`
  }
}

/** POST Brevo avec backoff exponentiel sur 429. */
async function sendWithBackoff(
  deps: PollEmailDeps,
  payload: BrevoPollEmailPayload
): Promise<BrevoSendResult> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_BREVO_ATTEMPTS; attempt++) {
    try {
      return await deps.sendBrevo(payload)
    } catch (e) {
      lastErr = e
      if (e instanceof BrevoRateLimitError && attempt < MAX_BREVO_ATTEMPTS) {
        await deps.sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1))
        continue
      }
      throw e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/**
 * Envoie l'email de vote pour une variante donnée.
 *
 * 1. IDEMPOTENCE : si déjà envoyé (poll_id, variant) → skip (skipped = nb membres).
 * 2. Résout les membres ACTIFS de `poll.club_id` UNIQUEMENT (reminder : moins les votants).
 * 3. Rend l'email PAR MEMBRE (perso du prénom) et envoie via Brevo (un email/membre).
 * 4. recordSent APRÈS succès du batch.
 */
export async function runPollEmail(
  deps: PollEmailDeps,
  input: { pollId: string; variant: PollEmailVariant }
): Promise<PollEmailSummary> {
  const log = deps.log ?? (() => {})
  const { pollId, variant } = input
  const summary: PollEmailSummary = { variant, sent: 0, skipped: 0, failed: 0 }

  const poll = await deps.getPoll(pollId)
  if (!poll) {
    log('warn', 'Poll introuvable', { pollId })
    return summary
  }

  // ── IDEMPOTENCE ──
  if (await deps.alreadySent(pollId, variant)) {
    // On compte les destinataires potentiels comme « skipped » (visibilité).
    const members = await deps.listClubActiveMembers(poll.clubId)
    summary.skipped = members.length
    log('info', 'Email déjà envoyé (idempotence)', { pollId, variant })
    return summary
  }

  // ── CLUB-SCOPING : membres actifs du club du poll uniquement ──
  let members = await deps.listClubActiveMembers(poll.clubId)

  // ── Allowlist de TEST (NOTIFY_ALLOWLIST) — INTERSECTION, jamais additif ──
  // Si renseignée, on restreint aux membres du club dont l'email est dans l'allowlist.
  // Ne peut JAMAIS élargir hors du club (on filtre une liste déjà club-scopée).
  if (deps.allowlistEmails && deps.allowlistEmails.length > 0) {
    const allow = new Set(deps.allowlistEmails)
    const before = members.length
    members = members.filter((m) => allow.has(m.email.trim().toLowerCase()))
    if (members.length !== before)
      log('info', 'Allowlist de test active', { before, after: members.length })
  }

  // Rappel : exclure les membres ayant déjà voté.
  if (variant === 'reminder') {
    const voted = new Set(await deps.listUsersWhoVoted(pollId))
    members = members.filter((m) => !voted.has(m.userId))
  }

  // Filtre les membres sans email (non envoyables).
  const sendable = members.filter((m) => m.email.trim() !== '')
  summary.skipped += members.length - sendable.length

  if (sendable.length === 0) {
    log('info', 'Aucun destinataire envoyable', { pollId, variant })
    return summary
  }

  const clubName = await deps.getClubName(poll.clubId)
  const appUrl = deps.appUrl
  const subject = subjectFor(variant, poll.title)

  // ── Envoi PAR MEMBRE (perso prénom) ──
  let lastMessageId: string | null = null
  for (const member of sendable) {
    try {
      const html = await deps.renderHtml({
        memberFirstName: firstNameOf(member.fullName),
        clubName,
        pollTitle: poll.title,
        pollDescription: poll.description ?? undefined,
        questionType: poll.questionType,
        closesAt: poll.closesAt,
        variant,
        appUrl,
        locale: 'fr',
      })
      const result = await sendWithBackoff(deps, {
        to: [{ email: member.email, name: (member.fullName ?? '').trim() || undefined }],
        subject,
        htmlContent: html,
        sender: { email: 'no-reply@evolve.capital', name: 'Evolve Capital' },
      })
      lastMessageId = result.messageId
      summary.sent += 1
    } catch (e) {
      // NON-ARRÊT : un membre en échec n'interrompt pas le batch.
      log('error', 'Envoi email vote échoué', { pollId, variant, error: errMsg(e) })
      summary.failed += 1
    }
  }

  // ── Idempotence : marquer l'envoi si au moins un email est parti ──
  if (summary.sent > 0) {
    try {
      await deps.recordSent(pollId, variant, summary.sent, lastMessageId)
    } catch (e) {
      log('warn', 'recordSent échoué', { pollId, variant, error: errMsg(e) })
    }
  }

  return summary
}
