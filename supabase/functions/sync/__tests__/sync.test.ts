// Tests Deno de l'Edge Function `sync` (SHE-008).
//
// CONTEXTE D'EXÉCUTION
// --------------------
// Ces tests utilisent le harnais de test standard Deno (`Deno.test`) et la lib
// d'assertions `@std/assert`. Ils se lancent avec :
//
//     deno test --allow-env --config supabase/functions/sync/deno.json \
//       supabase/functions/sync/__tests__/sync.test.ts
//
// (depuis la racine du repo).
//
// CE QUI EST TESTÉ
// ----------------
// 1. Les parsers de bas niveau (sheetParsers.ts) : matrice brute string[][] →
//    *RowDTO[]. Pur, sans I/O.
// 2. Le checksum SHA-256 du snapshot (snapshot.ts → sha256Hex) : déterministe.
// 3. Le HANDLER complet (createSyncHandler) avec dépendances stubbées :
//    - createClient → un faux client Supabase à store en mémoire ;
//    - readSheet → des fixtures figées par feuille.
//    Depuis SHE-008, index.ts expose `createSyncHandler({ createClient, readSheet })`
//    (seam d'injection), ce qui rend les 5 tests handler RUNNABLES sans stack
//    Supabase locale ni `functions serve`.
//
// Les 5 tests handler couvrent : sync complète (200, 6 feuilles), idempotence
// (2 syncs → même état), panne partielle (HISTORIQUE throw → snapshot failed,
// les autres feuilles passent), club introuvable (404), ordre impératif
// (PARAMETRAGES traité avant Base).

import { assert, assertEquals, assertNotEquals } from 'jsr:@std/assert@^1'

import {
  parseParametrages,
  parseBase,
  parsePortefeuille,
  parseHistorique,
  parseCotisations,
} from '../sheetParsers.ts'
import { sha256Hex } from '../snapshot.ts'
import { createSyncHandler } from '../index.ts'
import type { SyncDeps } from '../index.ts'

// ===========================================================================
// 1. PARSERS (sheetParsers) — string[][] brut → *RowDTO[]
// ===========================================================================

Deno.test('parseParametrages : structure clé/valeur (A=libellé, B=valeur) → ClubRowDTO', () => {
  const raw: string[][] = [
    ['Paramètre', 'Valeur'], // en-tête (sautée)
    ['Nom du club', 'Évolve Capital'],
    ['Cotisation min', '100'],
    ['Pénalité', '5'],
    ['Ville', 'Paris'],
    ['Pays', 'France'],
  ]
  const rows = parseParametrages(raw)
  assertEquals(rows.length, 1)
  assertEquals(rows[0].clubName, 'Évolve Capital')
  assertEquals(rows[0].minContribution, 100)
  assertEquals(rows[0].penaltyRate, 5)
  assertEquals(rows[0].city, 'Paris')
  assertEquals(rows[0].country, 'France')
})

Deno.test('parseBase : colonnes A..J → BaseRowDTO (lignes vides filtrées)', () => {
  const raw: string[][] = [
    ['Nom', 'Email', 'Entrée', 'Sortie', 'Statut', 'Demande', 'Docs', 'Tel', 'Adresse', 'Montant'],
    [
      'AFOUDAH Ruben',
      'ruben@example.com',
      '01/06/2018',
      '',
      'Membre actif',
      '',
      '',
      '0600',
      '1 rue A',
      '',
    ],
    [
      'KONÉ Awa',
      'awa@example.com',
      '01/01/2020',
      '31/12/2023',
      'Membre sorti',
      '',
      '',
      '',
      '',
      '1500',
    ],
    ['', '', '', '', '', '', '', '', '', ''], // ligne vide → filtrée
  ]
  const rows = parseBase(raw)
  assertEquals(rows.length, 2)
  assertEquals(rows[0].fullName, 'AFOUDAH Ruben')
  assertEquals(rows[0].email, 'ruben@example.com')
  assertEquals(rows[0].joinedAt, '01/06/2018')
  assertEquals(rows[0].leftAt, null) // colonne vide → null
  assertEquals(rows[0].status, 'Membre actif')
  assertEquals(rows[1].status, 'Membre sorti')
  assertEquals(rows[1].leftWithAmount, 1500) // colonne J numérique
})

Deno.test('parsePortefeuille : symbole vide conservé (ligne d agrégat) + numériques FR', () => {
  const raw: string[][] = [
    ['Nom', 'Symbole', 'Catégorie', 'Parts', 'Devise', 'Cours'],
    ['Apple', 'AAPL', 'Action', '10', 'EUR', '1 234,56'], // NBSP milliers + virgule décimale FR
    ['TOTAL', '', 'Agrégat', '', '', '5 000,00'], // symbole vide → ligne d'agrégat
  ]
  const rows = parsePortefeuille(raw)
  assertEquals(rows.length, 2)
  assertEquals(rows[0].symbol, 'AAPL')
  assertEquals(rows[0].quantity, 10)
  assertEquals(rows[0].marketPriceEur, 1234.56) // format FR correctement normalisé
  assertEquals(rows[1].symbol, '') // agrégat : symbole vide préservé pour le mapper
})

Deno.test('parseHistorique : ordre des colonnes A=Date, B=Type, C=Symbole…', () => {
  const raw: string[][] = [
    ['Date', 'Type', 'Symbole', 'Nom', 'Quantité', 'Prix', 'Total', 'Notes'],
    ['01/06/2018', 'Achat', 'AAPL', 'Apple', '10', '100', '1000', 'note'],
  ]
  const rows = parseHistorique(raw)
  assertEquals(rows.length, 1)
  assertEquals(rows[0].transactionDate, '01/06/2018')
  assertEquals(rows[0].type, 'Achat')
  assertEquals(rows[0].symbol, 'AAPL')
  assertEquals(rows[0].quantity, 10)
})

Deno.test('parseCotisations : valeur non parsable → null (jamais NaN)', () => {
  const raw: string[][] = [
    ['Nom', 'Nb mois', 'Quote-part', 'Pénalités', 'Total', 'Valo', 'Statut', 'Dû'],
    ['AFOUDAH Ruben', '90', '33,3', '0', '9000', 'NON_NUM', 'À jour', '0'],
  ]
  const rows = parseCotisations(raw)
  assertEquals(rows.length, 1)
  assertEquals(rows[0].fullName, 'AFOUDAH Ruben')
  assertEquals(rows[0].monthsCount, 90)
  assertEquals(rows[0].detentionPct, 33.3)
  assertEquals(rows[0].netMarketValue, null) // "NON_NUM" → null, pas NaN
  assertEquals(rows[0].status, 'À jour')
})

// ===========================================================================
// 2. CHECKSUM SNAPSHOT (sha256Hex) — déterministe & sensible
// ===========================================================================

Deno.test('sha256Hex : déterministe pour une même entrée', async () => {
  const input = [
    ['Nom', 'Symbole'],
    ['Apple', 'AAPL'],
  ]
  const a = await sha256Hex(input)
  const b = await sha256Hex(input)
  assertEquals(a, b)
  // Format : 64 caractères hexadécimaux.
  assertEquals(a.length, 64)
  assertEquals(/^[0-9a-f]{64}$/.test(a), true)
})

Deno.test('sha256Hex : change si l entrée change', async () => {
  const a = await sha256Hex([['Apple', 'AAPL']])
  const b = await sha256Hex([['Apple', 'MSFT']])
  assertNotEquals(a, b)
})

// ===========================================================================
// 3. HANDLER (createSyncHandler) — client Supabase + readSheet stubbés
// ===========================================================================

const CLUB_ID = 'club-1'
const SHEET_ID = 'sheet-abc'

/** Fixtures figées par nom de feuille (matrices brutes string[][] façon readSheet). */
const SHEETS: Readonly<Record<string, readonly (readonly string[])[]>> = Object.freeze({
  PARAMETRAGES: Object.freeze([
    ['Paramètre', 'Valeur'],
    ['Nom du club', 'Évolve Capital'],
    ['Cotisation min', '100'],
    ['Pénalité', '5'],
    ['Ville', 'Paris'],
    ['Pays', 'France'],
  ]),
  Base: Object.freeze([
    ['Nom', 'Email', 'Entrée', 'Sortie', 'Statut', 'Demande', 'Docs', 'Tel', 'Adresse', 'Montant'],
    [
      'AFOUDAH Ruben',
      'ruben@example.com',
      '01/06/2018',
      '',
      'Membre actif',
      '',
      '',
      '0600',
      '1 rue A',
      '',
    ],
    [
      'KONÉ Awa',
      'awa@example.com',
      '01/01/2020',
      '31/12/2023',
      'Membre sorti',
      '',
      '',
      '',
      '',
      '1500',
    ],
  ]),
  Portefeuille: Object.freeze([
    ['Nom', 'Symbole', 'Catégorie', 'Parts', 'Devise', 'Cours'],
    ['Apple', 'AAPL', 'Action', '10', 'EUR', '1 234,56'],
    ['TOTAL', '', 'Agrégat', '', '', '5 000,00'],
  ]),
  HISTORIQUE: Object.freeze([
    ['Date', 'Type', 'Symbole', 'Nom', 'Quantité', 'Prix', 'Total', 'Notes'],
    ['01/06/2018', 'Achat', 'AAPL', 'Apple', '10', '100', '1000', 'note'],
  ]),
  COTISATIONS: Object.freeze([
    ['Nom', 'Nb mois', 'Quote-part', 'Pénalités', 'Total', 'Valo', 'Statut', 'Dû'],
    ['AFOUDAH Ruben', '90', '33,3', '0', '9000', '9500', 'À jour', '0'],
  ]),
  // Structure réelle (DATA_MODEL §4.4) : col0 = Periode, col1 = en-tête "100"
  // (ignorée), cols 2..n = noms complets de membres. Lignes = montants par période.
  'Details cotisations': Object.freeze([
    ['Periode', '100', 'AFOUDAH Ruben', 'KONÉ Awa'],
    ['juin 2018', '', '100', '100'],
    ['juillet 2018', '', '100', '0'],
  ]),
})

/** Clone profond d'une fixture figée vers un string[][] mutable (readSheet renvoie du mutable). */
function cloneSheet(name: string): string[][] {
  const fixture = SHEETS[name]
  if (!fixture) return []
  return fixture.map((row) => [...row])
}

/** Type d'une ligne stockée en table (objet libre — on ne type pas chaque colonne ici). */
type Row = Record<string, unknown>

/** Store en mémoire : une entrée par table. */
interface Store {
  clubs: Row[]
  users: Row[]
  memberships: Row[]
  positions: Row[]
  transactions: Row[]
  contributions: Row[]
  contribution_months: Row[]
  sheet_snapshots: Row[]
}

function emptyStore(seedClub: boolean): Store {
  return {
    clubs: seedClub ? [{ id: CLUB_ID, sheet_id: SHEET_ID }] : [],
    users: [],
    memberships: [],
    positions: [],
    transactions: [],
    contributions: [],
    contribution_months: [],
    sheet_snapshots: [],
  }
}

/** id utilisateur déterministe à partir de l'email → idempotence des selects/upserts. */
function userIdFromEmail(email: string): string {
  return `user-${email}`
}

/** Égalité de clé composite pour les upserts onConflict (ex. 'user_id,club_id'). */
function sameKey(a: Row, b: Row, keys: string[]): boolean {
  return keys.every((k) => a[k] === b[k])
}

/** Upsert idempotent dans une table : remplace la ligne en conflit, sinon insère. */
function upsertRows(table: Row[], incoming: Row[], onConflict: string): void {
  const keys = onConflict.split(',').map((k) => k.trim())
  for (const row of incoming) {
    const idx = table.findIndex((existing) => sameKey(existing, row, keys))
    if (idx >= 0) {
      table[idx] = { ...row }
    } else {
      table.push({ ...row })
    }
  }
}

/**
 * Construit un faux client Supabase suffisant pour le handler `sync`.
 * Le builder est à la fois chaînable (.eq/.in/.select…) et awaitable (thenable)
 * et résout vers `{ data, error }`, comme le vrai client supabase-js.
 */
type SupabaseLike = ReturnType<SyncDeps['createClient']>

function makeMockClient(store: Store): { client: SupabaseLike } {
  // Builder par requête : accumule la table, l'opération et les filtres, puis
  // calcule le résultat au moment du `await` (then).
  class QueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
    private filters: Array<{ col: string; val: unknown }> = []
    private inFilter: { col: string; vals: unknown[] } | null = null
    private op: 'select' | 'upsert' | 'insert' | 'delete' | 'update' = 'select'
    private payload: Row[] = []
    private onConflict = ''

    constructor(private table: keyof Store) {}

    select(_cols?: string): this {
      // .select() après un write (upsert/insert) signifie "returning" — on ne réinitialise pas l'op.
      return this
    }
    eq(col: string, val: unknown): this {
      this.filters.push({ col, val })
      return this
    }
    in(col: string, vals: unknown[]): this {
      this.inFilter = { col, vals }
      return this
    }
    upsert(rows: Row | Row[], opts?: { onConflict?: string }): this {
      this.op = 'upsert'
      this.payload = Array.isArray(rows) ? rows : [rows]
      this.onConflict = opts?.onConflict ?? ''
      return this
    }
    insert(rows: Row | Row[]): this {
      this.op = 'insert'
      this.payload = Array.isArray(rows) ? rows : [rows]
      return this
    }
    update(row: Row): this {
      this.op = 'update'
      this.payload = [row]
      return this
    }
    delete(): this {
      this.op = 'delete'
      return this
    }

    private matches(r: Row): boolean {
      for (const f of this.filters) {
        if (r[f.col] !== f.val) return false
      }
      if (this.inFilter && !this.inFilter.vals.includes(r[this.inFilter.col])) return false
      return true
    }

    private rows(): Row[] {
      return store[this.table].filter((r) => this.matches(r))
    }

    private resolve(): { data: unknown; error: unknown } {
      const table = store[this.table]
      switch (this.op) {
        case 'select':
          return { data: this.computeSelectData(), error: null }
        case 'upsert':
          upsertRows(table, this.withUserIds(this.payload), this.onConflict)
          return { data: null, error: null }
        case 'insert':
          for (const row of this.withUserIds(this.payload)) table.push({ ...row })
          return { data: null, error: null }
        case 'update': {
          const upd = this.payload[0] ?? {}
          for (const r of table) {
            if (this.matches(r)) Object.assign(r, upd)
          }
          return { data: null, error: null }
        }
        case 'delete': {
          const kept = table.filter((r) => !this.matches(r))
          store[this.table] = kept
          return { data: null, error: null }
        }
        default:
          return { data: null, error: null }
      }
    }

    /** users.upsert : assigne un id déterministe par email (simule la séquence DB). */
    private withUserIds(rows: Row[]): Row[] {
      if (this.table !== 'users') return rows
      return rows.map((r) => (r.id ? r : { ...r, id: userIdFromEmail(String(r.email)) }))
    }

    /** Calcule le data d'un select, avec jointure users!inner sur memberships. */
    private computeSelectData(): unknown {
      const rows = this.rows()
      if (this.table === 'memberships') {
        // .select('id, user_id, users!inner(full_name)') → on joint le full_name.
        return rows.map((m) => {
          const u = store.users.find((x) => x.id === m.user_id)
          return {
            id: m.id,
            user_id: m.user_id,
            users: { full_name: (u?.full_name as string) ?? '' },
          }
        })
      }
      if (this.table === 'users') {
        return rows.map((u) => ({ id: u.id, email: u.email }))
      }
      return rows
    }

    maybeSingle(): { data: unknown; error: unknown } {
      const data = this.computeSelectData() as unknown[]
      return { data: data.length > 0 ? data[0] : null, error: null }
    }
    single(): { data: unknown; error: unknown } {
      const data = this.computeSelectData() as unknown[]
      return data.length > 0
        ? { data: data[0], error: null }
        : { data: null, error: { message: 'no rows' } }
    }

    then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
      onfulfilled?:
        | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
      return Promise.resolve(this.resolve()).then(onfulfilled, onrejected)
    }
  }

  const client = {
    from(table: keyof Store) {
      return new QueryBuilder(table)
    },
    rpc(_name: string, _args?: unknown) {
      // refresh_member_quote_part / get_user_role_in_club → no-op succès.
      return Promise.resolve({ data: null, error: null })
    },
    // maybeSingle/single sont fournis sur QueryBuilder mais ne sont pas thenables
    // tant qu'on ne les appelle pas : le handler les appelle explicitement.
  }
  // Le handler n'utilise que .from() et .rpc() : la forme ci-dessus suffit.
  // Cast vers le type complet (structure partielle volontaire — surface couverte).
  return { client: client as unknown as SupabaseLike }
}

/** Construit le handler avec un store donné + readSheet stubbé (optionnellement défaillant). */
function buildHandler(
  store: Store,
  opts?: { order?: string[]; throwOn?: string }
): (req: Request) => Promise<Response> {
  const mockReadSheet: SyncDeps['readSheet'] = (_sheetId: string, sheetName: string) => {
    opts?.order?.push(sheetName)
    if (opts?.throwOn && sheetName === opts.throwOn) {
      return Promise.reject(new Error(`lecture ${sheetName} indisponible (stub)`))
    }
    return Promise.resolve(cloneSheet(sheetName))
  }
  const { client } = makeMockClient(store)
  return createSyncHandler({
    createClient: (() => client) as SyncDeps['createClient'],
    readSheet: mockReadSheet,
  })
}

function syncRequest(clubId: string): Request {
  return new Request('http://x/sync', {
    method: 'POST',
    body: JSON.stringify({ club_id: clubId }),
  })
}

// Le handler lit SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ; createClient étant
// stubbé, ces valeurs sont inertes mais doivent exister pour ne pas planter.
Deno.env.set('SUPABASE_URL', 'http://x')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'inert-test-key')

interface SyncResponseBody {
  success: boolean
  club_id: string
  synced_sheets: string[]
  errors: string[]
  duration_ms: number
  snapshots: Record<string, { status: string; checksum: string; row_count: number }>
}

const SHEET_ORDER = [
  'PARAMETRAGES',
  'Base',
  'Portefeuille',
  'HISTORIQUE',
  'COTISATIONS',
  'Details cotisations',
]

// Test 1 — sync complète : 200, success=true, les 6 feuilles synchronisées.
Deno.test('handler : sync complète → 200, success=true, 6 feuilles synchronisées', async () => {
  const store = emptyStore(true)
  const handler = buildHandler(store)
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  const body = (await res.json()) as SyncResponseBody
  assertEquals(body.success, true)
  assertEquals(body.errors.length, 0)
  assertEquals(body.synced_sheets.length, 6)
  assertEquals(body.synced_sheets, SHEET_ORDER)
  // Données effectivement importées dans le store.
  assertEquals(store.users.length, 2)
  assertEquals(store.memberships.length, 2)
  assertEquals(store.positions.length, 1) // AAPL ; la ligne d'agrégat (symbole vide) exclue
  assertEquals(store.transactions.length, 1)
  // Un snapshot par feuille, tous en succès.
  assertEquals(Object.keys(body.snapshots).length, 6)
  for (const name of SHEET_ORDER) {
    assertEquals(body.snapshots[name].status, 'success')
  }
})

// Test 2 — idempotence : 2 syncs successives → même état final en DB.
Deno.test('handler : idempotence → 2 syncs produisent le même état final', async () => {
  const store = emptyStore(true)
  const handler = buildHandler(store)

  // `synced_at` est un horodatage volatile (Date.now() à chaque sync) : on le retire
  // avant comparaison. L'idempotence porte sur l'identité des lignes (clés/valeurs
  // métier), pas sur l'instant de synchronisation.
  const stripVolatile = (rows: Row[]): Row[] =>
    rows.map((r) => {
      const { synced_at: _omit, ...rest } = r as Row & { synced_at?: unknown }
      return rest
    })
  const snapshotState = (): Record<string, Row[]> => ({
    users: stripVolatile(structuredClone(store.users)),
    memberships: stripVolatile(structuredClone(store.memberships)),
    positions: stripVolatile(structuredClone(store.positions)),
    transactions: stripVolatile(structuredClone(store.transactions)),
    contributions: stripVolatile(structuredClone(store.contributions)),
    contribution_months: stripVolatile(structuredClone(store.contribution_months)),
  })

  const res1 = await handler(syncRequest(CLUB_ID))
  assertEquals(res1.status, 200)
  const snapshot1 = snapshotState()

  const res2 = await handler(syncRequest(CLUB_ID))
  assertEquals(res2.status, 200)
  const snapshot2 = snapshotState()

  // Les tables métier sont strictement identiques après la 2e sync (aucun doublon).
  assertEquals(snapshot2, snapshot1)
  assertEquals(store.users.length, 2)
  assertEquals(store.memberships.length, 2)
  assertEquals(store.positions.length, 1)
  assertEquals(store.transactions.length, 1) // delete+insert : pas d'accumulation
})

// Test 3 — panne partielle : HISTORIQUE.readSheet throw → snapshot failed +
//          erreur, MAIS les feuilles suivantes (COTISATIONS, Details) passent.
Deno.test(
  'handler : panne partielle (HISTORIQUE throw) → snapshot failed, sync continue',
  async () => {
    const store = emptyStore(true)
    const handler = buildHandler(store, { throwOn: 'HISTORIQUE' })
    const res = await handler(syncRequest(CLUB_ID))
    assertEquals(res.status, 200) // le handler répond toujours 200 ; success encode l'échec
    const body = (await res.json()) as SyncResponseBody

    assertEquals(body.success, false)
    // HISTORIQUE échoue : snapshot failed + entrée errors, absente de synced_sheets.
    assert(body.errors.some((e) => e.startsWith('HISTORIQUE:')))
    assert(!body.synced_sheets.includes('HISTORIQUE'))
    assertEquals(body.snapshots['HISTORIQUE'].status, 'failed')

    // Les feuilles AVANT et APRÈS HISTORIQUE restent synchronisées (pas d'abort).
    assert(body.synced_sheets.includes('PARAMETRAGES'))
    assert(body.synced_sheets.includes('Base'))
    assert(body.synced_sheets.includes('Portefeuille'))
    assert(body.synced_sheets.includes('COTISATIONS'))
    assert(body.synced_sheets.includes('Details cotisations'))
    assertEquals(body.snapshots['COTISATIONS'].status, 'success')
    assertEquals(body.snapshots['Details cotisations'].status, 'success')
    // Les données des autres feuilles sont bien en base.
    assertEquals(store.users.length, 2)
    assertEquals(store.positions.length, 1)
  }
)

// Test 4 — club introuvable : clubs.maybeSingle() renvoie null → HTTP 404.
Deno.test('handler : club introuvable → HTTP 404', async () => {
  const store = emptyStore(false) // aucune ligne clubs → select.maybeSingle() = null
  const handler = buildHandler(store)
  const res = await handler(syncRequest('absent'))
  assertEquals(res.status, 404)
  const body = (await res.json()) as { error: string }
  assert(body.error.includes('introuvable'))
})

// Test 5 — ordre impératif : PARAMETRAGES est traité AVANT Base.
Deno.test('handler : ordre impératif → PARAMETRAGES avant Base', async () => {
  const store = emptyStore(true)
  const order: string[] = []
  const handler = buildHandler(store, { order })
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  // L'ordre de lecture des feuilles est exactement l'ordre impératif documenté.
  assertEquals(order, SHEET_ORDER)
  const idxParam = order.indexOf('PARAMETRAGES')
  const idxBase = order.indexOf('Base')
  assert(idxParam >= 0 && idxBase >= 0)
  assert(idxParam < idxBase, 'PARAMETRAGES doit précéder Base')
})
