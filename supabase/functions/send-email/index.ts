// Edge Function `send-email` — Auth Hook « Send Email » Evolve Capital (A8 / PROD).
//
// Contrat
// -------
//   POST (appelé par Supabase Auth avant l'envoi d'un email d'auth)
//     headers : signature standardwebhooks (webhook-id / webhook-timestamp / webhook-signature)
//     body    : { user, email_data }  (cf. handler.ts)
//   → vérifie la signature avec SEND_EMAIL_HOOK_SECRET
//   → construit la ConfirmationURL (lien uniquement, jamais de code)
//   → rend MagicLinkEmail dans la locale de l'utilisateur (user_metadata.locale, défaut 'fr')
//   → envoie via Brevo (BREVO_API_KEY)
//   → 200 { sent: true } : Supabase n'enverra PAS d'email natif.
//
// Architecture : la logique vit dans `handler.ts` (pur, testable). Ce fichier
// n'est QUE l'entrypoint prod — imports lourds isolés ici (React Email, design-system,
// standardwebhooks) pour ne pas alourdir les tests du handler.
//
// ⚠️ PROD UNIQUEMENT. En local, le mailer natif + le template statique
// supabase/templates/magic_link.html + Mailpit suffisent (Brevo enverrait de vrais
// emails). Le bloc [auth.hook.send_email] de config.toml reste COMMENTÉ en local.
//
// Sécurité : SEND_EMAIL_HOOK_SECRET et BREVO_API_KEY sont server-only (env), jamais
// hardcodés ni exposés au client.

import { createElement } from 'npm:react@^19'
import { Webhook } from 'npm:standardwebhooks@^1'

import { createSendEmailHandler } from './handler.ts'
import type { BrevoEmailPayload, EmailLocale } from './handler.ts'

import { MagicLinkEmail } from '../../../packages/data/src/emails/MagicLinkEmail.tsx'
import { renderEmailHtml } from '../../../packages/data/src/emails/index.ts'

/** Vérifie la signature standardwebhooks du hook. Throw si invalide ; renvoie le
 *  corps brut vérifié. Le secret Supabase est de la forme `v1,whsec_…` → la lib
 *  attend la partie base64 après le préfixe `v1,`. */
function verifyPayload(rawBody: string, headers: Headers): string {
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? ''
  if (secret === '') throw new Error('SEND_EMAIL_HOOK_SECRET manquante.')
  const base64Secret = secret.replace(/^v1,whsec_/, '')
  const wh = new Webhook(base64Secret)
  // throw si la signature ne matche pas. On renvoie le corps brut tel quel (déjà vérifié).
  wh.verify(rawBody, {
    'webhook-id': headers.get('webhook-id') ?? '',
    'webhook-timestamp': headers.get('webhook-timestamp') ?? '',
    'webhook-signature': headers.get('webhook-signature') ?? '',
  })
  return rawBody
}

/** POST l'email transactionnel sur l'API Brevo (`api-key` header). */
async function sendBrevoEmail(payload: BrevoEmailPayload): Promise<void> {
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
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Brevo ${res.status}: ${detail}`)
  }
}

/** Rendu réel du composant MagicLinkEmail en HTML (React Email), localisé. */
function renderMagicLinkHtml(args: {
  magicLink: string
  expiresInMin: number
  locale: EmailLocale
}): Promise<string> {
  return renderEmailHtml(createElement(MagicLinkEmail, args))
}

// Expéditeur transactionnel (cf. config.toml [auth.email.smtp]).
const SENDER = {
  email: Deno.env.get('BREVO_SENDER_EMAIL') ?? 'noreply@mail.evolve-capital.fr',
  name: 'Evolve Capital',
}

// Durée de validité du lien (miroir de auth.email.otp_expiry = 600s → 10 min).
// DOIT rester aligné avec config.toml otp_expiry et les textes UI (cf. QA 2026-06-07).
const OTP_EXPIRY_MIN = Math.round(Number(Deno.env.get('OTP_EXPIRY_SECONDS') ?? '600') / 60)

// ---- Entrypoint de production ----
if (import.meta.main) {
  Deno.serve(
    createSendEmailHandler(
      { verifyPayload, renderMagicLinkHtml, sendBrevoEmail, sender: SENDER },
      {
        fallbackSiteUrl: Deno.env.get('SUPABASE_URL') ?? 'http://localhost:54321',
        otpExpiryMin: Number.isFinite(OTP_EXPIRY_MIN) && OTP_EXPIRY_MIN > 0 ? OTP_EXPIRY_MIN : 10,
      }
    )
  )
}
