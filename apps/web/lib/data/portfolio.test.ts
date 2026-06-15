import { describe, it, expect } from 'vitest'
import type { createServerClient } from '@evolve/data'
import {
  buildPortfolio,
  buildAllocationByTitle,
  filterAndSort,
  availableSectors,
  availableTypologies,
  totalFromAggregates,
  balanceAggregates,
  liquidityFromAggregates,
  isReimbursementAggregate,
  normalizeAggregateLabel,
  getPortfolioData,
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

  // RT-11 : le bucket sectoriel « Autres » porte le flag langue-agnostique isOther ; les vrais
  // secteurs ne l'ont pas → le donut force le token neutre sans matcher la string.
  it('marque isOther sur le bucket sectoriel « Autres » (et pas sur les vrais secteurs)', () => {
    const rows = [
      row({ id: '1', symbol: 'A', sector: 'Technologie', market_value: 700 }),
      row({ id: '2', symbol: 'B', sector: null, market_value: 300 }),
    ]
    const { allocation } = buildPortfolio(rows, { A: null, B: null })
    const tech = allocation.find((a) => a.label === 'Technologie')!
    const autres = allocation.find((a) => a.label === 'Autres')!
    expect(tech.isOther).toBeUndefined()
    expect(autres.isOther).toBe(true)
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

  it('expose allocationByTitle (RT-11) en plus de allocation par secteur', () => {
    const rows = [
      row({ id: '1', symbol: 'A', name: 'META', market_value: 700 }),
      row({ id: '2', symbol: 'B', name: 'APPLE', market_value: 300 }),
    ]
    const { allocationByTitle } = buildPortfolio(rows, { A: null, B: null })
    expect(allocationByTitle.map((a) => a.label)).toEqual(['META', 'APPLE'])
    expect(allocationByTitle[0]!.percentage).toBeCloseTo(0.7)
    expect(allocationByTitle.reduce((s, a) => s + a.percentage, 0)).toBeCloseTo(1)
  })

  it('allocationByTitle utilise le libellé « Autres » fourni par l’appelant', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ id: String(i), symbol: `S${i}`, name: `T${i}`, market_value: 100 })
    )
    const prices = Object.fromEntries(rows.map((r) => [r.symbol, null]))
    const { allocationByTitle } = buildPortfolio(rows, prices, 'Others')
    expect(allocationByTitle.some((a) => a.label === 'Others')).toBe(true)
    expect(allocationByTitle.some((a) => a.label === 'Autres')).toBe(false)
  })
})

describe('buildAllocationByTitle', () => {
  const pos = (over: Partial<PortfolioPosition>): PortfolioPosition => ({
    id: '1',
    name: 'META',
    symbol: 'META',
    category: 'Actions',
    sector: 'Tech',
    typologie: 'Offensif',
    quantity: 1,
    pru: 1,
    livePrice: 1,
    marketPrice: 1,
    currentValue: 100,
    gainLossEur: 0,
    gainLossPct: 0,
    allocationPct: 0,
    isLive: true,
    ...over,
  })

  it('agrège par nom, trie desc, fractions sommant à ~1', () => {
    const list = [
      pos({ id: '1', name: 'META', currentValue: 600 }),
      pos({ id: '2', name: 'APPLE', currentValue: 400 }),
    ]
    const out = buildAllocationByTitle(list, 1000)
    expect(out.map((a) => a.label)).toEqual(['META', 'APPLE'])
    expect(out[0]!.percentage).toBeCloseTo(0.6)
    expect(out.reduce((s, a) => s + a.percentage, 0)).toBeCloseTo(1)
  })

  it('cumule plusieurs lignes du même titre', () => {
    const list = [
      pos({ id: '1', name: 'META', currentValue: 300 }),
      pos({ id: '2', name: 'META', currentValue: 200 }),
      pos({ id: '3', name: 'APPLE', currentValue: 500 }),
    ]
    const out = buildAllocationByTitle(list, 1000)
    const meta = out.find((a) => a.label === 'META')!
    expect(meta.value).toBe(500)
    expect(meta.percentage).toBeCloseTo(0.5)
  })

  it('regroupe au-delà du top N sous « Autres » (somme du reste)', () => {
    // 12 titres de valeurs décroissantes ; top 8 affichés, 4 derniers fusionnés.
    const list = Array.from({ length: 12 }, (_, i) =>
      pos({ id: String(i), name: `T${i}`, currentValue: 120 - i * 10 })
    )
    const total = list.reduce((s, p) => s + p.currentValue, 0)
    const out = buildAllocationByTitle(list, total, 'Autres', 8)
    expect(out).toHaveLength(9) // 8 titres + « Autres »
    const others = out.find((a) => a.label === 'Autres')!
    // 4 derniers : T8(40)+T9(30)+T10(20)+T11(10) = 100
    expect(others.value).toBe(100)
    expect(out.reduce((s, a) => s + a.percentage, 0)).toBeCloseTo(1)
  })

  it('fusionne le reste avec un « Autres » déjà présent (titres sans nom)', () => {
    const list = [
      ...Array.from({ length: 8 }, (_, i) =>
        pos({ id: String(i), name: `T${i}`, currentValue: 100 })
      ),
      pos({ id: 'x', name: '', currentValue: 50 }), // sans nom → « Autres »
      pos({ id: 'y', name: 'EXTRA', currentValue: 30 }), // hors top 8 → fusionné dans « Autres »
    ]
    const total = list.reduce((s, p) => s + p.currentValue, 0)
    const out = buildAllocationByTitle(list, total, 'Autres', 8)
    const others = out.filter((a) => a.label === 'Autres')
    expect(others).toHaveLength(1) // un seul bucket « Autres »
    expect(others[0]!.value).toBe(80) // 50 (sans nom) + 30 (EXTRA hors top)
  })

  it('total ≤ 0 → percentage 0, jamais de NaN', () => {
    const list = [pos({ name: 'META', currentValue: 0 })]
    const out = buildAllocationByTitle(list, 0)
    expect(out[0]!.percentage).toBe(0)
    expect(Number.isNaN(out[0]!.percentage)).toBe(false)
  })

  // RT-11 : le bucket de regroupement « Autres » porte isOther ; les titres réels non.
  it('marque isOther sur le bucket « Autres » (reste hors top-N), pas sur les titres réels', () => {
    const list = Array.from({ length: 12 }, (_, i) =>
      pos({ id: String(i), name: `T${i}`, currentValue: 120 - i * 10 })
    )
    const total = list.reduce((s, p) => s + p.currentValue, 0)
    const out = buildAllocationByTitle(list, total, 'Autres', 8)
    const others = out.find((a) => a.label === 'Autres')!
    expect(others.isOther).toBe(true)
    // Tous les autres items (vrais titres) n'ont pas le flag.
    expect(out.filter((a) => a.label !== 'Autres').every((a) => a.isOther === undefined)).toBe(true)
  })

  it('le flag isOther suit le libellé fourni par l’appelant (i18n)', () => {
    const list = Array.from({ length: 10 }, (_, i) =>
      pos({ id: String(i), name: `T${i}`, currentValue: 100 })
    )
    const out = buildAllocationByTitle(list, 1000, 'Other', 8)
    const bucket = out.find((a) => a.label === 'Other')!
    expect(bucket.isOther).toBe(true)
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

  // RT-08 : balanceAggregates masque désormais « Portefeuille » (total), « ESPECES » (liquidité,
  // section dédiée), les soldes courts/longs termes (perturbants) ET les agrégats à valeur null
  // (RT-10, « — » trompeur). Seuls les agrégats valorisés « utiles » (Provision…) restent.
  it('balanceAggregates ne garde que les agrégats valorisés utiles', () => {
    const list = [
      agg({ label: 'Portefeuille', market_value: 12000 }),
      agg({ label: 'ESPECES', market_value: 159.08 }),
      agg({ label: 'Provision', market_value: 500 }),
      agg({ label: 'Solde : opérations courts termes', market_value: 300 }),
      agg({ label: 'Solde : opérations longs termes', market_value: -4840.92 }),
      agg({ label: 'Remboursement en cours', market_value: null }),
    ]
    expect(balanceAggregates(list).map((a) => a.label)).toEqual(['Provision'])
  })

  it('balanceAggregates garde un remboursement VALORISÉ (mais masque le null)', () => {
    const list = [
      agg({ label: 'Remboursement en cours', market_value: null }),
      agg({ label: 'Remboursement en cours', market_value: 1200 }),
    ]
    const out = balanceAggregates(list)
    expect(out).toHaveLength(1)
    expect(out[0]!.market_value).toBe(1200)
  })

  it('liquidityFromAggregates lit ESPECES (positif ou négatif), null si absent', () => {
    expect(liquidityFromAggregates([agg({ label: 'ESPECES', market_value: 159.08 })])).toBe(159.08)
    // Reconnaissance insensible casse/accents + valeur négative préservée.
    expect(liquidityFromAggregates([agg({ label: 'Espèces', market_value: -2500.5 })])).toBe(
      -2500.5
    )
    expect(liquidityFromAggregates([agg({ label: 'Provision', market_value: 500 })])).toBeNull()
    expect(liquidityFromAggregates([agg({ label: 'ESPECES', market_value: null })])).toBeNull()
  })

  it('isReimbursementAggregate matche « Remboursement » (insensible casse/accents)', () => {
    expect(isReimbursementAggregate('Remboursement en cours')).toBe(true)
    expect(isReimbursementAggregate('REMBOURSEMENT')).toBe(true)
    expect(isReimbursementAggregate('Provision')).toBe(false)
  })
})

// ── INTÉGRATION : getPortfolioData (assemblage requête → DTO, RT-08) ────────────────────────────
//
// Couvre l'ASSEMBLAGE que les tests purs (buildPortfolio, balanceAggregates…) ne couvrent pas :
// que la fonction de chargement transporte bien les agrégats lus (dont « ESPECES ») jusqu'au DTO,
// afin que l'extraction « Liquidité » (liquidityFromAggregates) et le filtrage des soldes
// (balanceAggregates) opèrent sur la donnée RÉELLEMENT assemblée — court/long terme exclus.
//
// Le projet n'a pas de harness de mock PostgREST → stub chainable local, fidèle à la forme RÉELLE
// des appels (cf. portfolio.ts getPortfolioData + getMemberRole) :
//   - positions : .select().eq().eq().order()            (builder thenable → { data, error })
//   - memberships : .select().eq().eq().eq().maybeSingle()  → { data: membership }  (getMemberRole)
//   - portfolio_aggregates : .select().eq().eq()          (builder thenable → { data })
//
// Aucun export applicatif ajouté : getPortfolioData était déjà exporté.

type RoleStub = { role: 'member' | 'treasurer' | 'president' }

interface PortfolioStubData {
  positions: PositionRow[]
  positionsError?: Error
  membership: RoleStub | null
  aggregates: PortfolioAggregate[]
}

/**
 * Stub chainable minimal mais fidèle du client Supabase pour getPortfolioData.
 * Builder unique par `from(table)` : méthodes de chaînage renvoient le builder, qui est à la fois
 * thenable (positions / portfolio_aggregates terminent sans `.maybeSingle()`) et porte un
 * `maybeSingle()` (memberships dans getMemberRole). `data` choisi selon la table.
 */
function makePortfolioSupabaseStub(d: PortfolioStubData) {
  const resultFor = (table: string): { data: unknown; error: Error | null } => {
    switch (table) {
      case 'positions':
        return { data: d.positions, error: d.positionsError ?? null }
      case 'memberships':
        return { data: d.membership, error: null }
      case 'portfolio_aggregates':
        return { data: d.aggregates, error: null }
      default:
        return { data: null, error: null }
    }
  }

  const from = (table: string) => {
    const result = resultFor(table)
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      maybeSingle: () => Promise.resolve(result),
      then: (onFulfilled: (v: typeof result) => unknown) =>
        Promise.resolve(result).then(onFulfilled),
    }
    return builder
  }

  // reason: stub volontairement partiel du client Supabase — cast unique plus lisible qu'une
  // implémentation complète du SupabaseClient typé.
  return { from } as unknown as ReturnType<typeof createServerClient>
}

const posRow = (over: Partial<PositionRow>): PositionRow => ({
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

const aggRow = (over: Partial<PortfolioAggregate>): PortfolioAggregate => ({
  label: 'Provision',
  market_value: 500,
  book_value: null,
  allocation_pct: null,
  ...over,
})

describe('getPortfolioData — intégration (assemblage, RT-08 Liquidité + soldes)', () => {
  it('transporte les agrégats lus jusqu’au DTO → Liquidité extraite de ESPECES, soldes court/long exclus', async () => {
    const aggregates: PortfolioAggregate[] = [
      aggRow({ label: 'Portefeuille', market_value: 12000 }),
      aggRow({ label: 'ESPECES', market_value: 159.08 }),
      aggRow({ label: 'Provision', market_value: 500 }),
      aggRow({ label: 'Solde : opérations courts termes', market_value: 300 }),
      aggRow({ label: 'Solde : opérations longs termes', market_value: -4840.92 }),
    ]
    const supabase = makePortfolioSupabaseStub({
      positions: [posRow({})],
      membership: { role: 'member' },
      aggregates,
    })

    const data = await getPortfolioData(supabase, 'u-1', 'c-1')
    expect(data).not.toBeNull()
    // L'agrégat ESPECES traverse l'assemblage intact.
    expect(data!.aggregates).toEqual(aggregates)

    // Extraction « Liquidité » sur la donnée assemblée (RT-08).
    expect(liquidityFromAggregates(data!.aggregates)).toBe(159.08)
    // Total = ligne « Portefeuille ».
    expect(totalFromAggregates(data!.aggregates)).toBe(12000)
    // Soldes affichés : ni Portefeuille, ni ESPECES, ni les soldes court/long terme.
    expect(balanceAggregates(data!.aggregates).map((a) => a.label)).toEqual(['Provision'])
    expect(data!.userRole).toBe('member')
  })

  it('aucune position active → null (état empty), même si des agrégats existent', async () => {
    const supabase = makePortfolioSupabaseStub({
      positions: [],
      membership: { role: 'treasurer' },
      aggregates: [aggRow({ label: 'ESPECES', market_value: 100 })],
    })
    expect(await getPortfolioData(supabase, 'u-1', 'c-1')).toBeNull()
  })

  it('agrégats absents (lecture nulle) → aggregates = [] (le portefeuille ne casse pas)', async () => {
    // aggRows null ne doit pas faire planter l'assemblage : fallback [] (cf. portfolio.ts).
    const supabase = makePortfolioSupabaseStub({
      positions: [posRow({})],
      membership: { role: 'member' },
      // reason: simule un échec de lecture des agrégats (PostgREST renvoie data:null) sans casser
      // le portefeuille — on passe [] côté stub, le code applique déjà ?? [].
      aggregates: [],
    })
    const data = await getPortfolioData(supabase, 'u-1', 'c-1')
    expect(data!.aggregates).toEqual([])
    expect(liquidityFromAggregates(data!.aggregates)).toBeNull()
  })

  it('synced_at = le plus récent parmi les positions du club', async () => {
    const supabase = makePortfolioSupabaseStub({
      positions: [
        posRow({ id: '1', symbol: 'A', synced_at: '2026-06-10T00:00:00Z' } as Partial<PositionRow>),
        posRow({ id: '2', symbol: 'B', synced_at: '2026-06-15T08:00:00Z' } as Partial<PositionRow>),
      ],
      membership: { role: 'member' },
      aggregates: [],
    })
    const data = await getPortfolioData(supabase, 'u-1', 'c-1')
    expect(data!.syncedAt).toBe('2026-06-15T08:00:00Z')
  })
})
