#!/usr/bin/env node
// Pose le `sheet_id` d'un club en base, sans SQL manuel — lit SHEET_ID depuis l'env.
// Node pur (≥ 20, fetch global) — zéro dépendance, même esprit que sync-sheets.mjs.
//
// Source des valeurs (fusion ; le shell prime sur les fichiers) :
//   SHEET_ID                    ← supabase/functions/.env (ou apps/web/.env.local, ou shell)
//   NEXT_PUBLIC_SUPABASE_URL    ← apps/web/.env.local (défaut http://127.0.0.1:54321)
//   SUPABASE_SERVICE_ROLE_KEY   ← apps/web/.env.local (obligatoire — bypass RLS via PostgREST)
//
// Club ciblé : 1er argument, sinon $CLUB_ID, sinon le club seed « Club E2E » (supabase/seed.sql).
//
// Usage :
//   node scripts/set-sheet-id.mjs [club_id]
//   make db-set-sheet                         # club seed
//   make db-set-sheet CLUB_ID=<uuid>          # autre club
//   make db-set-sheet db-sync                 # pose le sheet_id PUIS synchronise

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SEED_CLUB_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// Parse minimal d'un .env (KEY=VALUE, ignore commentaires/quotes), fichier absent toléré.
function loadEnvFile(path) {
  const out = {}
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return out
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

// SHEET_ID peut vivre côté Edge (supabase/functions/.env) ou app (apps/web/.env.local).
const env = {
  ...loadEnvFile(resolve(ROOT, 'apps/web/.env.local')),
  ...loadEnvFile(resolve(ROOT, 'supabase/functions/.env')),
  ...process.env,
}

const baseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || 'http://127.0.0.1:54321').replace(
  /\/$/,
  ''
)
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const sheetId = env.SHEET_ID
const clubId = process.argv[2] || env.CLUB_ID || SEED_CLUB_ID

function fail(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

if (!sheetId) {
  fail(
    'SHEET_ID introuvable.\n' +
      "   Ajoute-le à supabase/functions/.env (ou apps/web/.env.local) :  SHEET_ID=<id de ta matrice>\n" +
      "   (l'id est dans l'URL Google : .../spreadsheets/d/<SHEET_ID>/edit)"
  )
}
if (!serviceKey) {
  fail(
    'SUPABASE_SERVICE_ROLE_KEY manquante.\n' +
      "   SUPABASE_SERVICE_ROLE_KEY=\"$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '\"')\" make db-set-sheet"
  )
}

const endpoint = `${baseUrl}/rest/v1/clubs?id=eq.${encodeURIComponent(clubId)}`
console.log(`▶ Pose sheet_id="${sheetId}" sur le club ${clubId}`)
console.log(`  → PATCH ${endpoint}`)

try {
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ sheet_id: sheetId }),
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
    process.exit(1)
  }

  if (Array.isArray(payload) && payload.length === 0) {
    fail(
      `Aucun club avec id="${clubId}" en base.\n` +
        '   Vérifie le seed (make db-reset) ou passe le bon CLUB_ID. Clubs existants :\n' +
        `   curl -s "${baseUrl}/rest/v1/clubs?select=id,name,sheet_id" -H "apikey: <service_role>"`
    )
  }

  const row = Array.isArray(payload) ? payload[0] : payload
  console.log('\n✅ Club mis à jour :')
  console.log(JSON.stringify({ id: row.id, name: row.name, sheet_id: row.sheet_id }, null, 2))
  console.log('\nProchaine étape :  make db-sync   (Edge Functions servies + GOOGLE_SA_KEY_BASE64 requis)')
} catch (err) {
  const cause = err?.cause?.code || err?.code || ''
  if (cause === 'ECONNREFUSED') {
    fail(
      `Connexion refusée sur ${baseUrl}.\n` +
        "   La stack Supabase n'est pas démarrée :  supabase start -x vector,logflare"
    )
  }
  fail(`Échec de l'appel : ${err?.message || err}`)
}
