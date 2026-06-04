// Handler pur de l'Edge Function `send-monthly-attestations` (NTF-005).
//
// Ce module ne contient AUCUN I/O concret ni import des arbres lourds (React Email,
// @react-pdf, qrcode) : tout passe par `AttestationBatchDeps`. Il est donc testable en
// isolation côté Deno (pas de réseau, pas de rendu TSX/PDF). L'entrypoint de production
// (`index.ts`) câble les vraies implémentations.
//
// Parcours : pour chaque club → chaque MEMBRE ACTIF → si pas déjà envoyé pour `period`
// (lookup attestation_sends) : assemble les données (mapAttestation), rend le PDF (buffer),
// rend l'email HTML, POST Brevo (avec pièce jointe base64), puis INSERT attestation_sends.
//
// Garanties :
//   - IDEMPOTENCE par période : skip si une ligne (membership_id, period) existe déjà,
//     et la contrainte UNIQUE en DB protège des courses (l'insert en double est ignoré).
//   - NON-ARRÊT sur échec : un membre en erreur est loggé puis ignoré (try/catch par membre),
//     le batch continue.
//   - BACKOFF Brevo : sur réponse 429 (rate limit), on attend puis on retente (deps.sleep).

// ---- Types métier injectés (pas d'import des modules lourds) ----

/** Données minimales d'un membre actif à traiter. */
export interface MemberRow {
  membershipId: string
  email: string
  fullName: string | null
}

/** Données nécessaires pour assembler l'attestation + l'email d'un membre. */
export interface AttestationAssembly {
  /** PDF prêt à joindre (déjà rendu). */
  pdfBase64: string
  /** Nom de fichier de la pièce jointe. */
  attachmentName: string
  /** HTML de l'email (déjà rendu). */
  htmlContent: string
  /** Sujet de l'email. */
  subject: string
}

/** Pièce jointe Brevo (contenu base64). */
export interface BrevoAttachment {
  content: string
  name: string
}

/** Payload Brevo /v3/smtp/email (avec pièce jointe). */
export interface BrevoEmailPayload {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  sender: { email: string; name: string }
  attachment: BrevoAttachment[]
}

/** Résultat d'un envoi Brevo (id de message pour traçabilité). */
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

export interface AttestationBatchDeps {
  /** Liste tous les clubs actifs à traiter (id). */
  listClubs: () => Promise<{ id: string; name: string }[]>
  /** Liste les membres ACTIFS d'un club (status = 'active'). */
  listActiveMembers: (clubId: string) => Promise<MemberRow[]>
  /** Vrai si l'attestation de `period` a DÉJÀ été envoyée à ce membership. */
  alreadySent: (membershipId: string, period: string) => Promise<boolean>
  /** Assemble PDF + email pour un membre/période donné (rend TSX/PDF côté impl). */
  assemble: (member: MemberRow, clubName: string, period: string) => Promise<AttestationAssembly>
  /** Envoie l'email via Brevo. Lève BrevoRateLimitError sur 429. */
  sendBrevo: (payload: BrevoEmailPayload) => Promise<BrevoSendResult>
  /** Journalise l'envoi (INSERT attestation_sends). Idempotent côté DB (UNIQUE). */
  recordSend: (membershipId: string, period: string, brevoMessageId: string | null) => Promise<void>
  /** Attente (backoff). Injectable pour test instantané. */
  sleep: (ms: number) => Promise<void>
  /** Log diagnostic (injectable pour test silencieux). */
  log?: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void
}

/** Backoff : nombre de tentatives et délai de base (ms) sur rate limit Brevo. */
const MAX_BREVO_ATTEMPTS = 3
const BACKOFF_BASE_MS = 500

/** Résumé d'exécution du batch (retourné par le handler). */
export interface BatchSummary {
  period: string
  clubs: number
  membersConsidered: number
  sent: number
  skipped: number
  failed: number
}

/** Calcule la période cible « YYYY-MM » = mois PRÉCÉDENT par rapport à `now`. */
export function previousMonthPeriod(now: Date): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() // 0..11
  // Mois précédent (gère le passage de janvier → décembre N-1).
  const d = new Date(Date.UTC(year, month - 1, 1))
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Prénom à partir du full_name (1er token) ; fallback géré côté composant. */
export function firstNameOf(fullName: string | null): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** POST Brevo avec backoff exponentiel sur 429. Lève l'erreur après MAX tentatives. */
async function sendWithBackoff(
  deps: AttestationBatchDeps,
  payload: BrevoEmailPayload
): Promise<BrevoSendResult> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_BREVO_ATTEMPTS; attempt++) {
    try {
      return await deps.sendBrevo(payload)
    } catch (e) {
      lastErr = e
      if (e instanceof BrevoRateLimitError && attempt < MAX_BREVO_ATTEMPTS) {
        // Backoff exponentiel : 500ms, 1000ms, …
        await deps.sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1))
        continue
      }
      throw e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

/**
 * Exécute le batch d'envoi pour une période donnée (par défaut : mois précédent).
 * Logique pure : toutes les I/O passent par `deps`.
 */
export async function runAttestationBatch(
  deps: AttestationBatchDeps,
  opts: { period?: string; now?: Date } = {}
): Promise<BatchSummary> {
  const log = deps.log ?? (() => {})
  const period = opts.period ?? previousMonthPeriod(opts.now ?? new Date())

  const summary: BatchSummary = {
    period,
    clubs: 0,
    membersConsidered: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  }

  const clubs = await deps.listClubs()
  summary.clubs = clubs.length

  for (const club of clubs) {
    let members: MemberRow[]
    try {
      members = await deps.listActiveMembers(club.id)
    } catch (e) {
      // Échec de listing d'un club : on logge et on continue avec les autres clubs.
      log('error', `Listing membres échoué pour le club ${club.id}`, { error: errMsg(e) })
      continue
    }

    for (const member of members) {
      summary.membersConsidered += 1
      try {
        // IDEMPOTENCE : skip si déjà envoyé pour cette période.
        if (await deps.alreadySent(member.membershipId, period)) {
          summary.skipped += 1
          continue
        }
        if (member.email.trim() === '') {
          log('warn', `Membre sans email ignoré`, { membershipId: member.membershipId })
          summary.failed += 1
          continue
        }

        const assembly = await deps.assemble(member, club.name, period)
        const result = await sendWithBackoff(deps, {
          to: [
            {
              email: member.email,
              name: (member.fullName ?? '').trim() || undefined,
            },
          ],
          subject: assembly.subject,
          htmlContent: assembly.htmlContent,
          sender: { email: 'no-reply@evolve.capital', name: 'Evolve Capital' },
          attachment: [{ content: assembly.pdfBase64, name: assembly.attachmentName }],
        })

        // Journalisation APRÈS succès (idempotence ; UNIQUE protège des courses).
        await deps.recordSend(member.membershipId, period, result.messageId)
        summary.sent += 1
      } catch (e) {
        // NON-ARRÊT : l'échec d'un membre n'interrompt pas le batch.
        log('error', `Envoi attestation échoué`, {
          membershipId: member.membershipId,
          error: errMsg(e),
        })
        summary.failed += 1
        continue
      }
    }
  }

  return summary
}
