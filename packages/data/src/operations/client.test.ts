import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/types.gen.ts'
import { getClubCashBalance, listRecentOperations } from './client.ts'
import type { OperationRow } from './types.ts'

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
