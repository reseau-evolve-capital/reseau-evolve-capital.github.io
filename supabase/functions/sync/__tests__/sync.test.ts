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

/**
 * Upsert idempotent dans une table : MERGE la ligne en conflit, sinon insère.
 * Fidélité Postgres : `ON CONFLICT DO UPDATE SET col=excluded.col` ne touche que
 * les colonnes fournies par le payload — les colonnes absentes (ex.
 * clubs.last_error_email_sent_at, géré hors-sync par NTF-003) sont PRÉSERVÉES.
 * (Un remplacement complet les effacerait à tort à chaque sync.)
 */
function upsertRows(table: Row[], incoming: Row[], onConflict: string): void {
  const keys = onConflict.split(',').map((k) => k.trim())
  for (const row of incoming) {
    const idx = table.findIndex((existing) => sameKey(existing, row, keys))
    if (idx >= 0) {
      table[idx] = { ...table[idx], ...row }
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

/** Enregistre les appels rpc() pour vérifier que le refresh de la MV a bien eu lieu. */
interface RpcCalls {
  names: string[]
}

function makeMockClient(store: Store, rpcCalls?: RpcCalls): { client: SupabaseLike } {
  // Builder par requête : accumule la table, l'opération et les filtres, puis
  // calcule le résultat au moment du `await` (then).
  class QueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
    private filters: Array<{ col: string; val: unknown }> = []
    private inFilter: { col: string; vals: unknown[] } | null = null
    private op: 'select' | 'upsert' | 'insert' | 'delete' | 'update' = 'select'
    private payload: Row[] = []
    private onConflict = ''
    private selectCols = ''

    constructor(private table: keyof Store) {}

    select(cols?: string): this {
      // .select() après un write (upsert/insert) signifie "returning" — on ne réinitialise pas l'op.
      this.selectCols = cols ?? ''
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
        // Deux formes de select sur memberships :
        //  - sync : .select('id, user_id, users!inner(full_name)')
        //  - alerte NTF-003 : .select('users!inner(email)') filtré par role.
        if (this.selectCols.includes('email')) {
          return rows.map((m) => {
            const u = store.users.find((x) => x.id === m.user_id)
            return { users: { email: (u?.email as string) ?? '' } }
          })
        }
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
    rpc(name: string, _args?: unknown) {
      // refresh_member_quote_part / get_user_role_in_club → no-op succès.
      // On enregistre le nom pour permettre aux tests de vérifier que le refresh a eu lieu.
      rpcCalls?.names.push(name)
      return Promise.resolve({ data: null, error: null })
    },
    // maybeSingle/single sont fournis sur QueryBuilder mais ne sont pas thenables
    // tant qu'on ne les appelle pas : le handler les appelle explicitement.
  }
  // Le handler n'utilise que .from() et .rpc() : la forme ci-dessus suffit.
  // Cast vers le type complet (structure partielle volontaire — surface couverte).
  return { client: client as unknown as SupabaseLike }
}

/** Enregistre les appels à l'alerte email d'erreur de sync (NTF-003). */
interface EmailSends {
  calls: Array<{ clubName: string; errorMessage: string; recipients: string[] }>
}

/** Construit le handler avec un store donné + readSheet stubbé (optionnellement défaillant). */
function buildHandler(
  store: Store,
  opts?: {
    order?: string[]
    throwOn?: string
    overrides?: Record<string, string[][]>
    rpcCalls?: RpcCalls
    emailSends?: EmailSends
  }
): (req: Request) => Promise<Response> {
  const mockReadSheet: SyncDeps['readSheet'] = (_sheetId: string, sheetName: string) => {
    opts?.order?.push(sheetName)
    if (opts?.throwOn && sheetName === opts.throwOn) {
      return Promise.reject(new Error(`lecture ${sheetName} indisponible (stub)`))
    }
    const override = opts?.overrides?.[sheetName]
    if (override) return Promise.resolve(override.map((row) => [...row]))
    return Promise.resolve(cloneSheet(sheetName))
  }
  const { client } = makeMockClient(store, opts?.rpcCalls)
  const sendSyncErrorEmail: SyncDeps['sendSyncErrorEmail'] = (ctx) => {
    opts?.emailSends?.calls.push({
      clubName: ctx.clubName,
      errorMessage: ctx.errorMessage,
      recipients: ctx.recipients,
    })
    return Promise.resolve()
  }
  return createSyncHandler({
    createClient: (() => client) as SyncDeps['createClient'],
    readSheet: mockReadSheet,
    sendSyncErrorEmail,
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
  warnings: string[]
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
  const rpcCalls: RpcCalls = { names: [] }
  const handler = buildHandler(store, { rpcCalls })
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  const body = (await res.json()) as SyncResponseBody
  assertEquals(body.success, true)
  assertEquals(body.errors.length, 0)
  // Fixtures propres : aucun warning non plus.
  assertEquals(body.warnings.length, 0)
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
  // Une sync propre rafraîchit bien la MV des quote-parts.
  assert(rpcCalls.names.includes('refresh_member_quote_part'))
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

// Test 3 — erreur DURE : HISTORIQUE.readSheet throw → exception attrapée par runSheet →
//          snapshot failed + errors[], MAIS les feuilles suivantes (COTISATIONS, Details)
//          passent. success=false et le refresh de la MV est SAUTÉ (gate sur errors durs).
Deno.test(
  'handler : erreur dure (HISTORIQUE throw) → snapshot failed, sync continue, MV non rafraîchie',
  async () => {
    const store = emptyStore(true)
    const rpcCalls: RpcCalls = { names: [] }
    const handler = buildHandler(store, { throwOn: 'HISTORIQUE', rpcCalls })
    const res = await handler(syncRequest(CLUB_ID))
    assertEquals(res.status, 200) // le handler répond toujours 200 ; success encode l'échec
    const body = (await res.json()) as SyncResponseBody

    assertEquals(body.success, false)
    // HISTORIQUE échoue : snapshot failed + entrée errors (DURE), absente de synced_sheets.
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
    // Erreur DURE → le refresh de la MV est sauté (gate errors.length === 0).
    assert(!rpcCalls.names.includes('refresh_member_quote_part'))
  }
)

// Test 3bis — quarantaine MOLLE : une ligne Portefeuille à quantité illisible est écartée
//             AVANT l'upsert → snapshot 'partial', la mauvaise ligne absente du store,
//             les lignes valides présentes. C'est une anomalie RÉCUPÉRABLE : pas d'erreur
//             dure (success=true), la note va dans warnings[] + snapshot.error_message,
//             et la MV est tout de même rafraîchie.
Deno.test(
  'handler : quarantaine Portefeuille (quantité illisible) → warning, snapshot partial, MV rafraîchie',
  async () => {
    const store = emptyStore(true)
    const rpcCalls: RpcCalls = { names: [] }
    // AAPL : quantité valide ; BADQ : quantité non parsable (→ null après mapper) → écartée.
    const handler = buildHandler(store, {
      rpcCalls,
      overrides: {
        Portefeuille: [
          ['Nom', 'Symbole', 'Catégorie', 'Parts', 'Devise', 'Cours'],
          ['Apple', 'AAPL', 'Action', '10', 'EUR', '1 234,56'],
          ['BadCo', 'BADQ', 'Action', 'NON_NUM', 'EUR', '200'],
          ['TOTAL', '', 'Agrégat', '', '', '5 000,00'],
        ],
      },
    })
    const res = await handler(syncRequest(CLUB_ID))
    assertEquals(res.status, 200)
    const body = (await res.json()) as SyncResponseBody

    // Anomalie MOLLE → pas d'erreur dure : success reste true et errors[] est vide.
    assertEquals(body.success, true)
    assertEquals(body.errors.length, 0)
    // Le snapshot Portefeuille est partiel (1 ligne écartée), pas failed.
    assertEquals(body.snapshots['Portefeuille'].status, 'partial')
    // La ligne valide est en base, la mauvaise est absente.
    assertEquals(store.positions.length, 1)
    assertEquals(store.positions[0].symbol, 'AAPL')
    assert(!store.positions.some((p) => p.symbol === 'BADQ'))
    // La feuille reste comptée comme synchronisée (pas d'abort).
    assert(body.synced_sheets.includes('Portefeuille'))
    // La note part dans warnings[] (pas errors[]) et dans le snapshot.error_message.
    assert(body.warnings.some((w) => w.includes('BADQ')))
    const snap = store.sheet_snapshots.find((s) => s.sheet_name === 'Portefeuille')
    assert(snap !== undefined)
    assert(String(snap.error_message ?? '').includes('BADQ'))
    // Malgré le warning, la MV est rafraîchie (gate sur erreurs DURES uniquement).
    assert(rpcCalls.names.includes('refresh_member_quote_part'))
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

// ===========================================================================
// 4. ALERTE EMAIL TRÉSORIERS (NTF-003) — seuil anti-spam 4h
// ===========================================================================

import {
  cleanErrorMessage,
  shouldSendAlert,
  buildBrevoPayload,
  ALERT_THROTTLE_MS,
} from '../syncErrorAlert.ts'

/** Seede un trésorier (user + membership role=treasurer) pour le club courant. */
function seedTreasurer(store: Store): void {
  const userId = 'user-treso'
  store.users.push({ id: userId, email: 'treso@club.fr', full_name: 'Trésorier' })
  store.memberships.push({
    id: 'm-treso',
    user_id: userId,
    club_id: CLUB_ID,
    role: 'treasurer',
    joined_at: '2020-01-01',
  })
}

// Helper-level — cleanErrorMessage retire stack/préfixes et garde un texte métier lisible.
Deno.test('cleanErrorMessage : retire le préfixe feuille/impl. et la stack', () => {
  assertEquals(
    cleanErrorMessage('upsert clubs: Colonne "Prix de revient" introuvable\n  at foo (x.ts:1)'),
    'Colonne "Prix de revient" introuvable'
  )
  assertEquals(cleanErrorMessage('Error: timeout réseau'), 'timeout réseau')
  assertEquals(cleanErrorMessage('   '), 'Erreur inconnue lors de la synchronisation.')
})

// Helper-level — shouldSendAlert applique strictement la fenêtre de 4h.
Deno.test('shouldSendAlert : NULL → autorisé ; < 4h → bloqué ; >= 4h → autorisé', () => {
  const now = new Date('2026-06-05T12:00:00Z')
  assertEquals(shouldSendAlert(null, now), true)
  assertEquals(shouldSendAlert(undefined, now), true)
  // Il y a 3h59 → encore dans la fenêtre → bloqué.
  const recent = new Date(now.getTime() - (ALERT_THROTTLE_MS - 60_000)).toISOString()
  assertEquals(shouldSendAlert(recent, now), false)
  // Il y a 4h01 → fenêtre écoulée → autorisé.
  const old = new Date(now.getTime() - (ALERT_THROTTLE_MS + 60_000)).toISOString()
  assertEquals(shouldSendAlert(old, now), true)
})

// Helper-level — buildBrevoPayload assemble le payload SMTP Brevo attendu.
Deno.test('buildBrevoPayload : sujet, destinataires et HTML', () => {
  const payload = buildBrevoPayload(
    {
      clubName: 'Cercle Arago',
      syncTime: new Date('2026-06-05T09:00:00Z'),
      errorMessage: 'msg',
      recipients: ['a@x.fr', 'b@x.fr'],
    },
    '<html>…</html>'
  )
  assertEquals(payload.subject, 'Erreur de synchronisation — Cercle Arago')
  assertEquals(payload.to, [{ email: 'a@x.fr' }, { email: 'b@x.fr' }])
  assertEquals(payload.htmlContent, '<html>…</html>')
})

// Test NTF-003 a — 1re erreur dure + trésorier + last_error_email_sent_at NULL →
// l'email est envoyé et clubs.last_error_email_sent_at est renseigné.
Deno.test(
  'handler : erreur dure + trésorier, seuil non atteint (NULL) → email envoyé + horodatage MAJ',
  async () => {
    const store = emptyStore(true)
    seedTreasurer(store)
    const emailSends: EmailSends = { calls: [] }
    // HISTORIQUE throw → erreur dure (errors.length > 0).
    const handler = buildHandler(store, { throwOn: 'HISTORIQUE', emailSends })
    const res = await handler(syncRequest(CLUB_ID))
    assertEquals(res.status, 200)
    const body = (await res.json()) as SyncResponseBody
    assertEquals(body.success, false)

    // L'alerte est partie au trésorier (et à lui seul — les membres normaux exclus).
    assertEquals(emailSends.calls.length, 1)
    assertEquals(emailSends.calls[0].recipients, ['treso@club.fr'])
    // Le message transmis est nettoyé (texte métier, pas de préfixe « HISTORIQUE: »).
    assert(!emailSends.calls[0].errorMessage.startsWith('HISTORIQUE:'))
    // L'horodatage anti-spam est désormais renseigné sur le club.
    const club = store.clubs.find((c) => c.id === CLUB_ID)
    assert(club !== undefined)
    assert(typeof club.last_error_email_sent_at === 'string')
  }
)

// Test NTF-003 b — APRÈS le seuil : last_error_email_sent_at récent (< 4h) →
// pas de nouvel envoi (anti-spam), même en présence d'une erreur dure.
Deno.test(
  'handler : erreur dure mais alerte < 4h → seuil anti-spam → AUCUN nouvel envoi',
  async () => {
    const store = emptyStore(true)
    seedTreasurer(store)
    // Une alerte a été émise il y a 1h → toujours dans la fenêtre de 4h.
    const club = store.clubs.find((c) => c.id === CLUB_ID)
    assert(club !== undefined)
    club.last_error_email_sent_at = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const sentBefore = club.last_error_email_sent_at

    const emailSends: EmailSends = { calls: [] }
    const handler = buildHandler(store, { throwOn: 'HISTORIQUE', emailSends })
    const res = await handler(syncRequest(CLUB_ID))
    assertEquals(res.status, 200)
    const body = (await res.json()) as SyncResponseBody
    assertEquals(body.success, false)

    // Seuil non écoulé → aucun email, horodatage inchangé.
    assertEquals(emailSends.calls.length, 0)
    assertEquals(club.last_error_email_sent_at, sentBefore)
  }
)

// Test NTF-003 c — sync RÉUSSIE (aucune erreur dure) → jamais d'alerte email.
Deno.test('handler : sync réussie → aucune alerte email', async () => {
  const store = emptyStore(true)
  seedTreasurer(store)
  const emailSends: EmailSends = { calls: [] }
  const handler = buildHandler(store, { emailSends })
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  const body = (await res.json()) as SyncResponseBody
  assertEquals(body.success, true)
  assertEquals(emailSends.calls.length, 0)
})
