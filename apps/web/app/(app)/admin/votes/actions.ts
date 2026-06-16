'use server'

// Server Actions du module Vote anonyme — côté admin (staff). Création (draft/publish) et
// clôture manuelle. La garde d'autorité repose sur la RLS `polls` (policy « staff gere les
// votes » : ALL réservé treasurer/president/network_admin du club). On résout d'abord le
// contexte admin du user courant pour scoper `club_id` + `created_by`, puis on écrit via le
// client serveur (RLS appliquée). JAMAIS de service-role ici.
//
// Réf : spec §4/§7/§8, CLAUDE.md (RLS, jamais service-role client).

import { cookies } from 'next/headers'
import { z } from 'zod'
import { createServerClient, createServiceRoleClient, dispatchNotification } from '@evolve/data'
import type { Database } from '@evolve/data'
import { resolveAdminContext } from '@/lib/data/admin'

type PollOptionsJson = Database['public']['Tables']['polls']['Insert']['options']

async function serverClient() {
  return createServerClient(await cookies())
}

export type AdminPollResult = { ok: true; pollId: string } | { ok: false; error: string }
export type ActionResult = { ok: true } | { ok: false; error: string }

const questionTypeSchema = z.enum(['yes_no', 'single_choice', 'multiple_choice', 'short_text'])
const visibilitySchema = z.enum(['after_close', 'live'])

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  questionType: questionTypeSchema,
  options: z.array(z.string().trim().min(1)),
  resultsVisibility: visibilitySchema,
  notifyByEmail: z.boolean(),
  // ISO yyyy-mm-dd (champ date du formulaire) ou null.
  closesAt: z.string().trim().min(1).nullable(),
})

const actionSchema = z.enum(['draft', 'publish'])

/** Mappe un code Postgres → erreur métier stable (consommée par l'UI pour un message i18n). */
function mapPgError(code: string | undefined): string {
  if (code === '42501') return 'forbidden' // insufficient_privilege (RLS)
  if (code === '23514') return 'invalid' // check_violation (type/visibilité)
  if (code === '22007' || code === '22008') return 'invalid_date'
  return 'unknown'
}

/** Convertit la date du formulaire (yyyy-mm-dd) en timestamptz fin de journée, ou null. */
function toClosesAt(raw: string | null): string | null {
  if (!raw) return null
  const d = new Date(`${raw}T23:59:59`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/** Génère le jsonb `options` [{id,label}] (single/multiple). null pour yes_no / short_text. */
function buildOptions(
  questionType: z.infer<typeof questionTypeSchema>,
  labels: string[]
): PollOptionsJson {
  if (questionType !== 'single_choice' && questionType !== 'multiple_choice') return null
  return labels.map((label, i) => ({ id: `opt-${i + 1}`, label })) as PollOptionsJson
}

// ─── Notifications (Web Push + email) ──────────────────────────────────────
//
// FIRE-AND-FORGET strict : la publication / clôture d'un vote est DÉJÀ persistée quand on
// notifie. Un échec push/email (clé service-role absente, Edge down, réseau) ne doit JAMAIS
// faire échouer l'action — l'in-app (bannières) couvre le gap. Ces helpers créent le client
// service-role en try/catch et ne throw JAMAIS.
//
// CLUB-SCOPE : `clubId` est TOUJOURS celui du vote (`ctx.clubId`). On ne diffuse jamais plus
// large qu'au club du vote — l'Edge `dispatch-push` résout les destinataires de CE club.
//
// Réf : spec §8 (intégration), packages/data dispatch.ts (contrat fire-and-forget).

/** Crée le client service-role (server-only) ou null si l'env manque / erreur. Ne throw jamais. */
function tryServiceRoleClient(): ReturnType<typeof createServiceRoleClient> | null {
  try {
    return createServiceRoleClient()
  } catch (e) {
    // SUPABASE_SERVICE_ROLE_KEY absente en local, etc. → on abandonne la notif silencieusement.
    console.error('[votes] service-role client indisponible — notification ignorée', e)
    return null
  }
}

/**
 * Notifie l'ouverture d'un vote au CLUB (push + email), fire-and-forget. `clubId` est le club
 * du vote (jamais plus large). Ne throw jamais : tout échec est avalé (loggé).
 */
async function notifyPollOpened(
  clubId: string,
  pollId: string,
  title: string,
  closesAt: string | null
): Promise<void> {
  const admin = tryServiceRoleClient()
  if (!admin) return
  try {
    // Push : `dispatchNotification` est déjà fire-and-forget (ne throw pas), on l'awaite quand
    // même pour ne pas laisser de promesse pendante après la fin de l'action serveur.
    await dispatchNotification(admin, {
      type: 'poll.opened',
      clubId, // ← club du vote, jamais de broadcast plus large.
      payload: { pollId, title, closesAt },
    })
  } catch (e) {
    console.error('[votes] échec dispatch push poll.opened', e)
  }
  try {
    await admin.functions.invoke('send-poll-email', {
      body: { poll_id: pollId, variant: 'opened' },
    })
  } catch (e) {
    console.error('[votes] échec invoke send-poll-email', e)
  }
}

/**
 * Notifie la clôture d'un vote au CLUB (push uniquement en V0), fire-and-forget. `clubId` est
 * le club du vote. Ne throw jamais.
 */
async function notifyPollClosed(clubId: string, pollId: string, title: string): Promise<void> {
  const admin = tryServiceRoleClient()
  if (!admin) return
  try {
    await dispatchNotification(admin, {
      type: 'poll.closed',
      clubId, // ← club du vote, jamais de broadcast plus large.
      payload: { pollId, title },
    })
  } catch (e) {
    console.error('[votes] échec dispatch push poll.closed', e)
  }
}

/**
 * Crée un vote. `action='draft'` → status 'draft' (éditable, invisible des membres) ;
 * `action='publish'` → status 'open' (membres notifiés, réponses acceptées). La validation
 * fine (≥2 options pour single/multiple) est faite côté formulaire ; on garde-fou ici aussi.
 */
export async function createPollAction(
  payload: unknown,
  action: unknown
): Promise<AdminPollResult> {
  const parsedPayload = createSchema.safeParse(payload)
  const parsedAction = actionSchema.safeParse(action)
  if (!parsedPayload.success || !parsedAction.success) return { ok: false, error: 'invalid' }
  const p = parsedPayload.data

  // Garde-fou serveur : single/multiple exigent ≥ 2 options non vides.
  const needsOptions = p.questionType === 'single_choice' || p.questionType === 'multiple_choice'
  const options = p.options.map((o) => o.trim()).filter(Boolean)
  if (needsOptions && options.length < 2) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return { ok: false, error: 'forbidden' }

  const status = parsedAction.data === 'publish' ? 'open' : 'draft'

  const { data, error } = await supabase
    .from('polls')
    .insert({
      club_id: ctx.clubId,
      created_by: user.id,
      title: p.title,
      description: p.description.length > 0 ? p.description : null,
      question_type: p.questionType,
      options: buildOptions(p.questionType, options),
      results_visibility: p.resultsVisibility,
      notify_by_email: p.notifyByEmail,
      closes_at: toClosesAt(p.closesAt),
      status,
    })
    .select('id')
    .single<{ id: string }>()

  if (error) return { ok: false, error: mapPgError(error.code) }

  // Notification CLUB (push + email) seulement si publié ET opt-in email coché. Fire-and-forget :
  // on attend la résolution (helper qui ne throw jamais) puis on retourne EXACTEMENT comme avant —
  // un échec de notif ne change pas le résultat ({ ok:true } : le vote est déjà créé).
  if (status === 'open' && p.notifyByEmail) {
    await notifyPollOpened(ctx.clubId, data.id, p.title, toClosesAt(p.closesAt))
  }

  return { ok: true, pollId: data.id }
}

/**
 * Clôture manuelle d'un vote (président/trésorier). Passe status → 'closed' et horodate
 * `closed_manually_at`. Scopé au club staff (RLS + filtre explicite). Idempotent côté UI :
 * un vote déjà clos n'est plus listé en « En cours ».
 */
export async function closePollAction(pollId: string): Promise<ActionResult> {
  if (!pollId) return { ok: false, error: 'invalid' }

  const supabase = await serverClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }
  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return { ok: false, error: 'forbidden' }

  const { error } = await supabase
    .from('polls')
    .update({ status: 'closed', closed_manually_at: new Date().toISOString() })
    .eq('id', pollId)
    .eq('club_id', ctx.clubId)
    .eq('status', 'open')

  if (error) return { ok: false, error: mapPgError(error.code) }

  // Notification CLUB de clôture (push uniquement en V0). On relit le titre via le client session
  // (RLS), scopé au club du vote (`ctx.clubId`) — jamais d'autre club. Fire-and-forget : un échec
  // de lecture ou de push ne change pas le résultat ({ ok:true } : la clôture est déjà persistée).
  try {
    const { data: poll } = await supabase
      .from('polls')
      .select('title')
      .eq('id', pollId)
      .eq('club_id', ctx.clubId)
      .single<{ title: string }>()
    if (poll) {
      await notifyPollClosed(ctx.clubId, pollId, poll.title)
    }
  } catch (e) {
    console.error('[votes] échec notification poll.closed', e)
  }

  return { ok: true }
}
