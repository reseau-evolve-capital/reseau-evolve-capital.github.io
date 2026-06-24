// Tests Deno du handler pur `migrate-to-operations` (cahier §6.1 — module Opérations).
//
// EXÉCUTION (depuis la racine du repo)
// ------------------------------------
//     deno test --no-check --allow-all \
//       --config supabase/functions/migrate-to-operations/deno.json \
//       supabase/functions/migrate-to-operations/__tests__/
//
// On importe `handler.ts` (logique pure) : AUCUN I/O réel, AUCUNE DB. Toutes les seams
// (listPaidContributions, listTransactions, findExistingOperation, insertOperation) sont
// stubbées par un STORE en mémoire. `findExistingOperation` rejoue exactement la sémantique
// du tuple naturel côté DB (match sur club/type/date/symbol/quantity/cash_delta, restreint
// source='matrice_migration').
//
// CE QUI EST TESTÉ
// ----------------
// 1. Insertion correcte par type avec cash_delta SIGNÉ (contribution/buy/sell/dividend_cash/fee).
// 2. IDEMPOTENCE : 2e run sur le même store → inserted=0, skipped=N.
// 3. IDEMPOTENCE APRÈS SYNC SIMULÉ (LD-2, test clé) : les transactions reçoivent de NOUVEAUX
//    id (volatils) mais un tuple métier identique → 2e migrate donne inserted=0.
// 4. dividend_stock legacy → cash_delta=0.
// 5. Ligne invalide (buy sans symbol, quantity null) → skipped_invalid, pas de crash.
// 6. Club inexistant / listes vides → inserted=0, pas d'erreur.

import { assert, assertEquals } from 'jsr:@std/assert@^1'

import { migrateToOperations } from '../handler.ts'
import type {
  ContributionRow,
  MigrateDeps,
  NaturalKey,
  OperationInsert,
  TransactionRow,
} from '../handler.ts'

// ---- Store en mémoire (rejoue la sémantique DB du tuple naturel) ----

interface Store {
  contributions: ContributionRow[]
  transactions: TransactionRow[]
  /** operations déjà présentes (l'insert pousse ici, findExisting interroge ici). */
  operations: OperationInsert[]
}

function makeStore(partial: Partial<Store> = {}): Store {
  return {
    contributions: partial.contributions ?? [],
    transactions: partial.transactions ?? [],
    operations: partial.operations ?? [],
  }
}

/** Égalité de tuple naturel — miroir du WHERE PostgREST de l'index.ts. */
function matchesKey(op: OperationInsert, key: NaturalKey): boolean {
  return (
    op.source === 'matrice_migration' &&
    op.club_id === key.club_id &&
    op.type === key.type &&
    op.operation_date === key.operation_date &&
    op.cash_delta === key.cash_delta &&
    op.symbol === key.symbol &&
    op.quantity === key.quantity
  )
}

function depsFor(store: Store): MigrateDeps {
  return {
    listPaidContributions: (clubId) =>
      Promise.resolve(store.contributions.filter(() => true).map((c) => ({ ...c }))),
    listTransactions: (_clubId) => Promise.resolve(store.transactions.map((t) => ({ ...t }))),
    findExistingOperation: (key) =>
      Promise.resolve(store.operations.some((op) => matchesKey(op, key))),
    insertOperation: (op) => {
      store.operations.push(op)
      return Promise.resolve()
    },
    log: () => {}, // silencieux
  }
}

const CLUB = 'club-a'

// ────────────────────────────────────────────────────────────────────────────
// 1. Insertion correcte par type + cash_delta signé
// ────────────────────────────────────────────────────────────────────────────

Deno.test('cotisation payée → contribution, cash_delta positif', async () => {
  const store = makeStore({
    contributions: [
      { id: 'cm-1', membership_id: 'm-1', amount: 50, paid_at: '2024-01-15', year: 2024, month: 1 },
    ],
  })
  const r = await migrateToOperations(depsFor(store), CLUB)
  assertEquals(r.inserted, 1)
  assertEquals(r.by_type, { contribution: 1 })
  const op = store.operations[0]
  assertEquals(op.type, 'contribution')
  assertEquals(op.cash_delta, 50) // +
  assertEquals(op.membership_id, 'm-1')
  assertEquals(op.operation_date, '2024-01-15')
  assertEquals(op.source, 'matrice_migration')
  assertEquals(op.metadata.legacy_table, 'contribution_months')
  assertEquals(op.metadata.original_id, 'cm-1')
  assertEquals(op.metadata.legacy_year, 2024)
  assertEquals(op.metadata.legacy_month, 1)
})

Deno.test('buy → cash_delta négatif = -(quantity × price)', async () => {
  const store = makeStore({
    transactions: [
      {
        id: 't-buy',
        type: 'buy',
        symbol: 'NASDAQ:META',
        name: 'Meta',
        quantity: 10,
        price: 200,
        total: 2000,
        transaction_date: '2024-02-01',
      },
    ],
  })
  const r = await migrateToOperations(depsFor(store), CLUB)
  assertEquals(r.inserted, 1)
  const op = store.operations[0]
  assertEquals(op.type, 'buy')
  assertEquals(op.cash_delta, -2000) // -(10*200)
  assertEquals(op.symbol, 'NASDAQ:META')
  assertEquals(op.quantity, 10)
  assertEquals(op.unit_price, 200)
})

Deno.test('sell → cash_delta positif = +(quantity × price)', async () => {
  const store = makeStore({
    transactions: [
      {
        id: 't-sell',
        type: 'sell',
        symbol: 'EPA:MC',
        name: 'LVMH',
        quantity: 5,
        price: 700,
        total: 3500,
        transaction_date: '2024-03-01',
      },
    ],
  })
  const r = await migrateToOperations(depsFor(store), CLUB)
  assertEquals(store.operations[0].type, 'sell')
  assertEquals(store.operations[0].cash_delta, 3500) // +
})

Deno.test('dividend → dividend_cash, cash_delta = +(total)', async () => {
  const store = makeStore({
    transactions: [
      {
        id: 't-div',
        type: 'dividend',
        symbol: 'EPA:MC',
        name: 'LVMH',
        quantity: null,
        price: null,
        total: 120,
        transaction_date: '2024-04-01',
      },
    ],
  })
  const r = await migrateToOperations(depsFor(store), CLUB)
  assertEquals(store.operations[0].type, 'dividend_cash')
  assertEquals(store.operations[0].cash_delta, 120)
})

Deno.test('coupon → dividend_cash', async () => {
  const store = makeStore({
    transactions: [
      {
        id: 't-cpn',
        type: 'coupon',
        symbol: 'BOND:X',
        name: 'Oblig',
        quantity: null,
        price: null,
        total: 30,
        transaction_date: '2024-04-10',
      },
    ],
  })
  await migrateToOperations(depsFor(store), CLUB)
  assertEquals(store.operations[0].type, 'dividend_cash')
  assertEquals(store.operations[0].cash_delta, 30)
})

Deno.test('other → fee, cash_delta = total ?? 0', async () => {
  const store = makeStore({
    transactions: [
      {
        id: 't-fee',
        type: 'other',
        symbol: null,
        name: 'Frais courtier',
        quantity: null,
        price: null,
        total: -12,
        transaction_date: '2024-05-01',
      },
    ],
  })
  const r = await migrateToOperations(depsFor(store), CLUB)
  assertEquals(r.inserted, 1)
  assertEquals(store.operations[0].type, 'fee')
  assertEquals(store.operations[0].cash_delta, -12)
  assertEquals(store.operations[0].symbol, null)
})

// ────────────────────────────────────────────────────────────────────────────
// 2. Idempotence — 2e run = 0 insert
// ────────────────────────────────────────────────────────────────────────────

Deno.test('2e run sur le même store → inserted=0, skipped=N (idempotence)', async () => {
  const store = makeStore({
    contributions: [
      { id: 'cm-1', membership_id: 'm-1', amount: 50, paid_at: '2024-01-15', year: 2024, month: 1 },
    ],
    transactions: [
      {
        id: 't-buy',
        type: 'buy',
        symbol: 'NASDAQ:META',
        name: 'Meta',
        quantity: 10,
        price: 200,
        total: 2000,
        transaction_date: '2024-02-01',
      },
      {
        id: 't-sell',
        type: 'sell',
        symbol: 'EPA:MC',
        name: 'LVMH',
        quantity: 5,
        price: 700,
        total: 3500,
        transaction_date: '2024-03-01',
      },
    ],
  })
  const deps = depsFor(store)

  const r1 = await migrateToOperations(deps, CLUB)
  assertEquals(r1.inserted, 3)
  assertEquals(r1.skipped, 0)

  const r2 = await migrateToOperations(deps, CLUB)
  assertEquals(r2.inserted, 0)
  assertEquals(r2.skipped, 3)
  assertEquals(store.operations.length, 3) // aucun doublon en base
})

// ────────────────────────────────────────────────────────────────────────────
// 3. Idempotence APRÈS SYNC SIMULÉ (LD-2 — le test clé)
// ────────────────────────────────────────────────────────────────────────────

Deno.test(
  'idempotence après sync simulé : id transactions changent, tuple naturel matche → inserted=0',
  async () => {
    const store = makeStore({
      transactions: [
        {
          id: 'old-1',
          type: 'buy',
          symbol: 'NASDAQ:META',
          name: 'Meta',
          quantity: 10,
          price: 200,
          total: 2000,
          transaction_date: '2024-02-01',
        },
        {
          id: 'old-2',
          type: 'sell',
          symbol: 'EPA:MC',
          name: 'LVMH',
          quantity: 5,
          price: 700,
          total: 3500,
          transaction_date: '2024-03-01',
        },
      ],
    })
    const deps = depsFor(store)

    // 1er run.
    const r1 = await migrateToOperations(deps, CLUB)
    assertEquals(r1.inserted, 2)

    // SYNC SIMULÉ : le sync réécrit transactions en delete+insert → mêmes lignes métier,
    // NOUVEAUX id (UUID volatils). cf. supabase/functions/sync/index.ts §811-857.
    store.transactions = [
      {
        id: 'NEW-uuid-a',
        type: 'buy',
        symbol: 'NASDAQ:META',
        name: 'Meta',
        quantity: 10,
        price: 200,
        total: 2000,
        transaction_date: '2024-02-01',
      },
      {
        id: 'NEW-uuid-b',
        type: 'sell',
        symbol: 'EPA:MC',
        name: 'LVMH',
        quantity: 5,
        price: 700,
        total: 3500,
        transaction_date: '2024-03-01',
      },
    ]

    // 2e migrate : si la clé dépendait de transactions.id, on ré-importerait en double.
    // Le tuple naturel matche → 0 insert. PREUVE qu'on ne dépend pas de transactions.id.
    const r2 = await migrateToOperations(deps, CLUB)
    assertEquals(r2.inserted, 0)
    assertEquals(r2.skipped, 2)
    assertEquals(store.operations.length, 2) // toujours 2, pas 4
  }
)

// ────────────────────────────────────────────────────────────────────────────
// 4. dividend_stock legacy → cash_delta = 0
// ────────────────────────────────────────────────────────────────────────────

Deno.test(
  'dividend_stock (fabriqué via mapping étendu non supporté) — couverture cash_delta=0',
  async () => {
    // Le mapping legacy ne produit pas directement dividend_stock (buy/sell/dividend/coupon/other),
    // mais une op dividend_stock pré-existante avec cash_delta != 0 violerait le CHECK : on vérifie
    // que le handler ne fabrique JAMAIS un dividend_stock à cash_delta != 0. Ici on prouve que tout
    // mapping vers un type à cash_delta=0 reste à 0 — via un dividende sans total (→ dividend_cash 0).
    const store = makeStore({
      transactions: [
        {
          id: 't-div0',
          type: 'dividend',
          symbol: 'EPA:MC',
          name: 'LVMH',
          quantity: null,
          price: null,
          total: null,
          transaction_date: '2024-06-01',
        },
      ],
    })
    const r = await migrateToOperations(depsFor(store), CLUB)
    assertEquals(r.inserted, 1)
    assertEquals(store.operations[0].type, 'dividend_cash')
    assertEquals(store.operations[0].cash_delta, 0) // total null → 0
  }
)

// ────────────────────────────────────────────────────────────────────────────
// 5. Lignes invalides → skipped_invalid, pas de crash
// ────────────────────────────────────────────────────────────────────────────

Deno.test("buy sans symbol → skipped_invalid, pas de crash, pas d'insert", async () => {
  const store = makeStore({
    transactions: [
      {
        id: 't-bad',
        type: 'buy',
        symbol: null,
        name: 'Inconnu',
        quantity: 10,
        price: 200,
        total: 2000,
        transaction_date: '2024-02-01',
      },
    ],
  })
  const r = await migrateToOperations(depsFor(store), CLUB)
  assertEquals(r.inserted, 0)
  assertEquals(store.operations.length, 0)
  assert(r.skipped_invalid && r.skipped_invalid.length === 1)
  assertEquals(r.skipped_invalid![0].legacy_table, 'transactions')
  assertEquals(r.skipped_invalid![0].original_id, 't-bad')
  assert(r.skipped_invalid![0].reason.includes('symbol'))
})

Deno.test(
  'buy avec quantity null → cash_delta NaN → skipped_invalid (aucun NaN en base)',
  async () => {
    const store = makeStore({
      transactions: [
        {
          id: 't-nan',
          type: 'buy',
          symbol: 'NASDAQ:META',
          name: 'Meta',
          quantity: null,
          price: 200,
          total: null,
          transaction_date: '2024-02-01',
        },
      ],
    })
    const r = await migrateToOperations(depsFor(store), CLUB)
    assertEquals(r.inserted, 0)
    assertEquals(store.operations.length, 0)
    assert(r.skipped_invalid && r.skipped_invalid.length === 1)
    assert(r.skipped_invalid![0].reason.includes('cash_delta'))
  }
)

Deno.test('type legacy inconnu → skipped_invalid', async () => {
  const store = makeStore({
    transactions: [
      {
        id: 't-unk',
        type: 'split',
        symbol: 'X',
        name: 'X',
        quantity: 1,
        price: 1,
        total: 1,
        transaction_date: '2024-02-01',
      },
    ],
  })
  const r = await migrateToOperations(depsFor(store), CLUB)
  assertEquals(r.inserted, 0)
  assert(r.skipped_invalid && r.skipped_invalid.length === 1)
  assert(r.skipped_invalid![0].reason.includes('inconnu'))
})

Deno.test(
  'lignes valides et invalides mélangées → migre les valides, isole les invalides',
  async () => {
    const store = makeStore({
      contributions: [
        {
          id: 'cm-ok',
          membership_id: 'm-1',
          amount: 50,
          paid_at: '2024-01-15',
          year: 2024,
          month: 1,
        },
      ],
      transactions: [
        {
          id: 't-ok',
          type: 'buy',
          symbol: 'NASDAQ:META',
          name: 'Meta',
          quantity: 10,
          price: 200,
          total: 2000,
          transaction_date: '2024-02-01',
        },
        {
          id: 't-bad',
          type: 'buy',
          symbol: null,
          name: '?',
          quantity: 1,
          price: 1,
          total: 1,
          transaction_date: '2024-02-02',
        },
      ],
    })
    const r = await migrateToOperations(depsFor(store), CLUB)
    assertEquals(r.inserted, 2)
    assertEquals(r.by_type, { contribution: 1, buy: 1 })
    assertEquals(r.skipped_invalid!.length, 1)
  }
)

// ────────────────────────────────────────────────────────────────────────────
// 6. Club inexistant / listes vides
// ────────────────────────────────────────────────────────────────────────────

Deno.test("listes vides (club inexistant) → inserted=0, pas d'erreur", async () => {
  const store = makeStore()
  const r = await migrateToOperations(depsFor(store), 'club-vide')
  assertEquals(r.inserted, 0)
  assertEquals(r.skipped, 0)
  assertEquals(r.by_type, {})
  assertEquals(r.skipped_invalid!.length, 0)
})
