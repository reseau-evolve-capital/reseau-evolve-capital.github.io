// Tests Deno de l'Edge Function `sync` (SHE-008).
//
// CONTEXTE D'EXÉCUTION
// --------------------
// Ces tests utilisent le harnais de test standard Deno (`Deno.test`) et la lib
// d'assertions `@std/assert`. Ils se lancent avec :
//
//     deno test --allow-env supabase/functions/sync/__tests__/sync.test.ts
//
// (depuis la racine du repo, ou en pointant le deno.json de la fonction).
//
// CE QUI EST TESTÉ ICI ET MAINTENANT (runnable)
// ---------------------------------------------
// 1. Les parsers de bas niveau (sheetParsers.ts) : matrice brute string[][] →
//    *RowDTO[]. Pur, sans I/O — testable directement.
// 2. Le checksum SHA-256 du snapshot (snapshot.ts → sha256Hex) : déterministe
//    pour une même entrée, sensible au changement. Pur (Web Crypto).
//
// CE QUI N'EST PAS TESTABLE EN UNITAIRE ICI (handler complet)
// ----------------------------------------------------------
// Le handler `Deno.serve(...)` d'index.ts câble en dur ses dépendances
// (`createClient` de @supabase/supabase-js, `readSheet` de ./readSheet.ts) :
// il n'expose AUCUN point d'injection. Tester le flux complet (Test 1 sync OK,
// Test 3 panne partielle, Test 4 club introuvable → 404) exige donc soit :
//   - un refactor avec injection de dépendances (createClient + readSheet passés
//     en paramètres), HORS périmètre de SHE-008 (on ne modifie pas le code de
//     prod pour le test) ;
//   - une stack Supabase locale + `supabase functions serve` qui sert la
//     fonction réellement et l'attaque en HTTP, avec readSheet stubbé via une
//     Sheet de test. C'est le périmètre de la Tâche 9 (tests d'intégration de
//     l'Edge Function bout-en-bout).
//
// Les squelettes de ces 3 tests handler-level sont fournis ci-dessous en
// `Deno.test({ ignore: true })` avec la marche à suivre documentée, pour que la
// Tâche 9 les active sans repartir de zéro.

import { assertEquals, assertNotEquals } from 'jsr:@std/assert@^1'

import {
  parseParametrages,
  parseBase,
  parsePortefeuille,
  parseHistorique,
  parseCotisations,
} from '../sheetParsers.ts'
import { sha256Hex } from '../snapshot.ts'

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
// 3. SQUELETTES HANDLER-LEVEL — activés en Tâche 9 (DI ou `functions serve`)
// ===========================================================================
//
// Marche à suivre pour les activer (retirer `ignore: true`) :
//   Option A (recommandée Tâche 9) — `supabase functions serve sync` avec une
//   Sheet de test + service role local, puis fetch HTTP sur l'endpoint et
//   assertions sur le JSON { success, synced_sheets, errors, snapshots }.
//   Option B — refactor d'index.ts pour injecter createClient + readSheet
//   (createHandler({ createClient, readSheet })) ; alors stubber les deux ici.

// Test 1 — sync OK : les 6 feuilles importées dans l'ordre, success === true,
//          synced_sheets contient les 6 noms, errors vide.
Deno.test({
  name: 'handler : sync OK → success=true, 6 feuilles, 0 erreur [Tâche 9]',
  ignore: true,
  fn: () => {
    // POST { club_id } avec readSheet stubbé renvoyant les 6 matrices de fixture.
    // assertEquals(body.success, true)
    // assertEquals(body.synced_sheets.length, 6)
    // assertEquals(body.errors.length, 0)
    // L'ordre attendu : PARAMETRAGES, Base, Portefeuille, HISTORIQUE, COTISATIONS, Details cotisations.
  },
})

// Test 3 — panne partielle : une feuille (ex: Portefeuille) lève → snapshot
//          'failed' + entrée dans errors, MAIS les feuilles suivantes passent.
//          success === false, synced_sheets exclut la feuille en échec.
Deno.test({
  name: 'handler : panne partielle d une feuille → errors[], pas d abort [Tâche 9]',
  ignore: true,
  fn: () => {
    // readSheet stubbé pour throw uniquement sur 'Portefeuille'.
    // assertEquals(body.success, false)
    // assert(body.errors.some((e) => e.startsWith('Portefeuille:')))
    // assert(!body.synced_sheets.includes('Portefeuille'))
    // assert(body.snapshots['Portefeuille'].status === 'failed')
    // Les feuilles d'après (HISTORIQUE, COTISATIONS, Details) restent présentes.
  },
})

// Test 4 — club introuvable : clubs.maybeSingle() renvoie null → réponse 404.
Deno.test({
  name: 'handler : club introuvable → HTTP 404 [Tâche 9]',
  ignore: true,
  fn: () => {
    // createClient stubbé : from('clubs').select().eq().maybeSingle() → { data: null }.
    // const res = await handler(new Request(url, { method: 'POST', body: JSON.stringify({ club_id: 'absent' }) }))
    // assertEquals(res.status, 404)
    // const body = await res.json(); assert(body.error.includes('introuvable'))
  },
})
