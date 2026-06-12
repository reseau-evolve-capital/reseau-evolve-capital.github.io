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
// Les tests handler couvrent : sync complète (200, 7 feuilles dont REPORTING),
// idempotence (2 syncs → même état), panne partielle (HISTORIQUE throw → snapshot
// failed, les autres feuilles passent), club introuvable (404), ordre impératif
// (PARAMETRAGES traité avant Base), et la feuille OPTIONNELLE REPORTING (DSH-011 :
// tout échec → warnings[], jamais errors[], success reste true).

import { assert, assertAlmostEquals, assertEquals, assertNotEquals } from 'jsr:@std/assert@^1'

import {
  parseParametrages,
  parseBase,
  parsePortefeuille,
  parseReporting,
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

Deno.test(
  'parseParametrages : capte courtier + plafond annuel (matching robuste accents/casse)',
  () => {
    const raw: string[][] = [
      ['Paramètre', 'Valeur'],
      ['Nom du club', 'Évolve Capital'],
      ['Cotisation min', '100'],
      // Casse/accents volontairement « sales » pour valider la normalisation.
      ['IDENTIFIANT DU CLUB CHEZ LE COURTIER', '85537808'],
      ['Limite de cotisation annuelle', '5 500'],
      ['Nom du courtier', 'BOURSE DIRECT'],
    ]
    const rows = parseParametrages(raw)
    // broker_account_ref reste une string brute (zéro non significatif éventuel préservé).
    assertEquals(rows[0].brokerAccountRef, '85537808')
    // Plafond annuel parsé en number (format FR avec espace insécable géré par toNumOrNull).
    assertEquals(rows[0].annualInvestmentCap, 5500)
    assertEquals(rows[0].brokerName, 'BOURSE DIRECT')
  }
)

Deno.test('parseParametrages : courtier/plafond absents → null', () => {
  const raw: string[][] = [
    ['Paramètre', 'Valeur'],
    ['Nom du club', 'Club'],
    ['Cotisation min', '0'],
  ]
  const rows = parseParametrages(raw)
  assertEquals(rows[0].brokerAccountRef, null)
  assertEquals(rows[0].annualInvestmentCap, null)
  assertEquals(rows[0].brokerName, null)
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

Deno.test('parseHistorique : layout RÉEL (col 0 = n° de ligne, date en col 8)', () => {
  // En-têtes réels relevés dans sheet_snapshots.raw_data de la matrice :
  // 0="" 1=TYPE 2=QUANTITE 3=TITRES 4=TICKER 5=TYPOLOGIE 6=PRIX D'ACHAT 7=COUT D'ACHAT 8=Date 9=JUSTIFICATIFS
  const raw: string[][] = [
    [
      '',
      'TYPE',
      'QUANTITE',
      'TITRES',
      'TICKER',
      'TYPOLOGIE',
      "PRIX D'ACHAT",
      "COUT D'ACHAT",
      'Date',
      'JUSTIFICATIFS',
    ],
    [
      '1',
      'Achat',
      '2500',
      'ACANTHE DEVELOPPEMENT',
      'ACAN',
      'Action',
      '€0,62',
      '1547,9',
      '21/9/2018',
    ],
    ['8', 'VENTE', '-64', 'BOIRON', 'BOI', 'ACTIONS', '€33,65', '-€2 153,60', '12/4/2019'],
    ['6', 'ACHAT', '12', 'FACEBOOK', 'FB', 'ACTIONS', '€136,41', '€1 636,92'], // tableau court : pas de date
  ]
  const rows = parseHistorique(raw)
  assertEquals(rows.length, 3)
  // Ligne achat : la date est bien lue en col 8 (PAS le n° de ligne en col 0)
  assertEquals(rows[0].transactionDate, '21/9/2018')
  assertEquals(rows[0].type, 'Achat')
  assertEquals(rows[0].symbol, 'ACAN')
  assertEquals(rows[0].name, 'ACANTHE DEVELOPPEMENT')
  assertEquals(rows[0].quantity, 2500)
  assertEquals(rows[0].price, 0.62) // "€0,62" nettoyé
  assertEquals(rows[0].total, 1547.9)
  // Ligne vente : quantité + total négatifs, préfixe € retiré
  assertEquals(rows[1].quantity, -64)
  assertEquals(rows[1].price, 33.65)
  assertEquals(rows[1].total, -2153.6)
  // Tableau court sans date → transactionDate null (quarantaine douce DB)
  assertEquals(rows[2].transactionDate, null)
  assertEquals(rows[2].symbol, 'FB')
})

Deno.test(
  'parseCotisations : layout RÉEL (statut col 7, montant dû col 8) + #ERROR! → null',
  () => {
    // En-têtes réels : 0=nom 1=Nb mois 2=% détention 3=pénalités 4=Total Cotisé
    // 5=Valeur nette 6=Nb normal (≠ statut) 7=Statut 8=Montant dû 9=Echéancier 10=Gain/Perte 11=Suffixe
    const raw: string[][] = [
      [
        'nom',
        'Nb de mois cotisés',
        'Pourcentage de détention',
        'pénalités dues',
        'Total Cotisé',
        'Valeur Boursière nette',
        'Nb normal de cotisations',
        'Statut',
        'Montant dû',
        'Echéancier',
        'Gain/Perte',
        'Suffixe',
      ],
      [
        'AFOUDAH Ruben',
        '#ERROR!',
        '8,99%',
        '',
        '28 000,00€',
        '68 153,14€',
        '95',
        '#ERROR!',
        '#ERROR!',
        '',
        '40 153,14€',
        '0,95',
      ],
      [
        'LASKARI Fabien',
        '#ERROR!',
        '2,20%',
        '',
        '6 855,92€',
        '16 687,59€',
        '52',
        'Situation régulière',
        '',
        '',
        '9 831,67€',
        '0,97',
      ],
      ['TOTAUX', '', '', '', '', '', '', '', '', '', '', ''],
    ]
    const rows = parseCotisations(raw)
    assertEquals(rows.length, 3)
    // Le statut est lu en col 7 (PAS "95"/"52" de la col 6 "Nb normal")
    assertEquals(rows[0].status, '#ERROR!')
    assertEquals(rows[1].status, 'Situation régulière')
    // #ERROR! numérique → null (jamais NaN, jamais de throw)
    assertEquals(rows[0].monthsCount, null)
    assertEquals(rows[0].amountDue, null) // "#ERROR!" en col 8
    assertEquals(rows[1].amountDue, null) // vide en col 8
    // % et € nettoyés (le DTO garde le pourcentage brut ; le ÷100 vit dans le mapper)
    assertEquals(rows[0].detentionPct, 8.99)
    assertEquals(rows[0].totalContributed, 28000)
    assertEquals(rows[0].netMarketValue, 68153.14)
    // Ligne TOTAUX préservée au niveau parser (filtrée par matching nom côté mapper)
    assertEquals(rows[2].fullName, 'TOTAUX')
  }
)

Deno.test(
  'parseReporting : seules les lignes datées passent (titre/en-têtes écartés sans warning)',
  () => {
    const raw: string[][] = [
      ['REPORTING — Évolve Capital', '', '', '', ''], // ligne 0 : titre matrice
      ['Date', 'Valorisation', 'Cotisations', 'Plus-value', 'Performance'], // ligne 1 : en-têtes
      ['dimanche, 03/05/2026', '697 286,83', '311 301,24', '385 985,59', '2,24'],
      ['lundi, 04/05/2026', '698 000,00', '311 301,24', '', ''], // D/E vides → null
      ['', '', '', '', ''], // ligne vide → écartée
    ]
    const rows = parseReporting(raw)
    // Titre + en-têtes + ligne vide écartés ICI (pas de quarantaine côté mapper).
    assertEquals(rows.length, 2)
    assertEquals(rows[0].reportDateRaw, 'dimanche, 03/05/2026')
    // Numériques FR (espace milliers + virgule décimale) normalisés par toNumOrNull.
    assertEquals(rows[0].portfolioValue, 697286.83)
    assertEquals(rows[0].totalContributions, 311301.24)
    assertEquals(rows[0].capitalGain, 385985.59)
    assertEquals(rows[0].performanceRatio, 2.24)
    // Cols D/E vides → null (le recalcul est l'affaire du mapper, pas du parser).
    assertEquals(rows[1].capitalGain, null)
    assertEquals(rows[1].performanceRatio, null)
  }
)

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
  // Onglet réel : « POSITIONS » (l'étiquette interne de snapshot reste « Portefeuille »).
  POSITIONS: Object.freeze([
    ['Nom', 'Symbole', 'Catégorie', 'Parts', 'Devise', 'Cours'],
    ['Apple', 'AAPL', 'Action', '10', 'EUR', '1 234,56'],
    ['TOTAL', '', 'Agrégat', '', '', '5 000,00'],
  ]),
  // Série quotidienne REPORTING (DSH-011) : ligne 0 = titre matrice, ligne 1 = en-têtes,
  // puis lignes datées. La 2e ligne de données a D/E VIDES → recalcul attendu du mapper.
  REPORTING: Object.freeze([
    ['REPORTING — Évolve Capital', '', '', '', ''],
    ['Date', 'Valorisation', 'Cotisations', 'Plus-value', 'Performance'],
    ['samedi, 02/05/2026', '697 000,00', '311 301,24', '385 698,76', '2,24'],
    ['dimanche, 03/05/2026', '697 286,83', '311 301,24', '', ''],
  ]),
  // Layout RÉEL : col 0 = n° de ligne, type=1, qté=2, nom=3, ticker=4, typo=5, prix=6, coût=7, date=8, justif=9.
  HISTORIQUE: Object.freeze([
    [
      '',
      'TYPE',
      'QUANTITE',
      'TITRES',
      'TICKER',
      'TYPOLOGIE',
      "PRIX D'ACHAT",
      "COUT D'ACHAT",
      'Date',
      'JUSTIFICATIFS',
    ],
    ['1', 'Achat', '10', 'Apple', 'AAPL', 'Action', '€100,00', '€1 000,00', '01/06/2018', 'note'],
  ]),
  // Layout RÉEL : nom=0, nb mois=1, %détention=2, pénalités=3, total=4, valo nette=5,
  // nb normal=6 (≠ statut), statut=7, montant dû=8, échéancier=9, gain/perte=10, suffixe=11.
  COTISATIONS: Object.freeze([
    [
      'nom',
      'Nb de mois cotisés',
      'Pourcentage de détention',
      'pénalités dues',
      'Total Cotisé',
      'Valeur Boursière nette',
      'Nb normal de cotisations',
      'Statut',
      'Montant dû',
      'Echéancier',
      'Gain/Perte',
      'Suffixe',
    ],
    [
      'AFOUDAH Ruben',
      '90',
      '33,30%',
      '0',
      '9 000,00€',
      '9 500,00€',
      '95',
      'Situation régulière',
      '0',
      '',
      '',
      '0,95',
    ],
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
  portfolio_aggregates: Row[]
  transactions: Row[]
  contributions: Row[]
  contribution_months: Row[]
  club_reporting_daily: Row[]
  sheet_snapshots: Row[]
}

function emptyStore(seedClub: boolean): Store {
  return {
    clubs: seedClub ? [{ id: CLUB_ID, sheet_id: SHEET_ID }] : [],
    users: [],
    memberships: [],
    positions: [],
    // Agrégats portefeuille (Provision, Soldes, « Portefeuille ») — persistés depuis LOT C.
    portfolio_aggregates: [],
    transactions: [],
    contributions: [],
    contribution_months: [],
    // Série quotidienne club (REPORTING, DSH-011) — migration 034.
    club_reporting_daily: [],
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
function upsertRows(
  table: Row[],
  incoming: Row[],
  onConflict: string,
  insertDefaults: Row = {}
): void {
  const keys = onConflict.split(',').map((k) => k.trim())
  for (const row of incoming) {
    const idx = table.findIndex((existing) => sameKey(existing, row, keys))
    if (idx >= 0) {
      // MERGE (UPDATE ON CONFLICT) : seules les colonnes fournies sont écrites — l'existant
      // (ex. role d'un network_admin / dirigeant) est préservé si absent du payload.
      table[idx] = { ...table[idx], ...row }
    } else {
      // INSERT : applique les DEFAULT de colonnes que Postgres poserait (ex. memberships.role
      // = 'member'), que le payload n'a pas fournis. La feuille Base ne pose plus le rôle.
      table.push({ ...insertDefaults, ...row })
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

/** Erreur Postgrest injectée sur les upserts d'une table (ex. 42P01 = table absente). */
type TableErrors = Partial<Record<keyof Store, { code: string; message: string }>>

function makeMockClient(
  store: Store,
  rpcCalls?: RpcCalls,
  tableErrors?: TableErrors
): { client: SupabaseLike } {
  // Builder par requête : accumule la table, l'opération et les filtres, puis
  // calcule le résultat au moment du `await` (then).
  class QueryBuilder implements PromiseLike<{ data: unknown; error: unknown }> {
    private filters: Array<{ col: string; val: unknown }> = []
    private neqFilters: Array<{ col: string; val: unknown }> = []
    private ltFilters: Array<{ col: string; val: unknown }> = []
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
    neq(col: string, val: unknown): this {
      this.neqFilters.push({ col, val })
      return this
    }
    lt(col: string, val: unknown): this {
      this.ltFilters.push({ col, val })
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
      for (const f of this.neqFilters) {
        if (r[f.col] === f.val) return false
      }
      for (const f of this.ltFilters) {
        // Comparaison < générique (timestamps ISO comparables lexicographiquement,
        // nombres comparables aussi). Une cellule null/undefined ne matche jamais « < ».
        const cell = r[f.col]
        if (cell == null) return false
        if (!((cell as never) < (f.val as never))) return false
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
        case 'upsert': {
          // Erreur injectée (ex. 42P01 « relation does not exist ») : le vrai client
          // renvoie { error } SANS throw — le store n'est pas muté.
          const injected = tableErrors?.[this.table]
          if (injected) return { data: null, error: injected }
          upsertRows(
            table,
            this.withUserIds(this.payload),
            this.onConflict,
            this.table === 'memberships' ? { role: 'member' } : {}
          )
          return { data: null, error: null }
        }
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

    /**
     * Assigne un id déterministe aux lignes écrites quand la DB le ferait via DEFAULT :
     *  - users     : id dérivé de l'email ;
     *  - memberships : id dérivé de (user_id, club_id) — sinon le lookup par nom (réconciliation
     *    des rôles) ne pourrait jamais retrouver le membership à promouvoir (id manquant).
     */
    private withUserIds(rows: Row[]): Row[] {
      if (this.table === 'users') {
        return rows.map((r) => (r.id ? r : { ...r, id: userIdFromEmail(String(r.email)) }))
      }
      if (this.table === 'memberships') {
        return rows.map((r) =>
          r.id ? r : { ...r, id: `membership-${String(r.user_id)}-${String(r.club_id)}` }
        )
      }
      return rows
    }

    /** Calcule le data d'un select, avec jointure users (FK désambiguïsée) sur memberships. */
    private computeSelectData(): unknown {
      const rows = this.rows()
      if (this.table === 'memberships') {
        // Deux formes de select sur memberships (embed qualifié par memberships_user_id_fkey
        // car memberships a 2 FK vers users — user_id et locked_by, cf. ADM-007) :
        //  - sync (lookup) : .select('id, user_id, users!…(full_name, email, email_is_placeholder)')
        //  - alerte NTF-003 : .select('users!…(email)') filtré par role (PAS de full_name).
        // On discrimine sur `full_name` : seul le lookup sync le demande. (Les DEUX
        // sélectionnent `email` depuis le fix « ne pas écraser l'email », d'où ce changement.)
        if (!this.selectCols.includes('full_name')) {
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
            users: {
              full_name: (u?.full_name as string) ?? '',
              email: (u?.email as string) ?? '',
              email_is_placeholder: (u?.email_is_placeholder as boolean) ?? false,
            },
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
      // Tout RPC → no-op succès. On enregistre le nom : la sync ne déclenche plus aucun RPC
      // (member_quote_part est une vue, migration 030) — les tests vérifient cette absence.
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
    /** Erreur Postgrest injectée sur les upserts d'une table (cf. TableErrors). */
    tableErrors?: TableErrors
    /** Capture les plages A1 demandées par feuille (vérifie A1:E10000 pour REPORTING). */
    ranges?: Record<string, string | undefined>
  }
): (req: Request) => Promise<Response> {
  const mockReadSheet: SyncDeps['readSheet'] = (
    _sheetId: string,
    sheetName: string,
    range?: string
  ) => {
    opts?.order?.push(sheetName)
    if (opts?.ranges) opts.ranges[sheetName] = range
    if (opts?.throwOn && sheetName === opts.throwOn) {
      return Promise.reject(new Error(`lecture ${sheetName} indisponible (stub)`))
    }
    const override = opts?.overrides?.[sheetName]
    if (override) return Promise.resolve(override.map((row) => [...row]))
    return Promise.resolve(cloneSheet(sheetName))
  }
  const { client } = makeMockClient(store, opts?.rpcCalls, opts?.tableErrors)
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

// Étiquettes internes des feuilles (= valeurs de body.synced_sheets et clés de snapshots).
// L'étiquette « Portefeuille » est conservée même si l'onglet réel lu est « POSITIONS ».
// REPORTING (optionnelle, DSH-011) s'intercale entre Portefeuille et HISTORIQUE.
const SHEET_ORDER = [
  'PARAMETRAGES',
  'Base',
  'Portefeuille',
  'REPORTING',
  'HISTORIQUE',
  'COTISATIONS',
  'Details cotisations',
]

// Noms d'onglets RÉELLEMENT passés à readSheet (≠ étiquettes : « POSITIONS » et non « Portefeuille »).
const READ_ORDER = [
  'PARAMETRAGES',
  'Base',
  'POSITIONS',
  'REPORTING',
  'HISTORIQUE',
  'COTISATIONS',
  'Details cotisations',
]

// Test 1 — sync complète : 200, success=true, les 7 feuilles synchronisées.
Deno.test('handler : sync complète → 200, success=true, 7 feuilles synchronisées', async () => {
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
  assertEquals(body.synced_sheets.length, 7)
  assertEquals(body.synced_sheets, SHEET_ORDER)
  // Données effectivement importées dans le store.
  assertEquals(store.users.length, 2)
  assertEquals(store.memberships.length, 2)
  assertEquals(store.positions.length, 1) // AAPL ; la ligne d'agrégat (symbole vide) exclue
  assertEquals(store.transactions.length, 1)
  assertEquals(store.club_reporting_daily.length, 2) // titre + en-têtes REPORTING écartés
  // Un snapshot par feuille, tous en succès.
  assertEquals(Object.keys(body.snapshots).length, 7)
  for (const name of SHEET_ORDER) {
    assertEquals(body.snapshots[name].status, 'success')
  }
  // member_quote_part est une VUE normale (migration 030) : plus de refresh de MV post-sync.
  // On vérifie que l'appel RPC obsolète a bien été retiré (aucun RPC déclenché par la sync).
  assert(!rpcCalls.names.includes('refresh_member_quote_part'))
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
    club_reporting_daily: stripVolatile(structuredClone(store.club_reporting_daily)),
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
  assertEquals(store.club_reporting_daily.length, 2) // onConflict (club_id, report_date)
})

// Test 3 — erreur DURE : HISTORIQUE.readSheet throw → exception attrapée par runSheet →
//          snapshot failed + errors[], MAIS les feuilles suivantes (COTISATIONS, Details)
//          passent. success=false ; la sync n'abort pas.
Deno.test('handler : erreur dure (HISTORIQUE throw) → snapshot failed, sync continue', async () => {
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
  // member_quote_part est une VUE (migration 030) : aucun RPC de refresh, quelle que soit l'issue.
  assert(!rpcCalls.names.includes('refresh_member_quote_part'))
})

// Test 3bis — quarantaine MOLLE : une ligne Portefeuille à quantité illisible est écartée
//             AVANT l'upsert → snapshot 'partial', la mauvaise ligne absente du store,
//             les lignes valides présentes. C'est une anomalie RÉCUPÉRABLE : pas d'erreur
//             dure (success=true), la note va dans warnings[] + snapshot.error_message.
Deno.test(
  'handler : quarantaine Portefeuille (quantité illisible) → warning, snapshot partial',
  async () => {
    const store = emptyStore(true)
    const rpcCalls: RpcCalls = { names: [] }
    // AAPL : quantité valide ; BADQ : quantité non parsable (→ null après mapper) → écartée.
    const handler = buildHandler(store, {
      rpcCalls,
      overrides: {
        // L'override porte sur l'onglet lu par readSheet : « POSITIONS ».
        POSITIONS: [
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
    // member_quote_part est une VUE (migration 030) : aucun RPC de refresh post-sync.
    assert(!rpcCalls.names.includes('refresh_member_quote_part'))
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
  // L'ordre de lecture des onglets est exactement l'ordre impératif documenté
  // (avec l'onglet réel « POSITIONS » et non l'étiquette « Portefeuille »).
  assertEquals(order, READ_ORDER)
  const idxParam = order.indexOf('PARAMETRAGES')
  const idxBase = order.indexOf('Base')
  assert(idxParam >= 0 && idxBase >= 0)
  assert(idxParam < idxBase, 'PARAMETRAGES doit précéder Base')
})

// ===========================================================================
// 3bis. RÉCONCILIATION DES RÔLES (B1) — dérivés de PARAMETRAGES
// ===========================================================================

// En-têtes Base réutilisés pour les fixtures de ce bloc.
const BASE_HEADER = [
  'Nom',
  'Email',
  'Entrée',
  'Sortie',
  'Statut',
  'Demande',
  'Docs',
  'Tel',
  'Adresse',
  'Montant',
]

// PARAMETRAGES enrichi des dirigeants (libellés volontairement « sales » : accents/casse).
const PARAMS_WITH_OFFICERS: string[][] = [
  ['Paramètre', 'Valeur'],
  ['Nom du club', 'Évolve Capital'],
  ['Cotisation min', '100'],
  ['Président(e)', 'AGBEHONOU Edem'],
  ['Trésorier(e)', 'HOUESSOU Valentino'],
]

// Base contenant les deux dirigeants + un membre simple, tous actifs.
const BASE_WITH_OFFICERS: string[][] = [
  BASE_HEADER,
  ['AGBEHONOU Edem', 'edem@club.fr', '01/06/2018', '', 'Membre actif', '', '', '', '', ''],
  ['HOUESSOU Valentino', 'valentino@club.fr', '01/06/2018', '', 'Membre actif', '', '', '', '', ''],
  ['LASKARI Fabien', 'fabien@club.fr', '01/06/2018', '', 'Membre actif', '', '', '', '', ''],
]

function roleByFullName(store: Store, fullName: string): string | undefined {
  const u = store.users.find((x) => x.full_name === fullName)
  if (!u) return undefined
  const m = store.memberships.find((x) => x.user_id === u.id && x.club_id === CLUB_ID)
  return m?.role as string | undefined
}

// Test B1 a — promotion : Président/Trésorier dérivés, les autres restent 'member'.
Deno.test('handler : rôles dérivés de PARAMETRAGES (président/trésorier promus)', async () => {
  const store = emptyStore(true)
  const handler = buildHandler(store, {
    overrides: { PARAMETRAGES: PARAMS_WITH_OFFICERS, Base: BASE_WITH_OFFICERS },
  })
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  const body = (await res.json()) as SyncResponseBody
  assertEquals(body.success, true)
  assertEquals(roleByFullName(store, 'AGBEHONOU Edem'), 'president')
  assertEquals(roleByFullName(store, 'HOUESSOU Valentino'), 'treasurer')
  assertEquals(roleByFullName(store, 'LASKARI Fabien'), 'member')
})

// Test B1 b — idempotence : un 2e sync produit les mêmes rôles.
Deno.test('handler : rôles dérivés idempotents (re-sync = mêmes rôles)', async () => {
  const store = emptyStore(true)
  const handler = buildHandler(store, {
    overrides: { PARAMETRAGES: PARAMS_WITH_OFFICERS, Base: BASE_WITH_OFFICERS },
  })
  await handler(syncRequest(CLUB_ID))
  await handler(syncRequest(CLUB_ID))
  assertEquals(roleByFullName(store, 'AGBEHONOU Edem'), 'president')
  assertEquals(roleByFullName(store, 'HOUESSOU Valentino'), 'treasurer')
  assertEquals(roleByFullName(store, 'LASKARI Fabien'), 'member')
})

// Test B1 c — un ex-dirigeant disparu de PARAMETRAGES redevient 'member' au sync suivant.
Deno.test('handler : ex-dirigeant retiré de PARAMETRAGES redevient member', async () => {
  const store = emptyStore(true)
  // 1er sync : Valentino est trésorier.
  const handler1 = buildHandler(store, {
    overrides: { PARAMETRAGES: PARAMS_WITH_OFFICERS, Base: BASE_WITH_OFFICERS },
  })
  await handler1(syncRequest(CLUB_ID))
  assertEquals(roleByFullName(store, 'HOUESSOU Valentino'), 'treasurer')
  // 2e sync : plus de trésorier dans PARAMETRAGES → Valentino doit retomber 'member'.
  const paramsNoTreasurer: string[][] = [
    ['Paramètre', 'Valeur'],
    ['Nom du club', 'Évolve Capital'],
    ['Cotisation min', '100'],
    ['Président(e)', 'AGBEHONOU Edem'],
  ]
  const handler2 = buildHandler(store, {
    overrides: { PARAMETRAGES: paramsNoTreasurer, Base: BASE_WITH_OFFICERS },
  })
  await handler2(syncRequest(CLUB_ID))
  assertEquals(roleByFullName(store, 'AGBEHONOU Edem'), 'president')
  assertEquals(roleByFullName(store, 'HOUESSOU Valentino'), 'member')
})

// Test B1 d — network_admin (hors feuille Base) JAMAIS écrasé par la réconciliation.
Deno.test(
  'handler : network_admin préservé (jamais rétrogradé par la réconciliation)',
  async () => {
    const store = emptyStore(true)
    // Seed d'un network_admin existant, hors feuille Base.
    store.users.push({ id: 'user-admin', email: 'admin@club.fr', full_name: 'ADMIN Réseau' })
    store.memberships.push({
      id: 'm-admin',
      user_id: 'user-admin',
      club_id: CLUB_ID,
      role: 'network_admin',
      joined_at: '2020-01-01',
    })
    const handler = buildHandler(store, {
      overrides: { PARAMETRAGES: PARAMS_WITH_OFFICERS, Base: BASE_WITH_OFFICERS },
    })
    await handler(syncRequest(CLUB_ID))
    // Le compte admin n'est pas dans Base → non touché par l'upsert Base ni par la réconciliation.
    assertEquals(roleByFullName(store, 'ADMIN Réseau'), 'network_admin')
  }
)

// Test B1 d' — network_admin qui EST AUSSI membre de la feuille Base : préservé.
// (Régression réelle observée en live : l'upsert Base écrasait son rôle en 'member'.)
Deno.test(
  'handler : network_admin membre de la feuille Base préservé (non rétrogradé par l’upsert Base)',
  async () => {
    const store = emptyStore(true)
    // Fabien est dans BASE_WITH_OFFICERS (fabien@club.fr) mais a été élevé network_admin.
    // On pré-seede SON membership avec un id/clé alignés sur ce que le mock génère, pour que
    // l'upsert Base le retrouve (onConflict user_id,club_id) et le MERGE sans toucher le rôle.
    const fabienId = userIdFromEmail('fabien@club.fr')
    store.memberships.push({
      id: `membership-${fabienId}-${CLUB_ID}`,
      user_id: fabienId,
      club_id: CLUB_ID,
      role: 'network_admin',
      joined_at: '2018-06-01',
    })
    const handler = buildHandler(store, {
      overrides: { PARAMETRAGES: PARAMS_WITH_OFFICERS, Base: BASE_WITH_OFFICERS },
    })
    await handler(syncRequest(CLUB_ID))
    // Base ne pose plus le rôle → Fabien reste network_admin ; les dirigeants sont bien promus.
    assertEquals(roleByFullName(store, 'LASKARI Fabien'), 'network_admin')
    assertEquals(roleByFullName(store, 'AGBEHONOU Edem'), 'president')
    assertEquals(roleByFullName(store, 'HOUESSOU Valentino'), 'treasurer')
  }
)

// Test B1 e — nom de dirigeant introuvable → warning (pas d'erreur dure, sync OK).
Deno.test('handler : dirigeant introuvable → warning, success reste true', async () => {
  const store = emptyStore(true)
  const paramsBadName: string[][] = [
    ['Paramètre', 'Valeur'],
    ['Nom du club', 'Évolve Capital'],
    ['Cotisation min', '100'],
    ['Président(e)', 'INCONNU Personne'],
  ]
  const handler = buildHandler(store, {
    overrides: { PARAMETRAGES: paramsBadName, Base: BASE_WITH_OFFICERS },
  })
  const res = await handler(syncRequest(CLUB_ID))
  const body = (await res.json()) as SyncResponseBody
  assertEquals(body.success, true)
  assertEquals(body.errors.length, 0)
  assert(body.warnings.some((w) => w.includes('INCONNU Personne')))
})

// ===========================================================================
// 3ter. POSITIONS FANTÔMES (B2) — désactivation des absentes de la matrice
// ===========================================================================

// Test B2 — une position en base mais absente de la matrice est désactivée (is_active=false).
Deno.test('handler : position fantôme (absente de la matrice) désactivée', async () => {
  const store = emptyStore(true)
  // Pré-seed d'une position « démo » ANCIENNE encore active, absente de la matrice courante.
  store.positions.push({
    id: 'pos-ghost',
    club_id: CLUB_ID,
    symbol: 'GHOST',
    quantity: 1,
    is_active: true,
    synced_at: '2000-01-01T00:00:00.000Z', // antérieur au run → doit être désactivée
  })
  const handler = buildHandler(store)
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  const body = (await res.json()) as SyncResponseBody
  assertEquals(body.success, true)
  // AAPL (matrice) actif ; GHOST (absent) désactivé — l'historique est conservé (pas de delete).
  const aapl = store.positions.find((p) => p.symbol === 'AAPL')
  const ghost = store.positions.find((p) => p.symbol === 'GHOST')
  assert(aapl !== undefined)
  assertEquals(aapl.is_active, true)
  assert(ghost !== undefined)
  assertEquals(ghost.is_active, false)
  // Une seule position ACTIVE reste (AAPL).
  assertEquals(store.positions.filter((p) => p.is_active === true).length, 1)
})

// Test C2 — les lignes d'agrégat (symbole vide) sont persistées dans portfolio_aggregates,
// et un agrégat fantôme absent de la matrice courante est désactivé (même réconciliation que B2).
Deno.test('handler : agrégats portefeuille persistés + agrégat fantôme désactivé', async () => {
  const store = emptyStore(true)
  // Agrégat « démo » ANCIEN encore actif, absent de la matrice courante → doit être désactivé.
  store.portfolio_aggregates.push({
    id: 'agg-ghost',
    club_id: CLUB_ID,
    label: 'Vieux solde',
    market_value: 42,
    is_active: true,
    synced_at: '2000-01-01T00:00:00.000Z',
  })
  const handler = buildHandler(store)
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  const body = (await res.json()) as SyncResponseBody
  assertEquals(body.success, true)
  // La ligne d'agrégat « TOTAL » de la fixture (symbole vide) est persistée et active.
  // (La fixture minimale n'a pas de colonne valeur G → market_value null ; la persistance
  // du LABEL et la réconciliation is_active sont l'objet du test ; la valeur live est couverte
  // par la vérif DB du lead sur la vraie matrice : Portefeuille=721 100,78.)
  const total = store.portfolio_aggregates.find((a) => a.label === 'TOTAL')
  assert(total !== undefined)
  assertEquals(total.is_active, true)
  // L'agrégat fantôme absent de la matrice est désactivé (historique conservé, pas de delete).
  const ghost = store.portfolio_aggregates.find((a) => a.label === 'Vieux solde')
  assert(ghost !== undefined)
  assertEquals(ghost.is_active, false)
})

// ===========================================================================
// 3quater. REPORTING (DSH-011) — feuille OPTIONNELLE, série quotidienne club
// ===========================================================================
// RÈGLE D'OR testée ici : AUCUN scénario REPORTING ne fait success=false ni ne
// crashe le run — tout échec part dans warnings[], jamais errors[].

// Test R1 — sync complète avec REPORTING OK : lignes en base, D/E recalculés, ordre respecté.
Deno.test(
  'handler : REPORTING ok → lignes upsertées, D/E recalculés, plage A1:E10000',
  async () => {
    const store = emptyStore(true)
    const ranges: Record<string, string | undefined> = {}
    const handler = buildHandler(store, { ranges })
    const res = await handler(syncRequest(CLUB_ID))
    assertEquals(res.status, 200)
    const body = (await res.json()) as SyncResponseBody
    assertEquals(body.success, true)
    // REPORTING figure dans synced_sheets APRÈS Portefeuille et AVANT HISTORIQUE.
    const idxPortefeuille = body.synced_sheets.indexOf('Portefeuille')
    const idxReporting = body.synced_sheets.indexOf('REPORTING')
    const idxHistorique = body.synced_sheets.indexOf('HISTORIQUE')
    assert(idxReporting >= 0)
    assert(idxPortefeuille < idxReporting, 'REPORTING doit suivre Portefeuille')
    assert(idxReporting < idxHistorique, 'REPORTING doit précéder HISTORIQUE')
    // La plage élargie est bien demandée (la série déborderait du défaut A1:AZ2000).
    assertEquals(ranges['REPORTING'], 'A1:E10000')
    // Les 2 lignes datées sont en base (titre + en-têtes écartés par le parser).
    assertEquals(store.club_reporting_daily.length, 2)
    const d1 = store.club_reporting_daily.find((r) => r.report_date === '2026-05-02')
    const d2 = store.club_reporting_daily.find((r) => r.report_date === '2026-05-03')
    assert(d1 !== undefined)
    assert(d2 !== undefined)
    assertEquals(d1.club_id, CLUB_ID)
    // Ligne 1 : D/E fournis par la feuille → conservés tels quels.
    assertEquals(d1.portfolio_value, 697000)
    assertEquals(d1.capital_gain, 385698.76)
    assertEquals(d1.performance_ratio, 2.24)
    // Ligne 2 : cols D/E VIDES en source → recalculées (D = B−C ; E = B/C, C > 0).
    assertAlmostEquals(d2.capital_gain as number, 697286.83 - 311301.24, 1e-6)
    assertAlmostEquals(d2.performance_ratio as number, 697286.83 / 311301.24, 1e-9)
    // Snapshot REPORTING en succès (fixture propre, aucune quarantaine).
    assertEquals(body.snapshots['REPORTING'].status, 'success')
  }
)

// Test R2 — idempotence : 2 syncs consécutives → mêmes lignes, mêmes valeurs.
Deno.test('handler : REPORTING idempotent → 2 syncs, mêmes lignes et valeurs', async () => {
  const store = emptyStore(true)
  const handler = buildHandler(store)
  const strip = (rows: Row[]): Row[] =>
    rows.map((r) => {
      const { synced_at: _omit, ...rest } = r as Row & { synced_at?: unknown }
      return rest
    })

  await handler(syncRequest(CLUB_ID))
  const first = strip(structuredClone(store.club_reporting_daily))
  await handler(syncRequest(CLUB_ID))
  const second = strip(structuredClone(store.club_reporting_daily))

  // Même nombre de lignes (onConflict club_id,report_date) et valeurs identiques.
  assertEquals(second.length, first.length)
  assertEquals(second, first)
})

// Test R3 — readSheet throw UNIQUEMENT pour REPORTING (onglet absent / HTTP 400) :
// la sync reste un SUCCÈS, warning explicite, les 6 feuilles vitales passent.
Deno.test('handler : REPORTING illisible → warning MOLLE, success reste true', async () => {
  const store = emptyStore(true)
  const handler = buildHandler(store, { throwOn: 'REPORTING' })
  const res = await handler(syncRequest(CLUB_ID))
  assertEquals(res.status, 200)
  const body = (await res.json()) as SyncResponseBody
  // RÈGLE D'OR : l'échec d'une feuille optionnelle ne fait JAMAIS success=false.
  assertEquals(body.success, true)
  assert(!body.errors.some((e) => e.includes('REPORTING')))
  assert(body.warnings.some((w) => w.includes('REPORTING (optionnelle)')))
  // Les 6 feuilles vitales sont toutes synchronisées ; REPORTING absente.
  for (const name of SHEET_ORDER.filter((s) => s !== 'REPORTING')) {
    assert(body.synced_sheets.includes(name))
  }
  assert(!body.synced_sheets.includes('REPORTING'))
  assertEquals(store.club_reporting_daily.length, 0)
  // Snapshot d'échec posé pour l'audit (best-effort).
  assertEquals(body.snapshots['REPORTING'].status, 'failed')
})

// Test R4 — table club_reporting_daily absente (migration 034 non déployée) : l'upsert
// renvoie { error: { code: '42P01' } } → warning explicite, pas de crash, success=true.
Deno.test(
  'handler : table club_reporting_daily absente (42P01) → warning, pas de crash',
  async () => {
    const store = emptyStore(true)
    const handler = buildHandler(store, {
      tableErrors: {
        club_reporting_daily: {
          code: '42P01',
          message: 'relation "club_reporting_daily" does not exist',
        },
      },
    })
    const res = await handler(syncRequest(CLUB_ID))
    assertEquals(res.status, 200)
    const body = (await res.json()) as SyncResponseBody
    assertEquals(body.success, true)
    assert(!body.errors.some((e) => e.includes('REPORTING')))
    assert(!body.errors.some((e) => e.includes('club_reporting_daily')))
    // Warning explicite pointant la migration manquante.
    assert(body.warnings.some((w) => w.includes('migration 034')))
    // Rien n'a été écrit (l'erreur injectée ne mute pas le store) ; les autres feuilles passent.
    assertEquals(store.club_reporting_daily.length, 0)
    assertEquals(store.positions.length, 1)
    assertEquals(store.transactions.length, 1)
  }
)

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
