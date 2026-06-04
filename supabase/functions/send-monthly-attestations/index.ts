// Edge Function `send-monthly-attestations` — envoi mensuel de l'attestation de
// détention à chaque membre actif (NTF-005).
//
// Déclenchement
// -------------
//   pg_cron (migration 021) POST `{}` le 5 de chaque mois à 06:00 UTC. La période
//   cible (« YYYY-MM ») est le MOIS PRÉCÉDENT, calculée par le handler à l'exécution.
//   Un appel manuel peut forcer une période : POST { "period": "2026-04" }.
//
// Parcours (handler pur, voir handler.ts)
// ---------------------------------------
//   pour chaque club → chaque membre ACTIF (memberships.status = 'active') →
//     si attestation_sends(membership_id, period) absente :
//       assemble (contributions + positions + contribution_months → mapAttestation),
//       rend le PDF (renderAttestationPdf) + l'email (AttestationEmail),
//       POST Brevo /v3/smtp/email avec pièce jointe PDF base64,
//       INSERT attestation_sends (idempotence + traçabilité brevo_message_id).
//
// Idempotence : table attestation_sends + contrainte UNIQUE(membership_id, period).
// Non-arrêt : un membre en échec est loggé puis ignoré, le batch continue.
// Backoff : sur Brevo 429, le handler retente avec délai exponentiel.
//
// Architecture : la logique vit dans `handler.ts` (testable sans réseau ni TSX/PDF).
// Ici on câble les vraies deps ; les arbres lourds (React Email, @react-pdf, qrcode)
// sont importés DYNAMIQUEMENT pour rester hors du chemin testé (cf. NTF-003).
//
// Sécurité : SUPABASE_SERVICE_ROLE_KEY (bypass RLS), strictement côté serveur.

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatEUR, formatPct } from '@evolve/utils'

import { BrevoRateLimitError, firstNameOf, runAttestationBatch } from './handler.ts'
import type {
  AttestationAssembly,
  AttestationBatchDeps,
  BrevoEmailPayload,
  BrevoSendResult,
  MemberRow,
} from './handler.ts'

const DASH = '—'

/** Met une métrique numérique en forme FR, ou « — » si null. */
function fmtEur(value: number | null): string {
  return value === null ? DASH : formatEUR(value)
}
/** detention_pct est une fraction 0..1 → formatPct (sans signe). */
function fmtPct(value: number | null): string {
  return value === null ? DASH : formatPct(value, { showSign: false })
}

/** Sépare « YYYY-MM » en libellé FR « avril 2026 » (fallback : la chaîne brute). */
function periodLabelFr(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim())
  if (!m) return period
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1))
  if (Number.isNaN(d.getTime())) return period
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

/** Slug de période pour le nom de fichier de la pièce jointe. */
function periodSlug(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim())
  return m ? `${m[1]}-${m[2]}` : 'detention'
}

function clubSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'club'
  )
}

/** Convertit un Buffer/Uint8Array en base64 (pièce jointe Brevo). */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** POST l'email transactionnel Brevo (avec pièce jointe). Lève BrevoRateLimitError sur 429. */
async function sendBrevo(payload: BrevoEmailPayload): Promise<BrevoSendResult> {
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

/** Câble les deps de production à partir d'un client service-role + des modules lourds. */
async function buildDeps(supabase: SupabaseClient): Promise<AttestationBatchDeps> {
  // Imports DYNAMIQUES des arbres lourds — hors du chemin testé (handler.ts).
  const { createElement } = await import('npm:react@^19')
  const { renderAttestationPdf, mapAttestation } =
    await import('../../../packages/data/src/pdf/index.ts')
  const { AttestationEmail } =
    await import('../../../packages/data/src/emails/AttestationEmail.tsx')
  const { renderEmailHtml } = await import('../../../packages/data/src/emails/index.ts')

  const appUrl = Deno.env.get('APP_URL') ?? undefined

  return {
    listClubs: async () => {
      const { data, error } = await supabase.from('clubs').select('id, name')
      if (error) throw new Error(`Lecture clubs échouée: ${error.message}`)
      return (data ?? []).map((c) => ({ id: c.id as string, name: (c.name as string) ?? '' }))
    },

    listActiveMembers: async (clubId: string): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, status, users(email, full_name)')
        .eq('club_id', clubId)
        .eq('status', 'active')
      if (error) throw new Error(`Lecture membres échouée: ${error.message}`)
      return (data ?? []).map((m) => {
        const u = Array.isArray(m.users) ? m.users[0] : m.users
        return {
          membershipId: m.id as string,
          email: ((u?.email as string) ?? '').trim(),
          fullName: (u?.full_name as string) ?? null,
        }
      })
    },

    alreadySent: async (membershipId: string, period: string) => {
      const { data, error } = await supabase
        .from('attestation_sends')
        .select('id')
        .eq('membership_id', membershipId)
        .eq('period', period)
        .maybeSingle()
      if (error) throw new Error(`Lecture attestation_sends échouée: ${error.message}`)
      return data != null
    },

    assemble: async (
      member: MemberRow,
      clubName: string,
      period: string
    ): Promise<AttestationAssembly> => {
      // Contribution du membre (1 ligne par membership).
      const { data: contribution } = await supabase
        .from('contributions')
        .select('detention_pct, total_contributed, net_market_value, status, amount_due, penalties')
        .eq('membership_id', member.membershipId)
        .maybeSingle()

      // Club du membre (pour positions + ville).
      const { data: membership } = await supabase
        .from('memberships')
        .select('club_id, joined_at, clubs(name, city)')
        .eq('id', member.membershipId)
        .maybeSingle()
      const clubId = membership?.club_id as string | undefined
      const club = Array.isArray(membership?.clubs) ? membership?.clubs[0] : membership?.clubs

      // Positions du club (valo Σ).
      const { data: positions } = clubId
        ? await supabase.from('positions').select('quantity, market_value').eq('club_id', clubId)
        : { data: [] as { quantity: number | null; market_value: number | null }[] }

      // Mois de cotisation du membre (agrégats annuels/mensuels).
      const { data: months } = await supabase
        .from('contribution_months')
        .select('year, month, amount, status')
        .eq('membership_id', member.membershipId)

      const data = mapAttestation({
        identity: {
          fullName: member.fullName,
          clubName: (club?.name as string) ?? clubName,
          clubCity: (club?.city as string) ?? null,
          joinedAt: (membership?.joined_at as string) ?? null,
          brokerAccountRef: null,
          postalAddress: null,
          brokerName: null,
        },
        contribution: contribution
          ? {
              detentionPct: contribution.detention_pct as number | null,
              totalContributed: contribution.total_contributed as number | null,
              netMarketValue: contribution.net_market_value as number | null,
              status: contribution.status as string | null,
              amountDue: contribution.amount_due as number | null,
              penalties: contribution.penalties as number | null,
            }
          : null,
        positions: (positions ?? []).map((p) => ({
          quantity: p.quantity as number | null,
          marketValue: p.market_value as number | null,
          livePrice: null, // pas de prix live côté cron — fallback snapshot (CLAUDE.md)
        })),
        months: (months ?? []).map((mo) => ({
          year: mo.year as number,
          month: mo.month as number,
          amount: mo.amount as number | null,
          status: mo.status as string | null,
        })),
        period,
        generatedAt: new Date(),
      })

      const pdf = await renderAttestationPdf(data)
      const pdfBase64 = toBase64(new Uint8Array(pdf))

      const htmlContent = await renderEmailHtml(
        createElement(AttestationEmail, {
          memberFirstName: firstNameOf(member.fullName),
          clubName: data.clubName,
          period: periodLabelFr(period),
          kpis: {
            detentionPct: fmtPct(data.detentionPct.value),
            totalContributed: fmtEur(data.totalContributed.value),
            quotePartValue: fmtEur(data.quotePartValue.value),
            portfolioValue: fmtEur(data.portfolioValue.value),
          },
          appUrl,
        })
      )

      return {
        pdfBase64,
        attachmentName: `attestation-detention-${clubSlug(data.clubName)}-${periodSlug(period)}.pdf`,
        htmlContent,
        subject: `Ton attestation de détention de ${periodLabelFr(period)}`,
      }
    },

    sendBrevo,

    recordSend: async (membershipId, period, brevoMessageId) => {
      const { error } = await supabase
        .from('attestation_sends')
        .insert({ membership_id: membershipId, period, brevo_message_id: brevoMessageId })
      // Insert en double (course) : la contrainte UNIQUE renvoie 23505 — on l'avale (idempotent).
      if (error && error.code !== '23505') {
        throw new Error(`Insert attestation_sends échoué: ${error.message}`)
      }
    },

    sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),

    log: (level, msg, meta) => {
      const line = `[send-monthly-attestations] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`
      if (level === 'error') console.error(line)
      else if (level === 'warn') console.warn(line)
      else console.log(line)
    },
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

// ---- Entrypoint de production ----
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // Période optionnelle dans le corps (sinon : mois précédent calculé par le handler).
    let period: string | undefined
    try {
      const body = (await req.json().catch(() => ({}))) as { period?: string }
      if (typeof body.period === 'string' && /^\d{4}-\d{2}$/.test(body.period)) {
        period = body.period
      }
    } catch {
      // corps vide / illisible → période par défaut
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
      const deps = await buildDeps(supabase)
      const summary = await runAttestationBatch(deps, period ? { period } : {})
      return json({ ok: true, ...summary })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return json({ ok: false, error: message }, 500)
    }
  })
}
