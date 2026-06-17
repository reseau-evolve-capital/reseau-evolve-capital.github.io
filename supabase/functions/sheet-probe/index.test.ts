// Tests Deno de l'Edge Function `sheet-probe` (NET-004).
//
// EXÉCUTION (depuis la racine du repo) :
//     deno test --allow-env --config supabase/functions/sheet-probe/deno.json \
//       supabase/functions/sheet-probe/index.test.ts
//
// CE QUI EST TESTÉ — le HANDLER complet (createSheetProbeHandler) avec dépendances stubbées :
//   - createClient  → faux client n'exposant QUE .rpc() (is_network_admin) — AUCUN .from()
//                     n'est même fourni : si le handler tentait une écriture, ça throw.
//                     C'est la preuve runtime que la fonction est en LECTURE SEULE.
//   - listSheetTabs → renvoie une liste d'onglets figée, OU throw SheetMetaError (403/404).
//   - readSheet     → fixtures Base / POSITIONS pour le preview.
//
// Aucun réseau réel : tout est en mémoire (pattern sync.test.ts / handler.test.ts).

import { assert, assertEquals } from 'jsr:@std/assert@^1'

import { createSheetProbeHandler, extractSheetId, REQUIRED_TABS } from './index.ts'
import type { SheetProbeDeps } from './index.ts'
import { SheetMetaError } from './listSheetTabs.ts'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SHEET_ID = 'sheet-abc-123'

/** Onglets d'une matrice COMPLÈTE et conforme (tous les bloquants + REPORTING optionnel). */
const FULL_TABS = [...REQUIRED_TABS, 'REPORTING']

/** Fixtures de preview (mêmes layouts que sync.test.ts). */
const BASE_FIXTURE: string[][] = [
  ['Nom', 'Email', 'Entrée', 'Sortie', 'Statut', 'Demande', 'Docs', 'Tel', 'Adresse', 'Montant'],
  ['AFOUDAH Ruben', 'ruben@example.com', '01/06/2018', '', 'Membre actif', '', '', '', '', ''],
  ['KONÉ Awa', 'awa@example.com', '01/01/2020', '', 'Membre actif', '', '', '', '', ''],
]
const POSITIONS_FIXTURE: string[][] = [
  ['Nom', 'Symbole', 'Catégorie', 'Parts', 'Devise', 'Cours'],
  ['Apple', 'AAPL', 'Action', '10', 'EUR', '1 234,56'],
  ['Meta', 'NASDAQ:META', 'Action', '5', 'USD', '500'],
  ['TOTAL', '', 'Agrégat', '', '', '5 000,00'], // agrégat (symbole vide) → exclu du compte
]

interface ProbeOpts {
  /** Valeur renvoyée par rpc('is_network_admin') (défaut true). */
  isAdmin?: boolean
  /** Force une erreur sur rpc (caller non authentifié / RPC KO). */
  rpcError?: boolean
  /** Onglets renvoyés par listSheetTabs (défaut FULL_TABS). */
  tabs?: string[]
  /** Force listSheetTabs à throw cette erreur (ex. SheetMetaError 403/404). */
  tabsThrow?: Error
  /** Capture les noms d'onglets demandés à readSheet (vérifie lecture seule ciblée). */
  reads?: string[]
}

/**
 * Faux client Supabase : EXPOSE UNIQUEMENT .rpc(). Volontairement PAS de .from() — toute
 * tentative d'écriture (insert/update/upsert/delete) lèverait « client.from is not a function »,
 * ce qui ferait échouer le test. Garantie runtime que sheet-probe ne touche jamais la DB.
 */
function makeDeps(opts: ProbeOpts = {}): SheetProbeDeps {
  const client = {
    rpc(_name: string, _args?: unknown) {
      if (opts.rpcError) return Promise.resolve({ data: null, error: { message: 'no auth' } })
      return Promise.resolve({ data: opts.isAdmin ?? true, error: null })
    },
  }
  const listSheetTabs = (_sheetId: string): Promise<string[]> => {
    if (opts.tabsThrow) return Promise.reject(opts.tabsThrow)
    return Promise.resolve(opts.tabs ?? FULL_TABS)
  }
  const readSheet = (_sheetId: string, sheetName: string, _range?: string): Promise<string[][]> => {
    opts.reads?.push(sheetName)
    if (sheetName === 'Base') return Promise.resolve(BASE_FIXTURE.map((r) => [...r]))
    if (sheetName === 'POSITIONS') return Promise.resolve(POSITIONS_FIXTURE.map((r) => [...r]))
    return Promise.resolve([])
  }
  return {
    // Cast via unknown : le faux client n'expose que .rpc() (surface volontairement partielle).
    createClient: (() => client) as unknown as SheetProbeDeps['createClient'],
    listSheetTabs,
    readSheet,
    serviceAccountEmail: () => 'evolve-sa@projet.iam.gserviceaccount.com',
  }
}

function probeRequest(body: unknown, withAuth = true): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (withAuth) headers['Authorization'] = 'Bearer fake-user-jwt'
  return new Request('http://x/sheet-probe', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// Le handler lit SUPABASE_URL / SUPABASE_ANON_KEY ; createClient étant stubbé, ces valeurs
// sont inertes mais doivent exister pour ne pas planter.
Deno.env.set('SUPABASE_URL', 'http://x')
Deno.env.set('SUPABASE_ANON_KEY', 'inert-anon-key')

interface ProbeBody {
  ok?: boolean
  foundTabs?: string[]
  missingTabs?: string[]
  preview?: { members: number; positions: number }
  warnings?: string[]
  error?: string
  message?: string
}

// ── 1. Helper extractSheetId ──────────────────────────────────────────────────

Deno.test('extractSheetId : URL Google Sheets → ID', () => {
  assertEquals(
    extractSheetId('https://docs.google.com/spreadsheets/d/1AbC-dEf_123/edit#gid=0'),
    '1AbC-dEf_123'
  )
})

Deno.test('extractSheetId : ID brut conservé', () => {
  assertEquals(extractSheetId('1AbC-dEf_123'), '1AbC-dEf_123')
})

Deno.test('extractSheetId : entrée vide / invalide → null', () => {
  assertEquals(extractSheetId(''), null)
  assertEquals(extractSheetId('   '), null)
  assertEquals(extractSheetId('https://example.com/foo bar'), null)
})

// ── 2. Succès : tous les onglets présents ───────────────────────────────────────

Deno.test('handler : succès → ok=true, missingTabs vide, preview compté', async () => {
  const reads: string[] = []
  const handler = createSheetProbeHandler(makeDeps({ reads }))
  const res = await handler(probeRequest({ sheet_id: SHEET_ID }))
  assertEquals(res.status, 200)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.ok, true)
  assertEquals(body.missingTabs, [])
  assertEquals(body.foundTabs, FULL_TABS)
  // 2 membres (Base), 2 vraies positions (AAPL + META ; la ligne TOTAL agrégat exclue).
  assertEquals(body.preview?.members, 2)
  assertEquals(body.preview?.positions, 2)
  // Aucun warning : matrice complète (REPORTING présent).
  assertEquals(body.warnings, [])
  // Lecture seule ciblée : seules Base et POSITIONS sont lues pour le preview.
  assertEquals(reads.sort(), ['Base', 'POSITIONS'])
})

Deno.test('handler : accepte une URL Google Sheets en entrée', async () => {
  const handler = createSheetProbeHandler(makeDeps())
  const res = await handler(
    probeRequest({ sheet_id: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit` })
  )
  assertEquals(res.status, 200)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.ok, true)
})

Deno.test('handler : REPORTING absent → warning, pas bloquant (ok=true)', async () => {
  const handler = createSheetProbeHandler(makeDeps({ tabs: [...REQUIRED_TABS] }))
  const res = await handler(probeRequest({ sheet_id: SHEET_ID }))
  assertEquals(res.status, 200)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.ok, true)
  assertEquals(body.missingTabs, [])
  assert(body.warnings?.some((w) => w.includes('REPORTING')))
})

// ── 3. not_shared : Google renvoie 403 ─────────────────────────────────────────

Deno.test('handler : not_shared → 403 + email du Service Account, AUCUNE écriture', async () => {
  const handler = createSheetProbeHandler(
    makeDeps({ tabsThrow: new SheetMetaError('permission denied', 403) })
  )
  const res = await handler(probeRequest({ sheet_id: SHEET_ID }))
  assertEquals(res.status, 403)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.error, 'not_shared')
  // Message actionnable mentionnant l'email du SA à partager.
  assert(body.message?.includes('evolve-sa@projet.iam.gserviceaccount.com'))
})

// ── 4. missing_tabs : un onglet bloquant absent (POSITIONS) ─────────────────────

Deno.test(
  'handler : missing_tabs (POSITIONS absent) → ok=false, missingTabs=["POSITIONS"]',
  async () => {
    const tabs = REQUIRED_TABS.filter((t) => t !== 'POSITIONS')
    const handler = createSheetProbeHandler(makeDeps({ tabs: [...tabs, 'REPORTING'] }))
    const res = await handler(probeRequest({ sheet_id: SHEET_ID }))
    assertEquals(res.status, 200)
    const body = (await res.json()) as ProbeBody
    assertEquals(body.ok, false)
    assertEquals(body.missingTabs, ['POSITIONS'])
    // POSITIONS absent ⇒ pas de preview positions (mais Base reste comptée).
    assertEquals(body.preview?.positions, 0)
    assertEquals(body.preview?.members, 2)
    assert(body.warnings?.some((w) => w.includes('POSITIONS')))
  }
)

// ── 5. invalid_id : feuille introuvable (Google 404) ────────────────────────────

Deno.test('handler : feuille introuvable (404) → invalid_id', async () => {
  const handler = createSheetProbeHandler(
    makeDeps({ tabsThrow: new SheetMetaError('not found', 404) })
  )
  const res = await handler(probeRequest({ sheet_id: SHEET_ID }))
  assertEquals(res.status, 404)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.error, 'invalid_id')
})

Deno.test('handler : sheet_id manquant → 400 invalid_id', async () => {
  const handler = createSheetProbeHandler(makeDeps())
  const res = await handler(probeRequest({}))
  assertEquals(res.status, 400)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.error, 'invalid_id')
})

// ── 6. Garde caller = network_admin ─────────────────────────────────────────────

Deno.test('handler : caller non network_admin → 403 forbidden', async () => {
  const handler = createSheetProbeHandler(makeDeps({ isAdmin: false }))
  const res = await handler(probeRequest({ sheet_id: SHEET_ID }))
  assertEquals(res.status, 403)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.error, 'forbidden')
})

Deno.test('handler : rpc is_network_admin en erreur → 403 forbidden (fail-closed)', async () => {
  const handler = createSheetProbeHandler(makeDeps({ rpcError: true }))
  const res = await handler(probeRequest({ sheet_id: SHEET_ID }))
  assertEquals(res.status, 403)
  const body = (await res.json()) as ProbeBody
  assertEquals(body.error, 'forbidden')
})

// ── 7. CORS préflight ───────────────────────────────────────────────────────────

Deno.test('handler : OPTIONS préflight → 200 + en-têtes CORS', async () => {
  const handler = createSheetProbeHandler(makeDeps())
  const res = await handler(new Request('http://x/sheet-probe', { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
  assert((res.headers.get('Access-Control-Allow-Headers') ?? '').includes('authorization'))
  await res.text()
})
