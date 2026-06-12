// Handler pur de l'Auth Hook `send-email` (A8 / PROD).
//
// Rôle
// ----
// Supabase appelle cet endpoint AVANT d'envoyer un email d'authentification
// (magic link, invitation, recovery, …). On reprend la main pour envoyer un email
// BRANDÉ Evolve, LOCALISÉ (fr/en) via Brevo, à la place du mailer natif.
//
// Le hook « Send Email » remplace l'envoi natif : si on renvoie 200, Supabase
// considère l'email comme envoyé et n'envoie rien lui-même. Toute erreur (≠ 200)
// fait échouer l'action d'auth → on est prudent et on ne throw pas en silence.
//
// Ce module ne contient AUCUN I/O concret ni import React Email : tout passe par
// `SendEmailDeps`, donc il est testable en isolation côté Deno (pas de résolution
// @react-email / @evolve/design-system). L'entrypoint prod (`index.ts`) câble les
// vraies implémentations (vérif signature standardwebhooks, rendu HTML, Brevo).
//
// Sécurité
// --------
//   - Le secret de vérification du hook (SEND_EMAIL_HOOK_SECRET) est lu côté
//     index.ts depuis l'env, jamais hardcodé. La vérification est injectée ici via
//     `verifyPayload` pour rester testable.
//   - Aucune donnée sensible loggée. L'email destinataire n'est pas renvoyé en clair.

import { z } from 'zod'

// ---- Payload du hook Supabase `send_email` ----
// Forme documentée : { user, email_data }. On ne valide que ce dont on a besoin et
// on tolère les champs additionnels (passthrough).
const payloadSchema = z.object({
  user: z
    .object({
      email: z.string().email(),
      user_metadata: z.record(z.string(), z.unknown()).nullish(),
    })
    .passthrough(),
  email_data: z
    .object({
      token_hash: z.string().min(1),
      redirect_to: z.string().min(1),
      email_action_type: z.string().min(1),
      site_url: z.string().min(1).nullish(),
      token: z.string().nullish(),
    })
    .passthrough(),
})

export type SendEmailPayload = z.infer<typeof payloadSchema>

// ---- Payload Brevo (identique aux autres fonctions) ----
export interface BrevoEmailPayload {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  sender: { email: string; name: string }
}

export type EmailLocale = 'fr' | 'en'

// ---- Dépendances injectables ----
export interface SendEmailDeps {
  /** Vérifie la signature standardwebhooks du hook. Doit throw si invalide.
   *  Renvoie le corps JSON brut (string) vérifié, à parser ensuite. */
  verifyPayload: (rawBody: string, headers: Headers) => string
  /** Rend le HTML de l'email magic link (composant React Email, localisé).
   *  `otpCode` = code 6 chiffres saisissable dans l'app (PWA iOS) — optionnel. */
  renderMagicLinkHtml: (args: {
    magicLink: string
    otpCode?: string
    expiresInMin: number
    locale: EmailLocale
  }) => Promise<string>
  /** Envoie un email transactionnel via l'API Brevo. */
  sendBrevoEmail: (payload: BrevoEmailPayload) => Promise<void>
  /** Expéditeur transactionnel (from). */
  sender: { email: string; name: string }
}

// ---- Helpers ----
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Normalise la locale issue de user_metadata.locale (défaut 'fr'). */
export function resolveLocale(meta: Record<string, unknown> | null | undefined): EmailLocale {
  const raw = meta?.locale
  return raw === 'en' ? 'en' : 'fr'
}

/**
 * Construit la ConfirmationURL à usage unique à partir du payload du hook.
 * Forme : {projectUrl}/auth/v1/verify?token={token_hash}&type={action}&redirect_to={redirect_to}
 *
 * ⚠ La base est l'URL du **projet Supabase** (`SUPABASE_URL`), PAS `email_data.site_url` :
 * dans le payload du hook, `site_url` porte l'URL externe de GoTrue (déjà suffixée `/auth/v1`),
 * donc l'utiliser produisait un chemin doublé `/auth/v1/auth/v1/verify` → lien cassé
 * (« No API key found »). On normalise donc en retirant un éventuel `/auth/v1` final.
 * On encode les composants (open-redirect/injection safe). Le code OTP n'apparaît
 * jamais dans l'URL — il est rendu séparément dans le corps de l'email (PWA iOS).
 */
export function buildConfirmationUrl(
  data: SendEmailPayload['email_data'],
  projectUrl: string
): string {
  const base = projectUrl.replace(/\/+$/, '').replace(/\/auth\/v1$/, '')
  const params = new URLSearchParams({
    token: data.token_hash,
    type: data.email_action_type,
    redirect_to: data.redirect_to,
  })
  return `${base}/auth/v1/verify?${params.toString()}`
}

// Sujets localisés par type d'action. Magic link / login sont les flux nominaux ;
// invite & recovery retombent sur un libellé générique de connexion (le hook reste
// principalement déclenché pour le magic link en V0).
const SUBJECTS: Record<EmailLocale, string> = {
  fr: 'Ton lien de connexion à Evolve Capital',
  en: 'Your Evolve Capital sign-in link',
}

/** Types d'action gérés par le hook. */
const HANDLED_ACTIONS = new Set(['magiclink', 'login', 'invite', 'recovery', 'signup'])

/**
 * Construit le handler HTTP à partir de dépendances injectées (logique pure).
 */
export function createSendEmailHandler(
  deps: SendEmailDeps,
  opts: { fallbackSiteUrl: string; otpExpiryMin: number } = {
    fallbackSiteUrl: 'http://localhost:54321',
    otpExpiryMin: 10,
  }
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // 1. Lecture + vérification de signature (standardwebhooks). Échec → 401.
    let rawVerified: string
    try {
      const rawBody = await req.text()
      rawVerified = deps.verifyPayload(rawBody, req.headers)
    } catch (e) {
      return json({ error: `Signature du hook invalide: ${errMsg(e)}` }, 401)
    }

    // 2. Parse + validation du payload.
    let payload: SendEmailPayload
    try {
      const parsed = payloadSchema.safeParse(JSON.parse(rawVerified))
      if (!parsed.success) {
        return json({ error: 'Payload hook invalide.' }, 400)
      }
      payload = parsed.data
    } catch {
      return json({ error: 'Payload JSON illisible.' }, 400)
    }

    const action = payload.email_data.email_action_type.toLowerCase()
    // Type non géré : on laisse Supabase gérer (200 no-op explicite plutôt que throw).
    // En pratique le hook ne devrait recevoir que les actions email d'auth.
    if (!HANDLED_ACTIONS.has(action)) {
      return json({ skipped: true, reason: `action non gérée: ${action}` })
    }

    // 3. Locale + ConfirmationURL + code OTP. Le lien reste le CTA principal ;
    // le code 6 chiffres ({{ .Token }}) permet la connexion DANS la PWA iOS,
    // où le lien s'ouvre toujours dans Safari. Lien et code partagent le même
    // token sous-jacent (usage unique : utiliser l'un consomme l'autre).
    const locale = resolveLocale(payload.user.user_metadata)
    const magicLink = buildConfirmationUrl(payload.email_data, opts.fallbackSiteUrl)
    const otpCode = payload.email_data.token ?? undefined

    // 4. Rendu + envoi Brevo.
    try {
      const htmlContent = await deps.renderMagicLinkHtml({
        magicLink,
        otpCode,
        expiresInMin: opts.otpExpiryMin,
        locale,
      })
      await deps.sendBrevoEmail({
        to: [{ email: payload.user.email }],
        subject: SUBJECTS[locale],
        htmlContent,
        sender: deps.sender,
      })
    } catch (e) {
      // Échec d'envoi : on renvoie une erreur → Supabase fait échouer l'action et
      // l'utilisateur peut redemander un lien (pas d'email perdu silencieusement).
      return json({ error: `Envoi email échoué: ${errMsg(e)}` }, 502)
    }

    // Hook OK : Supabase n'enverra PAS d'email natif.
    return json({ sent: true })
  }
}
