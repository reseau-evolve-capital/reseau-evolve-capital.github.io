// Alerte email aux trésoriers quand la sync casse sur une erreur DURE (NTF-003).
//
// Best-effort, sur le modèle de sentry.ts : toute défaillance est avalée —
// l'alerting ne doit JAMAIS faire échouer la sync ni masquer l'erreur d'origine.
//
// Anti-spam : au plus une alerte par club et par fenêtre glissante de 4h
// (clubs.last_error_email_sent_at, migration 019). NULL = jamais envoyée → on
// autorise. Après un envoi réussi, on met l'horodatage à now().
//
// RENDU EMAIL CÔTÉ DENO
// ---------------------
// Le composant React Email vit dans `packages/data/src/emails/SyncErrorEmail.tsx`
// et son rendu HTML passe par `renderEmailHtml` (React Email). Pour rester
// TESTABLE sans réseau ni dépendance de rendu lourde dans Deno, l'envoi réel
// (rendu HTML + POST Brevo) est INJECTÉ via `sendEmail`. L'entrypoint de
// production (index.ts) câble une implémentation qui importe le rendu via
// specifier `npm:` et POST sur l'API Brevo `/v3/smtp/email`. Ce module ne
// contient donc QUE la logique pure : nettoyage du message, lecture des
// trésoriers, seuil 4h, assemblage du payload Brevo.

import type { SupabaseClient } from '@supabase/supabase-js'

/** Fenêtre anti-spam : au plus une alerte par club toutes les 4h. */
export const ALERT_THROTTLE_MS = 4 * 60 * 60 * 1000

/** Rôles habilités à recevoir l'alerte (staff du club). */
const TREASURER_ROLES = ['treasurer', 'president', 'network_admin'] as const

/** Noms de feuilles dont runSheet préfixe le message d'erreur (« <Feuille>: … »). */
const SHEET_PREFIXES = [
  'PARAMETRAGES',
  'Base',
  'Portefeuille',
  'HISTORIQUE',
  'COTISATIONS',
  'Details cotisations',
  'refresh_member_quote_part',
  'update clubs.synced_at',
] as const

/** Payload SMTP Brevo (API `/v3/smtp/email`), forme minimale utilisée ici. */
export interface BrevoEmailPayload {
  sender: { name: string; email: string }
  to: Array<{ email: string }>
  subject: string
  htmlContent: string
}

/** Contexte d'envoi passé à l'implémentation injectée (rendu + POST Brevo). */
export interface SyncErrorEmailContext {
  clubName: string
  syncTime: Date
  errorMessage: string
  recipients: string[]
}

/**
 * Nettoie un message d'erreur technique en texte métier lisible :
 *   - retire le préfixe « <Feuille>: » ajouté par runSheet ;
 *   - coupe toute stack trace (on ne garde que la 1re ligne) ;
 *   - retire le bruit technique courant (« upsert clubs: », « Error: »…) ;
 *   - tronque à une longueur raisonnable pour un email.
 * Jamais de stack dans l'email — uniquement un message court et lisible.
 */
export function cleanErrorMessage(raw: string): string {
  // 1re ligne uniquement (pas de stack multi-lignes). Si plusieurs erreurs sont
  // agrégées avec « | », on ne garde que la première (la plus actionnable).
  let msg = (raw ?? '').split(' | ')[0]?.split('\n')[0]?.trim() ?? ''
  // Retire le préfixe de feuille ajouté par runSheet (« HISTORIQUE: … »).
  for (const prefix of SHEET_PREFIXES) {
    if (msg.startsWith(`${prefix}:`)) {
      msg = msg.slice(prefix.length + 1).trim()
      break
    }
  }
  // Retire un éventuel préfixe « Error: » ou « TypeError: ».
  msg = msg.replace(/^[A-Za-z]*Error:\s*/, '')
  // Retire le bruit d'implémentation « upsert <table>: », « insert <table>: », etc.
  msg = msg.replace(/\b(upsert|insert|delete|select|update)\s+\w+:\s*/i, '')
  msg = msg.trim()
  if (msg === '') return 'Erreur inconnue lors de la synchronisation.'
  // Tronque pour rester lisible en email.
  const MAX = 280
  return msg.length > MAX ? `${msg.slice(0, MAX - 1)}…` : msg
}

/** Charge les emails des trésoriers/staff du club. Best-effort : [] sur erreur. */
export async function loadTreasurerEmails(
  supabase: SupabaseClient,
  clubId: string
): Promise<string[]> {
  try {
    // Désambiguïsation : memberships a DEUX FK vers users (user_id et locked_by,
    // cf. ADM-007). On qualifie l'embed par le nom de la contrainte du user_id.
    const { data, error } = await supabase
      .from('memberships')
      .select('users!memberships_user_id_fkey!inner(email)')
      .eq('club_id', clubId)
      .in('role', TREASURER_ROLES as unknown as string[])
    if (error || !data) return []
    type Row = { users: { email: string } | { users: { email: string }[] } | { email: string }[] }
    const emails = (data as Row[])
      .map((r) => {
        const u = Array.isArray(r.users) ? r.users[0] : r.users
        return (u as { email?: string } | undefined)?.email ?? null
      })
      .filter((e): e is string => typeof e === 'string' && e.trim() !== '')
    // Dédoublonne.
    return [...new Set(emails)]
  } catch {
    return []
  }
}

/** Vrai si l'envoi est autorisé compte tenu du dernier horodatage et du seuil 4h. */
export function shouldSendAlert(lastSentAt: string | null | undefined, now: Date): boolean {
  if (!lastSentAt) return true
  const last = new Date(lastSentAt).getTime()
  if (Number.isNaN(last)) return true
  return now.getTime() - last >= ALERT_THROTTLE_MS
}

/** Assemble le payload SMTP Brevo à partir du contexte et du HTML rendu. */
export function buildBrevoPayload(
  ctx: SyncErrorEmailContext,
  htmlContent: string
): BrevoEmailPayload {
  return {
    sender: { name: 'Evolve Capital', email: 'notifications@reseauevolvecapital.com' },
    to: ctx.recipients.map((email) => ({ email })),
    subject: `Erreur de synchronisation — ${ctx.clubName}`,
    htmlContent,
  }
}

/** Implémentation d'envoi injectée (rendu HTML + POST Brevo). Best-effort. */
export type SendSyncErrorEmail = (ctx: SyncErrorEmailContext) => Promise<void>

export interface MaybeSendDeps {
  /** Envoi réel (rendu + POST Brevo), injecté pour la testabilité. */
  sendEmail: SendSyncErrorEmail
  /** Horloge injectable (tests du seuil 4h). Défaut : Date.now(). */
  now?: () => Date
}

/**
 * Orchestration de l'alerte : seuil 4h → trésoriers → envoi → update horodatage.
 * Best-effort de bout en bout (try/catch global) : ne throw jamais.
 * Retourne `true` si un email a effectivement été envoyé (utile pour les tests).
 */
export async function maybeSendSyncErrorAlert(
  supabase: SupabaseClient,
  clubId: string,
  errorMessage: string,
  deps: MaybeSendDeps
): Promise<boolean> {
  const now = deps.now?.() ?? new Date()
  try {
    // 1. Seuil anti-spam : lire le club (nom + dernier envoi).
    const { data: club, error: clubErr } = await supabase
      .from('clubs')
      .select('name, last_error_email_sent_at')
      .eq('id', clubId)
      .maybeSingle()
    if (clubErr || !club) return false
    const c = club as { name?: string | null; last_error_email_sent_at?: string | null }
    if (!shouldSendAlert(c.last_error_email_sent_at, now)) return false

    // 2. Destinataires.
    const recipients = await loadTreasurerEmails(supabase, clubId)
    if (recipients.length === 0) return false

    // 3. Envoi (injecté).
    await deps.sendEmail({
      clubName: (c.name ?? '').trim() || 'Evolve Capital',
      syncTime: now,
      errorMessage: cleanErrorMessage(errorMessage),
      recipients,
    })

    // 4. Mémorise l'envoi (anti-spam). Best-effort : un update raté n'annule pas l'alerte.
    await supabase
      .from('clubs')
      .update({ last_error_email_sent_at: now.toISOString() })
      .eq('id', clubId)
    return true
  } catch {
    // Alerting best-effort : on n'interrompt jamais la sync.
    return false
  }
}
