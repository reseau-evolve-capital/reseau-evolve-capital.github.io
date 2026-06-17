// Edge Function `send-poll-email` — email de vote (opened/closed/reminder) via Brevo
// (PUSH-001 V1 email ; spec §7, §12).
//
// Déclenchement
// -------------
//   POST /functions/v1/send-poll-email   Body = { poll_id, variant }
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//   → 200 { sent, skipped, failed }
//
//   Appelée par les Server Actions (service role) ou les jobs cron — jamais le browser.
//   verify_jwt = false (config.toml) : le gateway ne valide pas la clé service-role.
//
// Parcours (handler pur, voir handler.ts)
// ---------------------------------------
//   Idempotence (poll_email_sends UNIQUE poll_id,variant) → membres ACTIFS de poll.club_id
//   UNIQUEMENT (reminder : moins les votants) → rend l'email PAR MEMBRE (renderPollEmailHtml)
//   → POST Brevo → recordSent.
//
// CLUB-SCOPING : `listClubActiveMembers(poll.club_id)` filtré `.eq('club_id', clubId)
// .eq('status','active')` (réf send-monthly-attestations). Jamais un autre club.
//
// Sécurité : SUPABASE_SERVICE_ROLE_KEY (bypass RLS), strictement côté serveur.

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { BrevoRateLimitError, runPollEmail } from './handler.ts'
import { alertSentry } from '../_shared/sentry.ts'
import { parseAllowlist } from '../_shared/notify-allowlist.ts'
import type {
  BrevoPollEmailPayload,
  BrevoSendResult,
  PollEmailDeps,
  PollEmailRenderProps,
  PollEmailVariant,
  PollMember,
  PollRow,
} from './handler.ts'

const VALID_VARIANTS = new Set<PollEmailVariant>(['opened', 'closed', 'reminder'])

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** POST Brevo /v3/smtp/email. Lève BrevoRateLimitError sur 429. */
async function sendBrevo(payload: BrevoPollEmailPayload): Promise<BrevoSendResult> {
  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  if (apiKey === '') throw new Error('BREVO_API_KEY manquante.')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (res.status === 429) {
    await res.text().catch(() => '')
    throw new BrevoRateLimitError()
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Brevo ${res.status}: ${detail}`)
  }
  const body = (await res.json().catch(() => ({}))) as { messageId?: string }
  return { messageId: body.messageId ?? null }
}

/** Câble les vraies deps (service-role client + renderPollEmailHtml + Brevo). */
async function buildDeps(supabase: SupabaseClient): Promise<PollEmailDeps> {
  // Import DYNAMIQUE de l'arbre React Email — hors du chemin testé (handler.ts).
  const { renderPollEmailHtml } = await import('../../../packages/data/src/emails/index.ts')
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') // optionnel ; sender par défaut dans le payload

  return {
    getPoll: async (pollId: string): Promise<PollRow | null> => {
      const { data, error } = await supabase
        .from('polls')
        .select(
          'id, club_id, title, description, question_type, closes_at, results_visibility, notify_by_email'
        )
        .eq('id', pollId)
        .maybeSingle()
      if (error) throw new Error(`Lecture poll échouée: ${error.message}`)
      if (!data) return null
      return {
        id: data.id as string,
        clubId: data.club_id as string,
        title: (data.title as string) ?? '',
        description: (data.description as string | null) ?? null,
        questionType: data.question_type as PollRow['questionType'],
        closesAt: (data.closes_at as string | null) ?? null,
        resultsVisibility:
          (data.results_visibility as PollRow['resultsVisibility']) ?? 'after_close',
        notifyByEmail: (data.notify_by_email as boolean | null) ?? false,
      }
    },

    getClubName: async (clubId: string): Promise<string> => {
      const { data, error } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', clubId)
        .maybeSingle()
      if (error) throw new Error(`Lecture club échouée: ${error.message}`)
      return (data?.name as string) ?? ''
    },

    listClubActiveMembers: async (clubId: string): Promise<PollMember[]> => {
      // CLUB-SCOPING à la source (réf send-monthly-attestations).
      const { data, error } = await supabase
        .from('memberships')
        .select('user_id, status, users(email, full_name)')
        .eq('club_id', clubId)
        .eq('status', 'active')
      if (error) throw new Error(`Lecture membres échouée: ${error.message}`)
      return (data ?? []).map((m) => {
        const u = Array.isArray(m.users) ? m.users[0] : m.users
        return {
          email: ((u?.email as string) ?? '').trim(),
          fullName: (u?.full_name as string) ?? null,
          userId: (m.user_id as string) ?? '',
        }
      })
    },

    listUsersWhoVoted: async (pollId: string): Promise<string[]> => {
      // service_role uniquement (poll_responses.user_id jamais exposé à authenticated).
      const { data, error } = await supabase
        .from('poll_responses')
        .select('user_id')
        .eq('poll_id', pollId)
      if (error) throw new Error(`Lecture poll_responses échouée: ${error.message}`)
      const ids = new Set<string>()
      for (const r of data ?? []) {
        const id = r.user_id as string | null
        if (id) ids.add(id)
      }
      return [...ids]
    },

    alreadySent: async (pollId: string, variant: PollEmailVariant): Promise<boolean> => {
      const { data, error } = await supabase
        .from('poll_email_sends')
        .select('id')
        .eq('poll_id', pollId)
        .eq('variant', variant)
        .maybeSingle()
      if (error) throw new Error(`Lecture poll_email_sends échouée: ${error.message}`)
      return data != null
    },

    recordSent: async (
      pollId: string,
      variant: PollEmailVariant,
      recipientCount: number,
      brevoMessageId: string | null
    ): Promise<void> => {
      const { error } = await supabase.from('poll_email_sends').insert({
        poll_id: pollId,
        variant,
        recipient_count: recipientCount,
        brevo_message_id: brevoMessageId,
      })
      // Course : la contrainte UNIQUE renvoie 23505 — on l'avale (idempotent).
      if (error && error.code !== '23505') {
        throw new Error(`Insert poll_email_sends échoué: ${error.message}`)
      }
    },

    renderHtml: (props: PollEmailRenderProps): Promise<string> => renderPollEmailHtml(props),

    sendBrevo: senderEmail
      ? (payload) =>
          sendBrevo({ ...payload, sender: { email: senderEmail, name: 'Evolve Capital' } })
      : sendBrevo,

    sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),

    appUrl: Deno.env.get('APP_URL') ?? undefined,

    // Allowlist de TEST (NOTIFY_ALLOWLIST = emails). Vide → tous les membres (normal).
    allowlistEmails: parseAllowlist(Deno.env.get('NOTIFY_ALLOWLIST')),

    log: (level, msg, meta) => {
      const line = `[send-poll-email] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`
      if (level === 'error') console.error(line)
      else if (level === 'warn') console.warn(line)
      else console.log(line)
    },
  }
}

// ---- Entrypoint de production ----
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    let pollId: string | undefined
    let variant: PollEmailVariant | undefined
    try {
      const body = (await req.json().catch(() => ({}))) as {
        poll_id?: string
        variant?: string
      }
      if (typeof body.poll_id === 'string' && body.poll_id.trim() !== '') pollId = body.poll_id
      if (
        typeof body.variant === 'string' &&
        VALID_VARIANTS.has(body.variant as PollEmailVariant)
      ) {
        variant = body.variant as PollEmailVariant
      }
    } catch {
      // corps illisible
    }
    if (!pollId || !variant) {
      return json({ ok: false, error: 'poll_id et variant (opened|closed|reminder) requis' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      const deps = await buildDeps(supabase)
      const summary = await runPollEmail(deps, { pollId, variant })
      return json({ ok: true, ...summary })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const dsn = Deno.env.get('SENTRY_DSN')
      await alertSentry(dsn, {
        club_id: 'send-poll-email',
        errors: [message],
        sheets: ['send-poll-email'],
      }).catch(() => {})
      return json({ ok: false, error: message }, 500)
    }
  })
}

export { buildDeps, sendBrevo }
