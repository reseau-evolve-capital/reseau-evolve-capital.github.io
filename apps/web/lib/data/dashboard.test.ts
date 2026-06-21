import { describe, it, expect } from 'vitest'

import type { createServerClient } from '@evolve/data'

import {
  clubPortfolioFromAggregates,
  contributionStatusLabel,
  getDashboardData,
  type ContributionStatus,
} from './dashboard'

type ServerClient = ReturnType<typeof createServerClient>

/** Réponse `{ data, error }` retournée par un terminateur `maybeSingle`. */
type SingleResult = { data: unknown; error: unknown }

/**
 * Construit un faux client Supabase chaînable (zéro réseau).
 * `.from(table)` renvoie un objet dont `.select().eq()....maybeSingle()`
 * résout vers la fixture associée à la table. Les `.eq()`/`.lte()`/`.order()`
 * se chaînent à l'infini ; `.maybeSingle()` ET `.returns()` terminent la chaîne
 * (le dashboard lit `contribution_months` via `.lte().returns()`, pas `.maybeSingle()`).
 */
function makeSupabaseMock(fixtures: Record<string, SingleResult>): ServerClient {
  const from = (table: string) => {
    const result = fixtures[table] ?? { data: null, error: null }
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.eq = () => chain
    chain.lte = () => chain
    chain.order = () => chain
    chain.maybeSingle = () => Promise.resolve(result)
    chain.returns = () => Promise.resolve(result)
    // `portfolio_aggregates` est awaité SANS terminateur (le builder Supabase est thenable) →
    // on rend la chaîne thenable pour qu'un `await` résolve vers la fixture {data, error}.
    chain.then = (onFulfilled: (v: SingleResult) => unknown) =>
      Promise.resolve(result).then(onFulfilled)
    return chain
  }
  return { from } as unknown as ServerClient
}

describe('contributionStatusLabel', () => {
  it.each([
    ['ok', 'À jour'],
    ['pending', 'En attente'],
    ['late', 'En retard'],
    ['exempt', 'Exempté'],
  ] as [ContributionStatus, string][])('mappe %s → %s', (status, label) => {
    expect(contributionStatusLabel(status)).toBe(label)
  })

  it('retourne le fallback "—" pour une valeur hors enum', () => {
    expect(contributionStatusLabel('unknown' as ContributionStatus)).toBe('—')
  })
})

describe('getDashboardData', () => {
  it('retourne null si member_quote_part est vide (état empty)', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: { data: null, error: null },
    })
    const result = await getDashboardData(supabase, 'user-1', 'club-1')
    expect(result).toBeNull()
  })

  it('rejette si la requête member_quote_part renvoie une erreur', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: { data: null, error: { message: 'boom' } },
    })
    await expect(getDashboardData(supabase, 'user-1', 'club-1')).rejects.toThrow()
  })

  it('coerce les colonnes numériques (string → number) et compose le DTO', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: {
        data: {
          role: 'member',
          joined_at: '2018-06-01',
          detention_pct: '0.1234',
          total_contributed: '12000',
          net_market_value: '65574.87',
          contribution_status: 'ok',
          amount_due: '0',
        },
        error: null,
      },
      users: { data: { firstname: 'Ruben', full_name: 'AFOUDAH Ruben' }, error: null },
      // E2 : syncedAt vient de clubs.synced_at (timestamp du club), pas de member_quote_part.
      clubs: { data: { name: 'Club Test', synced_at: '2026-06-05T10:00:00Z' }, error: null },
      // Valo club RÉELLE (teaser V2) : agrégat « Portefeuille » → valeur + gain/perte total.
      portfolio_aggregates: {
        data: [{ label: 'Portefeuille', market_value: 732510.61, book_value: 315429.61 }],
        error: null,
      },
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')

    expect(result).not.toBeNull()
    // clubPortfolio : valeur = market_value de l'agrégat « Portefeuille » (même source que /portfolio).
    expect(result?.clubPortfolio.value).toBe(732510.61)
    expect(result?.clubPortfolio.gainLossEur).toBeCloseTo(417081, 0)
    expect(result?.clubPortfolio.gainLossPct).toBeCloseTo(1.3223, 3)
    // E2 : la source du statut de sync est clubs.synced_at (unifiée avec la topbar desktop).
    expect(result?.syncedAt).toBe('2026-06-05T10:00:00Z')
    // Coercition Number() : valeurs numériques renvoyées comme number, pas string.
    expect(result?.netMarketValue).toBe(65574.87)
    expect(typeof result?.netMarketValue).toBe('number')
    expect(result?.detentionPct).toBe(0.1234)
    expect(result?.totalContributed).toBe(12000)
    expect(result?.clubId).toBe('club-1')
    expect(result?.contribution.status).toBe('ok')
    expect(result?.contribution.amountDue).toBe(0)
    expect(result?.club.name).toBe('Club Test')
    expect(result?.member.firstname).toBe('Ruben')
    expect(result?.member.fullName).toBe('AFOUDAH Ruben')
    expect(result?.member.role).toBe('member')
  })

  it('retombe sur "Membre" quand le profil utilisateur est absent', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: {
        data: {
          role: 'member',
          joined_at: null,
          detention_pct: '0',
          total_contributed: '0',
          net_market_value: '0',
          contribution_status: 'pending',
          amount_due: '0',
        },
        error: null,
      },
      users: { data: null, error: null },
      // clubs.synced_at absent → syncedAt retombe sur null (état « jamais synchronisé »).
      clubs: { data: { name: 'Club Test' }, error: null },
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')

    expect(result?.member.fullName).toBe('Membre')
    expect(result?.member.firstname).toBeNull()
    expect(result?.syncedAt).toBeNull()
  })

  // Fallback de statut (le bug d'origine) : la feuille COTISATIONS renvoie `pending` (cellule
  // vide / #ERROR!) mais l'échéancier mensuel sait que le membre est en retard ou à jour.
  const mqpPending = {
    role: 'member',
    joined_at: '2018-06-01',
    detention_pct: '0',
    total_contributed: '0',
    net_market_value: '0',
    contribution_status: 'pending',
    amount_due: '150',
  }

  it('feuille `pending` + arriérés dans l’échéancier → dérive `late` (CAS DU BUG)', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: { data: mqpPending, error: null },
      users: { data: { firstname: 'Test', full_name: 'Membre Test' }, error: null },
      clubs: { data: { name: 'Club Test', synced_at: '2026-06-05T10:00:00Z' }, error: null },
      memberships: { data: { id: 'm-1' }, error: null },
      contribution_months: {
        data: [
          { year: 2020, month: 1, amount: '100', status: 'paid' },
          { year: 2020, month: 2, amount: '0', status: 'late' },
          { year: 2020, month: 3, amount: '0', status: 'late' },
        ],
        error: null,
      },
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')
    expect(result?.contribution.status).toBe('late')
  })

  it('feuille `pending` + tous les mois payés → dérive `ok`', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: { data: mqpPending, error: null },
      users: { data: { firstname: 'Test', full_name: 'Membre Test' }, error: null },
      clubs: { data: { name: 'Club Test' }, error: null },
      memberships: { data: { id: 'm-1' }, error: null },
      contribution_months: {
        data: [
          { year: 2020, month: 1, amount: '100', status: 'paid' },
          { year: 2020, month: 2, amount: '100', status: 'paid' },
        ],
        error: null,
      },
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')
    expect(result?.contribution.status).toBe('ok')
  })

  it('feuille explicite `ok` → conservée, AUCUNE dérivation même avec des arriérés', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: { data: { ...mqpPending, contribution_status: 'ok' }, error: null },
      users: { data: { firstname: 'Test', full_name: 'Membre Test' }, error: null },
      clubs: { data: { name: 'Club Test' }, error: null },
      memberships: { data: { id: 'm-1' }, error: null },
      contribution_months: {
        data: [{ year: 2020, month: 2, amount: '0', status: 'late' }],
        error: null,
      },
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')
    expect(result?.contribution.status).toBe('ok')
  })

  it('clubPortfolio.value null quand l’agrégat « Portefeuille » est absent', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: {
        data: {
          role: 'member',
          joined_at: null,
          detention_pct: '0',
          total_contributed: '0',
          net_market_value: '0',
          contribution_status: 'ok',
          amount_due: '0',
        },
        error: null,
      },
      users: { data: null, error: null },
      clubs: { data: { name: 'Club Test' }, error: null },
      // pas de fixture portfolio_aggregates → aucune ligne « Portefeuille ».
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')
    expect(result?.clubPortfolio.value).toBeNull()
    expect(result?.clubPortfolio.gainLossPct).toBeNull()
  })
})

describe('clubPortfolioFromAggregates', () => {
  it('extrait la valeur + le gain/perte total depuis l’agrégat « Portefeuille »', () => {
    const out = clubPortfolioFromAggregates([
      { label: 'Portefeuille', market_value: 1200, book_value: 1000 },
      { label: 'ESPECES', market_value: 50, book_value: null },
    ])
    expect(out.value).toBe(1200)
    expect(out.gainLossEur).toBe(200)
    expect(out.gainLossPct).toBeCloseTo(0.2, 6)
  })

  it('match insensible à la casse/aux accents (« PORTEFEUILLE »)', () => {
    const out = clubPortfolioFromAggregates([
      { label: '  PORTEFEUILLE ', market_value: 500, book_value: 400 },
    ])
    expect(out.value).toBe(500)
    expect(out.gainLossEur).toBe(100)
  })

  it('agrégat absent → tout null', () => {
    expect(clubPortfolioFromAggregates([])).toEqual({
      value: null,
      gainLossEur: null,
      gainLossPct: null,
    })
  })

  it('prix d’achat absent ou ≤ 0 → valeur seule, gain/perte null (jamais de division par 0)', () => {
    const noBook = clubPortfolioFromAggregates([
      { label: 'Portefeuille', market_value: 1200, book_value: null },
    ])
    expect(noBook.value).toBe(1200)
    expect(noBook.gainLossEur).toBeNull()
    expect(noBook.gainLossPct).toBeNull()

    const zeroBook = clubPortfolioFromAggregates([
      { label: 'Portefeuille', market_value: 1200, book_value: 0 },
    ])
    expect(zeroBook.gainLossPct).toBeNull()
  })

  it('perte (valeur < prix d’achat) → gain/perte négatif', () => {
    const out = clubPortfolioFromAggregates([
      { label: 'Portefeuille', market_value: 800, book_value: 1000 },
    ])
    expect(out.gainLossEur).toBe(-200)
    expect(out.gainLossPct).toBeCloseTo(-0.2, 6)
  })
})
