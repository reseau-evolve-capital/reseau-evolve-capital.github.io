import {
  OPERATION_TYPES,
  OPERATION_TYPE_ORDER,
  OPERATION_VISUAL_CLASSES,
  getOperationType,
} from './operationTypes'

describe('OPERATION_TYPES (catalogue)', () => {
  it('couvre les 12 types métier de @evolve/data', () => {
    const keys = Object.keys(OPERATION_TYPES)
    expect(keys).toHaveLength(12)
    for (const k of [
      'contribution',
      'member_exit',
      'buy',
      'sell',
      'dividend_cash',
      'dividend_stock',
      'fee',
      'penalty',
      'capital_call',
      'distribution',
      'valuation',
      'correction',
    ]) {
      expect(keys).toContain(k)
    }
  })

  it('mappe les signes cash de la spec §2', () => {
    expect(OPERATION_TYPES.contribution.cashSign).toBe(1)
    expect(OPERATION_TYPES.sell.cashSign).toBe(1)
    expect(OPERATION_TYPES.dividend_cash.cashSign).toBe(1)
    expect(OPERATION_TYPES.buy.cashSign).toBe(-1)
    expect(OPERATION_TYPES.fee.cashSign).toBe(-1)
    expect(OPERATION_TYPES.penalty.cashSign).toBe(-1)
  })

  it('mappe les familles de style de la spec §2', () => {
    expect(OPERATION_TYPES.contribution.kind).toBe('positive')
    expect(OPERATION_TYPES.buy.kind).toBe('neutral')
    expect(OPERATION_TYPES.dividend_cash.kind).toBe('dividend')
    expect(OPERATION_TYPES.fee.kind).toBe('warning')
    expect(OPERATION_TYPES.penalty.kind).toBe('negative')
  })

  it('chaque famille a des classes token-driven (jamais de hex)', () => {
    for (const v of Object.values(OPERATION_VISUAL_CLASSES)) {
      expect(v.chipBg.startsWith('bg-')).toBe(true)
      expect(v.chipFg.startsWith('text-')).toBe(true)
      expect(JSON.stringify(v)).not.toMatch(/#[0-9a-f]{3,6}/i)
    }
  })

  it('getOperationType : clé connue', () => {
    expect(getOperationType('sell').label).toBe('Vente')
  })

  it('getOperationType : clé inconnue / null → repli correction (neutre)', () => {
    expect(getOperationType('zzz').key).toBe('correction')
    expect(getOperationType(null).key).toBe('correction')
    expect(getOperationType(undefined).kind).toBe('neutral')
  })

  it('ordre de l’assistant = 6 types cœur (spec §4)', () => {
    expect(OPERATION_TYPE_ORDER).toEqual([
      'contribution',
      'buy',
      'sell',
      'dividend_cash',
      'fee',
      'penalty',
    ])
  })
})
