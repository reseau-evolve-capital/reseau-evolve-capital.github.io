import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types.gen.ts'
import {
  getClubCashBalance,
  listRecentOperations,
  listOperations,
  getClubPositionsFromOps,
} from './client.ts'
import type { OperationPositionRow, OperationRow } from './types.ts'

type Db = Database

/** Mock minimal d'un client Supabase exposant `.rpc(...)`. */
function rpcClient(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { client: { rpc } as unknown as SupabaseClient<Db>, rpc }
}

/**
 * Mock de la chaîne `from(table).select(*).eq(...).order(...).limit(...)`.
 * `limit` est terminal (awaité) et renvoie `{ data, error }`.
 */
function selectClient(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result)
  const order = vi.fn().mockReturnValue({ limit })
  const eq = vi.fn().mockReturnValue({ order })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return {
    client: { from } as unknown as SupabaseClient<Db>,
    spies: { from, select, eq, order, limit },
  }
}

/**
 * Mock du query builder filtrable de `listOperations`.
 * Tous les filtres (`eq`/`in`/`gte`/`lte`/`order`) retournent le builder ; `range` est
 * terminal (awaité) et résout `{ data, error }`.
 */
function filterClient(result: { data: unknown; error: unknown }) {
  const range = vi.fn().mockResolvedValue(result)
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    range,
  }
  for (const m of ['select', 'eq', 'in', 'gte', 'lte', 'order'] as const) {
    builder[m].mockReturnValue(builder)
  }
  const from = vi.fn().mockReturnValue(builder)
  return { client: { from } as unknown as SupabaseClient<Db>, spies: { from, ...builder } }
}

function positionRow(overrides: Partial<OperationPositionRow> = {}): OperationPositionRow {
  return {
    symbol: 'NASDAQ:META',
    asset_name: 'Meta Platforms',
    currency: 'EUR',
    total_quantity: 12,
    last_unit_price: 500,
    cash_invested: 6000,
    ...overrides,
  }
}

function row(overrides: Partial<OperationRow> = {}): OperationRow {
  return {
    id: 'op-1',
    club_id: 'club-1',
    membership_id: null,
    type: 'contribution',
    status: 'confirmed',
    source: 'manual',
    cash_delta: 100,
    symbol: null,
    asset_name: null,
    quantity: null,
    unit_price: null,
    currency: 'EUR',
    fx_rate: null,
    operation_date: '2026-06-01',
    settlement_date: null,
    recorded_at: '2026-06-01T00:00:00Z',
    recorded_by: null,
    parts_allocated: null,
    part_price_at_settlement: null,
    broker_reference: null,
    notes: null,
    is_cancelled: false,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    corrects_operation_id: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    metadata: {},
    ...overrides,
  }
}

describe('getClubCashBalance', () => {
  it('appelle la RPC get_club_cash_balance avec le club_id et renvoie le solde', async () => {
    const { client, rpc } = rpcClient({ data: 4250.5, error: null })
    const balance = await getClubCashBalance(client, 'club-1')
    expect(rpc).toHaveBeenCalledWith('get_club_cash_balance', { p_club_id: 'club-1' })
    expect(balance).toBe(4250.5)
  })

  it('data null → 0 (jamais NaN)', async () => {
    const { client } = rpcClient({ data: null, error: null })
    const balance = await getClubCashBalance(client, 'club-1')
    expect(balance).toBe(0)
  })

  it('erreur RPC → fallback 0 (fail-closed, pas de throw)', async () => {
    const { client } = rpcClient({ data: null, error: { message: 'forbidden' } })
    const balance = await getClubCashBalance(client, 'club-1')
    expect(balance).toBe(0)
  })

  it('data non numérique → 0', async () => {
    const { client } = rpcClient({ data: 'NaN', error: null })
    const balance = await getClubCashBalance(client, 'club-1')
    expect(balance).toBe(0)
  })
})

describe('listRecentOperations', () => {
  it('lit operations du club, triées par operation_date desc, et mappe en DTO', async () => {
    const { client, spies } = selectClient({
      data: [row({ id: 'op-2', cash_delta: 200 }), row({ id: 'op-1', cash_delta: 100 })],
      error: null,
    })
    const ops = await listRecentOperations(client, 'club-1')
    expect(spies.from).toHaveBeenCalledWith('operations')
    expect(spies.select).toHaveBeenCalledWith('*')
    expect(spies.eq).toHaveBeenCalledWith('club_id', 'club-1')
    expect(spies.order).toHaveBeenCalledWith('operation_date', { ascending: false })
    expect(spies.limit).toHaveBeenCalledWith(50)
    expect(ops).toHaveLength(2)
    expect(ops[0]?.id).toBe('op-2')
    expect(ops[0]?.cashDelta).toBe(200)
  })

  it('respecte le paramètre limit', async () => {
    const { client, spies } = selectClient({ data: [], error: null })
    await listRecentOperations(client, 'club-1', 10)
    expect(spies.limit).toHaveBeenCalledWith(10)
  })

  it('data null → [] (jamais de crash)', async () => {
    const { client } = selectClient({ data: null, error: null })
    const ops = await listRecentOperations(client, 'club-1')
    expect(ops).toEqual([])
  })

  it('erreur → [] (fail-closed)', async () => {
    const { client } = selectClient({ data: null, error: { message: 'rls' } })
    const ops = await listRecentOperations(client, 'club-1')
    expect(ops).toEqual([])
  })
})

describe('listOperations', () => {
  it('filtre par club, trie operation_date desc puis recorded_at desc, pagine et mappe', async () => {
    const { client, spies } = filterClient({
      data: [row({ id: 'op-2', cash_delta: 200 }), row({ id: 'op-1', cash_delta: 100 })],
      error: null,
    })
    const ops = await listOperations(client, 'club-1')
    expect(spies.from).toHaveBeenCalledWith('operations')
    expect(spies.select).toHaveBeenCalledWith('*')
    expect(spies.eq).toHaveBeenCalledWith('club_id', 'club-1')
    expect(spies.order).toHaveBeenCalledWith('operation_date', { ascending: false })
    expect(spies.order).toHaveBeenCalledWith('recorded_at', { ascending: false })
    expect(spies.range).toHaveBeenCalledWith(0, 49)
    expect(ops).toHaveLength(2)
    expect(ops[0]?.id).toBe('op-2')
    expect(ops[0]?.cashDelta).toBe(200)
  })

  it('applique les filtres optionnels (types, membership, from, to)', async () => {
    const { client, spies } = filterClient({ data: [], error: null })
    await listOperations(client, 'club-1', {
      types: ['buy', 'sell'],
      membershipId: 'mem-1',
      from: '2026-01-01',
      to: '2026-12-31',
    })
    expect(spies.in).toHaveBeenCalledWith('type', ['buy', 'sell'])
    expect(spies.eq).toHaveBeenCalledWith('membership_id', 'mem-1')
    expect(spies.gte).toHaveBeenCalledWith('operation_date', '2026-01-01')
    expect(spies.lte).toHaveBeenCalledWith('operation_date', '2026-12-31')
  })

  it('types vide / membership null → pas de filtre type/membership', async () => {
    const { client, spies } = filterClient({ data: [], error: null })
    await listOperations(client, 'club-1', { types: [], membershipId: null })
    expect(spies.in).not.toHaveBeenCalled()
    expect(spies.eq).toHaveBeenCalledTimes(1) // uniquement club_id
  })

  it('limit/offset personnalisés → range(offset, offset+limit-1)', async () => {
    const { client, spies } = filterClient({ data: [], error: null })
    await listOperations(client, 'club-1', { limit: 10, offset: 20 })
    expect(spies.range).toHaveBeenCalledWith(20, 29)
  })

  it('data null → [] ; erreur → [] (fail-closed)', async () => {
    const a = filterClient({ data: null, error: null })
    expect(await listOperations(a.client, 'club-1')).toEqual([])
    const b = filterClient({ data: null, error: { message: 'rls' } })
    expect(await listOperations(b.client, 'club-1')).toEqual([])
  })
})

describe('getClubPositionsFromOps', () => {
  it('appelle la RPC avec p_club_id et mappe chaque ligne en DTO', async () => {
    const { client, rpc } = rpcClient({
      data: [positionRow(), positionRow({ symbol: 'NASDAQ:AAPL', total_quantity: 5 })],
      error: null,
    })
    const positions = await getClubPositionsFromOps(client, 'club-1')
    expect(rpc).toHaveBeenCalledWith('get_club_positions_from_ops', { p_club_id: 'club-1' })
    expect(positions).toHaveLength(2)
    expect(positions[0]?.symbol).toBe('NASDAQ:META')
    expect(positions[0]?.cashInvested).toBe(6000)
    expect(positions[1]?.totalQuantity).toBe(5)
  })

  it('data null → [] ; erreur → [] (fail-closed)', async () => {
    const a = rpcClient({ data: null, error: null })
    expect(await getClubPositionsFromOps(a.client, 'club-1')).toEqual([])
    const b = rpcClient({ data: null, error: { message: 'rls' } })
    expect(await getClubPositionsFromOps(b.client, 'club-1')).toEqual([])
  })
})
