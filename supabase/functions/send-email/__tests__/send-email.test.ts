// Tests Deno de l'Auth Hook `send-email` (A8).
//
// EXÉCUTION
// ---------
//     deno test --allow-env \
//       --config supabase/functions/send-email/deno.json \
//       supabase/functions/send-email/__tests__/send-email.test.ts
//
// (depuis la racine du repo). On importe `handler.ts` (logique pure) : aucun I/O
// réel, aucun réseau, aucun rendu React Email — les 3 seams (verifyPayload,
// renderMagicLinkHtml, sendBrevoEmail) sont stubbés.
//
// CE QUI EST TESTÉ
// ----------------
// 1. Magic link FR (locale défaut) : ConfirmationURL = lien uniquement (pas de code),
//    locale 'fr', payload Brevo assemblé, 200.
// 2. Locale EN lue depuis user_metadata.locale → l'email est rendu en 'en'.
// 3. Signature invalide → 401, AUCUN envoi.
// 4. Action non gérée → 200 { skipped: true }, AUCUN envoi.
// 5. Échec Brevo → 502.
// 6. buildConfirmationUrl : forme attendue + encodage du redirect_to.

import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1'

import { createSendEmailHandler, buildConfirmationUrl, resolveLocale } from '../handler.ts'
import type { BrevoEmailPayload, SendEmailDeps, EmailLocale } from '../handler.ts'

const OPTS = { fallbackSiteUrl: 'https://proj.supabase.co', otpExpiryMin: 60 }

function makeDeps(opts: { brevoFails?: boolean; badSignature?: boolean } = {}) {
  const sent: BrevoEmailPayload[] = []
  const rendered: { locale: EmailLocale; magicLink: string }[] = []
  const deps: SendEmailDeps = {
    verifyPayload: (raw) => {
      if (opts.badSignature) throw new Error('No matching signature')
      return raw
    },
    renderMagicLinkHtml: ({ magicLink, locale }) => {
      rendered.push({ locale, magicLink })
      return Promise.resolve(`<html lang="${locale}"><a href="${magicLink}">link</a></html>`)
    },
    sendBrevoEmail: (payload) => {
      if (opts.brevoFails) return Promise.reject(new Error('Brevo 500'))
      sent.push(payload)
      return Promise.resolve()
    },
    sender: { email: 'noreply@mail.evolve-capital.fr', name: 'Evolve Capital' },
  }
  return { deps, sent, rendered }
}

function req(body: unknown): Request {
  return new Request('http://local/send-email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': 'msg_1',
      'webhook-timestamp': '1700000000',
      'webhook-signature': 'v1,stub',
    },
    body: JSON.stringify(body),
  })
}

function payload(over: Record<string, unknown> = {}) {
  return {
    user: {
      email: 'membre@example.com',
      user_metadata: {},
      ...(over.user as object | undefined),
    },
    email_data: {
      token: '123456',
      token_hash: 'abc_hash_def',
      redirect_to: 'http://localhost:3001/login/verify',
      email_action_type: 'magiclink',
      site_url: 'https://proj.supabase.co',
      ...(over.email_data as object | undefined),
    },
  }
}

// ---- Test 1 — Magic link FR : lien-only, locale fr, payload Brevo ----
Deno.test('magic link FR (défaut) : ConfirmationURL sans code, locale fr, 200', async () => {
  const { deps, sent, rendered } = makeDeps()
  const res = await createSendEmailHandler(deps, OPTS)(req(payload()))
  const json = await res.json()

  assertEquals(res.status, 200)
  assertEquals(json.sent, true)
  assertEquals(sent.length, 1)
  assertEquals(sent[0].to[0].email, 'membre@example.com')
  assert(sent[0].subject.length > 0)
  // Locale FR par défaut.
  assertEquals(rendered[0].locale, 'fr')
  // Le lien est une ConfirmationURL (token_hash), JAMAIS le code OTP brut.
  assertStringIncludes(rendered[0].magicLink, 'token=abc_hash_def')
  assertStringIncludes(rendered[0].magicLink, '/auth/v1/verify')
  assert(!rendered[0].magicLink.includes('123456')) // le code OTP n'apparaît pas
})

// ---- Test 2 — Locale EN depuis user_metadata.locale ----
Deno.test('locale EN lue depuis user_metadata.locale', async () => {
  const { deps, rendered } = makeDeps()
  const res = await createSendEmailHandler(
    deps,
    OPTS
  )(req(payload({ user: { email: 'm@e.com', user_metadata: { locale: 'en' } } })))
  await res.json()
  assertEquals(res.status, 200)
  assertEquals(rendered[0].locale, 'en')
})

// ---- Test 3 — Signature invalide → 401, aucun envoi ----
Deno.test('signature invalide → 401, aucun envoi Brevo', async () => {
  const { deps, sent } = makeDeps({ badSignature: true })
  const res = await createSendEmailHandler(deps, OPTS)(req(payload()))
  await res.json()
  assertEquals(res.status, 401)
  assertEquals(sent.length, 0)
})

// ---- Test 4 — Action non gérée → 200 skipped, aucun envoi ----
Deno.test('action non gérée → 200 { skipped: true }, aucun envoi', async () => {
  const { deps, sent } = makeDeps()
  const res = await createSendEmailHandler(
    deps,
    OPTS
  )(req(payload({ email_data: { email_action_type: 'email_change' } })))
  const json = await res.json()
  assertEquals(res.status, 200)
  assertEquals(json.skipped, true)
  assertEquals(sent.length, 0)
})

// ---- Test 5 — Échec Brevo → 502 ----
Deno.test('échec Brevo → 502', async () => {
  const { deps } = makeDeps({ brevoFails: true })
  const res = await createSendEmailHandler(deps, OPTS)(req(payload()))
  await res.text()
  assertEquals(res.status, 502)
})

// ---- Test 6 — buildConfirmationUrl ----
Deno.test('buildConfirmationUrl : forme + encodage du redirect_to', () => {
  const data = {
    token: 'x',
    token_hash: 'th',
    redirect_to: 'http://localhost:3001/login/verify',
    email_action_type: 'magiclink',
    // site_url du payload = URL externe GoTrue (déjà /auth/v1) : NE DOIT PAS servir de base.
    site_url: 'https://proj.supabase.co/auth/v1',
  }
  // La base vient de l'URL PROJET (2ᵉ arg), pas de data.site_url.
  const url = buildConfirmationUrl(data, 'https://proj.supabase.co')
  assertStringIncludes(url, 'https://proj.supabase.co/auth/v1/verify?')
  assertStringIncludes(url, 'token=th')
  assertStringIncludes(url, 'type=magiclink')
  // redirect_to encodé en query param.
  assertStringIncludes(url, 'redirect_to=http%3A%2F%2Flocalhost%3A3001%2Flogin%2Fverify')
  // Régression : jamais de chemin doublé, même si l'URL projet porte déjà /auth/v1.
  if (url.includes('/auth/v1/auth/v1')) {
    throw new Error(`chemin /auth/v1 doublé : ${url}`)
  }
  const doubled = buildConfirmationUrl(data, 'https://proj.supabase.co/auth/v1/')
  assertStringIncludes(doubled, 'https://proj.supabase.co/auth/v1/verify?')
  if (doubled.includes('/auth/v1/auth/v1')) {
    throw new Error(`chemin /auth/v1 doublé (base avec suffixe) : ${doubled}`)
  }
})

// ---- Test 7 — resolveLocale ----
Deno.test('resolveLocale : en si user_metadata.locale=en, sinon fr', () => {
  assertEquals(resolveLocale({ locale: 'en' }), 'en')
  assertEquals(resolveLocale({ locale: 'fr' }), 'fr')
  assertEquals(resolveLocale({ locale: 'de' }), 'fr')
  assertEquals(resolveLocale({}), 'fr')
  assertEquals(resolveLocale(null), 'fr')
  assertEquals(resolveLocale(undefined), 'fr')
})
