#!/usr/bin/env node
// Garde anti-dérive de la config auth PROD (Management API Supabase).
// Node pur (≥ 18, fetch global) — zéro dépendance, même esprit que set-sheet-id.mjs.
//
// Pourquoi ce script existe :
//   `supabase/config.toml` fixe `[auth.email] otp_length = 6` MAIS cette config
//   n'est PAS poussée en CI (on ne fait jamais `supabase config push` — cf.
//   docs/deploy/SUPABASE_PROD.md, le hook send_email y est volontairement commenté).
//   La config auth prod est donc gérée à la main dans le dashboard et peut DÉRIVER.
//   Incident réel : `mailer_otp_length` était passé à 8 en prod (codes OTP à 8
//   chiffres) ; corrigé à 6 via la Management API. Ce script échoue (rouge) si la
//   dérive réapparaît — le verrou côté repo est apps/web/lib/auth/otp-length-contract.test.ts.
//
// Variables d'env :
//   SUPABASE_ACCESS_TOKEN   ← PAT `sbp_…` (obligatoire ; sinon exit 2, échec bruyant)
//   SUPABASE_PROJECT_REF    ← ref projet prod (défaut kiwcjtilwihioswdsjjv)
//
// Usage :
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/supabase-prod-auth-check.mjs
//   make supabase-check-prod-auth

const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = process.env.SUPABASE_PROJECT_REF || 'kiwcjtilwihioswdsjjv'

// Seuils attendus (source de vérité : supabase/config.toml + incident OTP 8 chiffres).
const EXPECTED_OTP_LENGTH = 6
const MIN_RATE_LIMIT_EMAIL = 5

if (!token) {
  console.error(
    '\n❌ SUPABASE_ACCESS_TOKEN manquant.\n' +
      "   Exporte un PAT Supabase (sbp_…) avant de lancer la vérif :\n" +
      '   export SUPABASE_ACCESS_TOKEN="sbp_..."   # Dashboard → Account → Access Tokens\n' +
      `   (projet ciblé : ${projectRef} — surchargeable via SUPABASE_PROJECT_REF)\n`
  )
  process.exit(2)
}

const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`
console.log(`▶ Vérif config auth prod — projet ${projectRef}`)
console.log(`  → GET ${endpoint}`)

let config
try {
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  const text = await res.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = text
  }

  if (!res.ok) {
    console.error(`\n❌ HTTP ${res.status} en interrogeant la Management API.`)
    console.error(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2))
    if (res.status === 401 || res.status === 403) {
      console.error('\n   → PAT invalide/expiré ou sans accès à ce projet. Régénère-le dans le dashboard.')
    }
    process.exit(1)
  }

  config = payload
} catch (err) {
  console.error(`\n❌ Échec de l'appel à la Management API : ${err?.message || err}`)
  process.exit(1)
}

const otpLength = config?.mailer_otp_length
const rateLimitEmail = config?.rate_limit_email_sent

console.log(`  mailer_otp_length      = ${otpLength}`)
console.log(`  rate_limit_email_sent  = ${rateLimitEmail}`)

const problems = []
if (otpLength !== EXPECTED_OTP_LENGTH) {
  problems.push(
    `mailer_otp_length = ${otpLength} (attendu ${EXPECTED_OTP_LENGTH}). ` +
      'Rappel : la prod a déjà dérivé à 8 chiffres (incident OTP). ' +
      "config.toml fixe otp_length=6 mais n'est pas poussé en CI — corrige dans le dashboard (Auth → Email)."
  )
}
if (typeof rateLimitEmail !== 'number' || rateLimitEmail < MIN_RATE_LIMIT_EMAIL) {
  problems.push(
    `rate_limit_email_sent = ${rateLimitEmail} (attendu ≥ ${MIN_RATE_LIMIT_EMAIL}). ` +
      "Trop bas = magic link/OTP bloqués sous charge légère — relève la limite dans le dashboard (Auth → Rate Limits)."
  )
}

if (problems.length > 0) {
  console.error('\n❌ Config auth prod NON conforme :')
  for (const p of problems) console.error(`   • ${p}`)
  console.error(
    "\n   (Cette config est dashboard-managed : on ne fait pas `supabase config push` " +
      'pour ne pas désactiver le hook send_email prod — cf. docs/deploy/SUPABASE_PROD.md.)\n'
  )
  process.exit(1)
}

console.log('\n✅ config auth prod conforme (otp_length=6, rate_limit_email_sent≥5)')
process.exit(0)
