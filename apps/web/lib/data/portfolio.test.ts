import { describe, it, expect } from 'vitest'
import {
  buildPortfolio,
  filterAndSort,
  availableSectors,
  availableTypologies,
  totalFromAggregates,
  balanceAggregates,
  normalizeAggregateLabel,
  type PositionRow,
  type PortfolioAggregate,
} from './portfolio'
import type { PortfolioPosition } from '@evolve/types'

const row = (over: Partial<PositionRow>): PositionRow => ({
  id: '1',
  name: 'META',
  symbol: 'NASDAQ:META',
  category: 'Actions',
  sector: 'Technologie',
  typologie: 'Offensif',
  quantity: 10,
  pump: 100,
  market_price_eur: 180,
  market_value: 1800,
  book_value: 1000,
  allocation_pct: 50,
  gain_loss_eur: 800,
  gain_loss_pct: 80,
  ...over,
})

describe('buildPortfolio', () => {
  it('utilise le prix live quand dispo (quantity × livePrice) et marque isLive', () => {
    const { positions, totalValue } = buildPortfolio([row({})], { 'NASDAQ:META': 200 })
    expect(positions[0]!.currentValue).toBe(2000)
    expect(positions[0]!.isLive).toBe(true)
    expect(totalValue).toBe(2000)
    // prix 200, quantity 10, book_value 1000 → gainLossEur = 2000 − 1000 = 1000
    expect(positions[0]!.gainLossEur).toBe(1000)
  })

  it('retombe sur market_value snapshot quand prix null', () => {
    const { positions } = buildPortfolio([row({})], { 'NASDAQ:META': null })
    expect(positions[0]!.currentValue).toBe(1800)
    expect(positions[0]!.isLive).toBe(false)
    expect(positions[0]!.livePrice).toBeNull()
  })

  it('convertit gain_loss_pct (points de %) en fraction et recalcule allocation sur le total courant', () => {
    const rows = [
      row({ id: '1', symbol: 'A', market_value: 1500 }),
      row({ id: '2', symbol: 'B', market_value: 500 }),
    ]
    const { positions } = buildPortfolio(rows, { A: null, B: null })
    expect(positions[0]!.gainLossPct).toBeCloseTo(0.8)
    expect(positions[0]!.allocationPct).toBeCloseTo(0.75)
  })

  it('prix 0 → fallback snapshot (pas un cours valide)', () => {
    const { positions } = buildPortfolio([row({})], { 'NASDAQ:META': 0 })
    expect(positions[0]!.isLive).toBe(false)
    expect(positions[0]!.livePrice).toBeNull()
    // fallback sur market_value = 1800
    expect(positions[0]!.currentValue).toBe(1800)
  })

  it('secteur null → "Autres" dans l\'allocation', () => {
    const { allocation } = buildPortfolio([row({ sector: null })], { 'NASDAQ:META': null })
    expect(allocation[0]!.label).toBe('Autres')
  })

  it('edge total=0 : aucun NaN sur allocationPct / allocation.percentage', () => {
    const { positions, totalValue, allocation } = buildPortfolio(
      [row({ market_value: 0, quantity: 0 })],
      { 'NASDAQ:META': null }
    )
    expect(totalValue).toBe(0)
    expect(positions[0]!.allocationPct).toBe(0)
    expect(Number.isNaN(positions[0]!.allocationPct)).toBe(false)
    expect(allocation[0]!.percentage).toBe(0)
    expect(Number.isNaN(allocation[0]!.percentage)).toBe(false)
  })

  it("agrège l'allocation par secteur (fractions sommant à ~1)", () => {
    const rows = [
      row({ id: '1', symbol: 'A', sector: 'Technologie', market_value: 700 }),
      row({ id: '2', symbol: 'B', sector: 'Santé', market_value: 300 }),
    ]
    const { allocation } = buildPortfolio(rows, { A: null, B: null })
    const tech = allocation.find((a) => a.label === 'Technologie')!
    expect(tech.percentage).toBeCloseTo(0.7)
    expect(allocation.reduce((s, a) => s + a.percentage, 0)).toBeCloseTo(1)
  })
})

describe('filterAndSort', () => {
  const mk = (over: Partial<PortfolioPosition>): PortfolioPosition => ({
    id: '1',
    name: 'B',
    symbol: 'B',
    category: 'Actions',
    sector: 'Tech',
    typologie: 'Offensif',
    quantity: 1,
    pru: 1,
    livePrice: 1,
    marketPrice: 1,
    currentValue: 100,
    gainLossEur: 0,
    gainLossPct: 0.1,
    allocationPct: 0.5,
    isLive: true,
    ...over,
  })
  const list = [
    mk({ id: '1', name: 'Bravo', sector: 'Tech', currentValue: 100, gainLossPct: 0.1 }),
    mk({ id: '2', name: 'Alpha', sector: 'Santé', currentValue: 300, gainLossPct: -0.2 }),
  ]

  it('filtre par secteur', () => {
    expect(filterAndSort(list, 'Santé', 'value', 'desc')).toHaveLength(1)
  })
  it('trie par valeur desc par défaut', () => {
    expect(filterAndSort(list, null, 'value', 'desc')[0]!.id).toBe('2')
  })
  it('trie par nom asc', () => {
    expect(filterAndSort(list, null, 'name', 'asc')[0]!.name).toBe('Alpha')
  })
  it('trie par performance desc', () => {
    expect(filterAndSort(list, null, 'performance', 'desc')[0]!.gainLossPct).toBe(0.1)
  })

  it('filtre par typologie (vide → "Autres")', () => {
    const typed = [
      mk({ id: '1', typologie: 'Offensif' }),
      mk({ id: '2', typologie: 'Défensif' }),
      mk({ id: '3', typologie: null }),
      mk({ id: '4', typologie: '   ' }),
    ]
    expect(filterAndSort(typed, null, 'value', 'desc', 'Offensif').map((p) => p.id)).toEqual(['1'])
    expect(
      filterAndSort(typed, null, 'value', 'desc', 'Autres')
        .map((p) => p.id)
        .sort()
    ).toEqual(['3', '4'])
  })

  it('filtre combiné secteur ∧ typologie', () => {
    const data = [
      mk({ id: '1', sector: 'Tech', typologie: 'Offensif' }),
      mk({ id: '2', sector: 'Tech', typologie: 'Défensif' }),
      mk({ id: '3', sector: 'Santé', typologie: 'Offensif' }),
    ]
    expect(filterAndSort(data, 'Tech', 'value', 'desc', 'Offensif').map((p) => p.id)).toEqual(['1'])
  })
})

describe('availableSectors / availableTypologies', () => {
  const mk = (over: Partial<PortfolioPosition>): PortfolioPosition => ({
    id: '1',
    name: 'X',
    symbol: 'X',
    category: null,
    sector: 'Tech',
    typologie: 'Offensif',
    quantity: 1,
    pru: 1,
    livePrice: 1,
    marketPrice: 1,
    currentValue: 1,
    gainLossEur: 0,
    gainLossPct: 0,
    allocationPct: 0,
    isLive: true,
    ...over,
  })
  it('déduplique et replie vide → "Autres"', () => {
    const list = [
      mk({ id: '1', sector: 'Tech', typologie: 'Offensif' }),
      mk({ id: '2', sector: 'Tech', typologie: null }),
      mk({ id: '3', sector: '', typologie: 'Défensif' }),
    ]
    expect(availableSectors(list)).toEqual(['Tech', 'Autres'])
    expect(availableTypologies(list)).toEqual(['Offensif', 'Autres', 'Défensif'])
  })
})

describe('agrégats (total + soldes)', () => {
  const agg = (over: Partial<PortfolioAggregate>): PortfolioAggregate => ({
    label: 'Provision',
    market_value: 500,
    book_value: null,
    allocation_pct: null,
    ...over,
  })

  it('normalise le label (accents, casse, espaces)', () => {
    expect(normalizeAggregateLabel('  Portefeuille  ')).toBe('portefeuille')
    expect(normalizeAggregateLabel('Solde : opérations  courts')).toBe('solde : operations courts')
  })

  it('totalFromAggregates retourne la valeur de « Portefeuille » (match insensible)', () => {
    const list = [
      agg({ label: 'Provision', market_value: 500 }),
      agg({ label: 'PORTEFEUILLE', market_value: 12000 }),
    ]
    expect(totalFromAggregates(list)).toBe(12000)
  })

  it('totalFromAggregates → null si absent ou valeur non finie', () => {
    expect(totalFromAggregates([agg({ label: 'Provision' })])).toBeNull()
    expect(totalFromAggregates([agg({ label: 'Portefeuille', market_value: null })])).toBeNull()
  })

  it('balanceAggregates exclut « Portefeuille » et garde le reste', () => {
    const list = [
      agg({ label: 'Portefeuille', market_value: 12000 }),
      agg({ label: 'Provision', market_value: 500 }),
      agg({ label: 'Solde : opérations courts termes', market_value: 300 }),
    ]
    expect(balanceAggregates(list).map((a) => a.label)).toEqual([
      'Provision',
      'Solde : opérations courts termes',
    ])
  })
})
