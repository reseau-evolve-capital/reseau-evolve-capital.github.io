#!/usr/bin/env node
// Déclenche localement l'Edge Function `sync` (Google Sheets → Postgres) pour un club.
// Node pur (≥ 20, fetch global) — zéro dépendance, même esprit que ensure-fonts.mjs.
//
// Prérequis :
//   1. La stack Supabase locale tourne          → `supabase start -x vector,logflare`
//   2. Les Edge Functions sont servies           → `supabase functions serve --env-file supabase/functions/.env`
//   3. Le club ciblé a un VRAI `sheet_id` en DB   → UPDATE clubs SET sheet_id='<ID Google>' WHERE id='<club>'
//   4. `supabase/functions/.env` contient `GOOGLE_SA_KEY_BASE64` (clé service account, base64 du JSON)
//      ET la matrice Google est partagée (lecture) avec le client_email de ce service account.
//
// Usage :
//   node scripts/sync-sheets.mjs [club_id]      # défaut : club seed aaaaaaaa-…-0001
//   make db-sync                                # raccourci équivalent
//
// Variables lues (apps/web/.env.local, surchargées par l'environnement du shell) :
//   NEXT_PUBLIC_SUPABASE_URL | SUPABASE_URL      (défaut http://127.0.0.1:54321)
//   SUPABASE_SERVICE_ROLE_KEY                    (obligatoire — `supabase status -o env`)

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// Parse minimal d'un .env (KEY=VALUE, ignore commentaires/quotes) sans dépendance.
function loadEnvFile(path) {
  const out = {}
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return out // fichier absent → on s'appuie sur process.env
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const fileEnv = loadEnvFile(resolve(ROOT, 'apps/web/.env.local'))
const env = { ...fileEnv, ...process.env } // le shell prime sur le fichier

const baseUrl = (
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  'http://127.0.0.1:54321'
).replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const clubId = process.argv[2] || env.CLUB_ID || SEED_CLUB_ID

function fail(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

if (!serviceKey) {
  fail(
    'SUPABASE_SERVICE_ROLE_KEY manquante.\n' +
      '   Récupère-la puis relance, ex. :\n' +
      "   SUPABASE_SERVICE_ROLE_KEY=\"$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '\"')\" make db-sync"
  )
}

const endpoint = `${baseUrl}/functions/v1/sync`
console.log(`▶ Sync club ${clubId}`)
console.log(`  → POST ${endpoint}`)

try {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ club_id: clubId }),
  })

  const text = await res.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = text
  }

  if (!res.ok) {
    console.error(`\n⚠ HTTP ${res.status}`)
    console.error(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2))
    if (res.status === 404) {
      console.error(
        '\n💡 Club introuvable, ou son sheet_id est vide. Vérifie en DB :\n' +
          `   SELECT id, name, sheet_id FROM clubs WHERE id = '${clubId}';`
      )
    }
    process.exit(1)
  }

  console.log('\n✅ Réponse :')
  console.log(JSON.stringify(payload, null, 2))

  if (payload && Array.isArray(payload.errors) && payload.errors.length > 0) {
    console.error(`\n⚠ ${payload.errors.length} erreur(s) DURE(s) — données potentiellement périmées.`)
    process.exit(1)
  }
  if (payload && Array.isArray(payload.warnings) && payload.warnings.length > 0) {
    console.log(`\nℹ ${payload.warnings.length} avertissement(s) (lignes en quarantaine / non matchées).`)
  }
} catch (err) {
  const cause = err?.cause?.code || err?.code || ''
  if (cause === 'ECONNREFUSED') {
    fail(
      `Connexion refusée sur ${baseUrl}.\n` +
        '   La stack Supabase n\'est pas démarrée OU les Edge Functions ne sont pas servies.\n' +
        '   Lance dans deux terminaux :\n' +
        '     supabase start -x vector,logflare\n' +
        '     supabase functions serve --env-file supabase/functions/.env'
    )
  }
  fail(`Échec de l'appel : ${err?.message || err}`)
}
