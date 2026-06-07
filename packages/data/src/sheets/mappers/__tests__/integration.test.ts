// Tests d'intégration du pipeline de mappers sur une FIXTURE FIGÉE (5 feuilles).
//
// Objectif (SHE-008) : valider le comportement end-to-end des 6 mappers sur un
// jeu de données réaliste et immuable, indépendamment de l'Edge Function `sync`
// (qui orchestre ces mappers mais ajoute l'I/O Supabase). On vérifie ici les
// transformations pures : idempotence, statut "Membre sorti", isolement des
// lignes d'agrégat, parsing de période, gestion des NaN, mapping de type, et
// matching/non-matching des cotisations par nom.
//
// La fixture est volontairement petite (3 membres dont 1 sorti) mais couvre tous
// les cas-limites attendus par les tickets SHE-*. Elle est gelée : la modifier
// invalide les assertions ci-dessous (c'est le but — détecter une régression de
// mapper ou de structure DTO).

import { describe, it, expect } from 'vitest'

import { mapBaseRowToMember } from '../base.mapper.ts'
import { mapParametragesToClub } from '../parametrages.mapper.ts'
import { mapPortefeuilleRows } from '../portefeuille.mapper.ts'
import { mapHistoriqueRows } from '../historique.mapper.ts'
import { mapCotisationsRows } from '../cotisations.mapper.ts'
import { mapDetailsCotisationsRows } from '../detailsCotisations.mapper.ts'
import { toNumOrNull } from '@evolve/utils'

import type {
  BaseRowDTO,
  ParametragesRowDTO,
  PortefeuilleRowDTO,
  HistoriqueRowDTO,
  CotisationsRowDTO,
  MembershipLookup,
} from '../../../types/sheets.ts'

// ---------------------------------------------------------------------------
// FIXTURE FIGÉE — un club, 3 membres (dont 1 sorti), un portefeuille avec une
// ligne d'agrégat, quelques transactions, des cotisations et une matrice de
// "Details cotisations" sur 3 mois.
// ---------------------------------------------------------------------------

const CLUB_ID = '11111111-1111-1111-1111-111111111111'
const SHEET_ID = 'fixture-sheet-id'
// `now` figé pour rendre déterministe le calcul late/due de detailsCotisations.
const NOW = new Date(Date.UTC(2026, 0, 1)) // 1er janvier 2026

// --- PARAMETRAGES (1 ligne de config) ---
const PARAMETRAGES_ROWS: ParametragesRowDTO[] = [
  {
    clubName: 'Évolve Capital',
    minContribution: 100,
    penaltyRate: 5,
    city: 'Paris',
    country: 'France',
  },
]

// --- Base (3 membres : 2 actifs, 1 sorti) ---
const BASE_ROWS: BaseRowDTO[] = [
  {
    fullName: 'AFOUDAH Ruben',
    email: 'ruben@example.com',
    joinedAt: '01/06/2018',
    leftAt: null,
    status: 'Membre actif',
    phone: '0600000001',
    address: '1 rue A',
    leftWithAmount: null,
  },
  {
    fullName: 'DIALLO Mamadou',
    email: 'mamadou@example.com',
    joinedAt: '15/03/2019',
    leftAt: null,
    status: 'Membre actif',
    phone: null,
    address: null,
    leftWithAmount: null,
  },
  {
    fullName: 'KONÉ Awa',
    email: 'awa@example.com',
    joinedAt: '01/01/2020',
    leftAt: '31/12/2023',
    status: 'Membre sorti',
    phone: null,
    address: null,
    leftWithAmount: 1500,
  },
]

// --- Memberships rechargés (équivalent du loadMembershipLookups en DB) ---
const MEMBERSHIPS: MembershipLookup[] = [
  { id: 'm-1', user_id: 'u-1', full_name: 'AFOUDAH Ruben' },
  { id: 'm-2', user_id: 'u-2', full_name: 'DIALLO Mamadou' },
  { id: 'm-3', user_id: 'u-3', full_name: 'KONÉ Awa' },
]

// --- Portefeuille : 5 positions réelles + 1 ligne d'agrégat (symbole vide) ---
function pos(name: string, symbol: string, quantity: number | null): PortefeuilleRowDTO {
  return {
    name,
    symbol,
    category: 'Action',
    quantity,
    currency: 'EUR',
    marketPriceEur: 100,
    marketValue: 1000,
    allocationPct: 10,
    pump: 90,
    bookValue: 900,
    pe: 15,
    eps: 6,
    gainLossPct: 11,
    gainLossEur: 100,
    sector: 'Tech',
    stopLossPct: -10,
    takeProfitPct: 20,
    perfCible: 15,
    perfCalibree: 12,
    stopLossValue: 81,
    takeProfitValue: 120,
    currencyRef: 'EUR',
    typologie: 'Croissance',
  }
}
const PORTEFEUILLE_ROWS: PortefeuilleRowDTO[] = [
  pos('Apple', 'AAPL', 10),
  pos('Microsoft', 'MSFT', 5),
  pos('LVMH', 'MC.PA', 2),
  pos('Total', 'TTE.PA', 8),
  pos('Air Liquide', 'AI.PA', 3),
  // Ligne d'agrégat : symbole vide → doit aller dans aggregateRows, pas positions.
  { ...pos('Total portefeuille', '', null), name: 'TOTAL' },
]

// --- HISTORIQUE : un de chaque type connu + un type inconnu ---
function tx(type: string, symbol: string | null): HistoriqueRowDTO {
  return {
    type,
    symbol,
    name: symbol,
    quantity: 1,
    price: 100,
    total: 100,
    transactionDate: '01/06/2018',
    notes: null,
  }
}
const HISTORIQUE_ROWS: HistoriqueRowDTO[] = [
  tx('Achat', 'AAPL'),
  tx('Vente', 'AAPL'),
  tx('Dividende', 'AAPL'),
  tx('Coupon', 'OAT'),
  tx('Truc bizarre', 'XXX'), // type inconnu → 'other'
]

// --- COTISATIONS : 2 membres connus + 1 nom inconnu ---
const COTISATIONS_ROWS: CotisationsRowDTO[] = [
  {
    fullName: 'AFOUDAH Ruben',
    monthsCount: 90,
    detentionPct: 33.3,
    penalties: 0,
    totalContributed: 9000,
    netMarketValue: 12000,
    status: 'À jour',
    amountDue: 0,
  },
  {
    fullName: 'DIALLO Mamadou',
    monthsCount: 80,
    detentionPct: 30,
    penalties: 50,
    totalContributed: 8000,
    netMarketValue: 9500,
    status: 'retard',
    amountDue: 100,
  },
  {
    fullName: 'INCONNU Personne', // aucun membership → unmatched
    monthsCount: 1,
    detentionPct: 0,
    penalties: 0,
    totalContributed: 0,
    netMarketValue: null,
    status: '',
    amountDue: 0,
  },
]

// --- Details cotisations : matrice BRUTE string[][] (le mapper la parse lui-même) ---
// rows[0] = en-têtes ; col 0 = "Periode", col 1 = "100" (ignorée), cols 2..n = noms.
const DETAILS_RAW: string[][] = [
  ['Periode', '100', 'AFOUDAH Ruben', 'DIALLO Mamadou'],
  ['juin 2018', '100', '100', '100'], // passé, payé
  ['mai 2018', '100', '', '50'], // passé, Afoudah vide → late, Diallo payé
  ['décembre 2025', '100', '100', ''], // passé, Diallo vide → late
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pipeline mappers — fixture figée (intégration)', () => {
  // 1. IDEMPOTENCE — chaque mapper appelé 2x sur la même entrée renvoie un résultat
  //    profondément égal (aucun état mutable partagé, aucune dépendance au temps
  //    hormis `now` qui est figé).
  it('idempotence : chaque mapper est déterministe sur la fixture', () => {
    expect(mapParametragesToClub(PARAMETRAGES_ROWS, SHEET_ID)).toEqual(
      mapParametragesToClub(PARAMETRAGES_ROWS, SHEET_ID)
    )
    expect(mapBaseRowToMember(BASE_ROWS[0]!, CLUB_ID)).toEqual(
      mapBaseRowToMember(BASE_ROWS[0]!, CLUB_ID)
    )
    expect(mapPortefeuilleRows(PORTEFEUILLE_ROWS, CLUB_ID)).toEqual(
      mapPortefeuilleRows(PORTEFEUILLE_ROWS, CLUB_ID)
    )
    expect(mapHistoriqueRows(HISTORIQUE_ROWS, CLUB_ID)).toEqual(
      mapHistoriqueRows(HISTORIQUE_ROWS, CLUB_ID)
    )
    expect(mapCotisationsRows(COTISATIONS_ROWS, CLUB_ID, MEMBERSHIPS)).toEqual(
      mapCotisationsRows(COTISATIONS_ROWS, CLUB_ID, MEMBERSHIPS)
    )
    expect(mapDetailsCotisationsRows(DETAILS_RAW, CLUB_ID, MEMBERSHIPS, NOW)).toEqual(
      mapDetailsCotisationsRows(DETAILS_RAW, CLUB_ID, MEMBERSHIPS, NOW)
    )
  })

  // 2. MEMBRE SORTI — la ligne Base au statut "Membre sorti" produit un membership
  //    status === 'left' (et conserve leave_at / leave_with_amount).
  it('Membre sorti → membership.status === "left"', () => {
    const sorti = BASE_ROWS.find((r) => r.status === 'Membre sorti')!
    const { membership } = mapBaseRowToMember(sorti, CLUB_ID)
    expect(membership.status).toBe('left')
    expect(membership.leave_at).toBe('2023-12-31')
    expect(membership.leave_with_amount).toBe(1500)

    // Contrôle de non-régression : un membre actif reste 'active'.
    const actif = BASE_ROWS.find((r) => r.status === 'Membre actif')!
    expect(mapBaseRowToMember(actif, CLUB_ID).membership.status).toBe('active')
  })

  // 3. LIGNES D'AGRÉGAT PORTEFEUILLE — la ligne au symbole vide est isolée dans
  //    aggregateRows et n'apparaît jamais dans positions.
  it('Portefeuille : la ligne au symbole vide → aggregateRows (pas positions)', () => {
    const { positions, aggregateRows } = mapPortefeuilleRows(PORTEFEUILLE_ROWS, CLUB_ID)
    expect(positions).toHaveLength(5) // 6 lignes - 1 agrégat
    expect(aggregateRows).toHaveLength(1)
    expect(aggregateRows[0]!.name).toBe('TOTAL')
    // Aucune position ne doit avoir un symbole vide.
    expect(positions.every((p) => p.symbol.trim() !== '')).toBe(true)
    expect(positions.map((p) => p.symbol)).toEqual(['AAPL', 'MSFT', 'MC.PA', 'TTE.PA', 'AI.PA'])
  })

  // 4. PÉRIODE DETAILS PARSÉE — "juin 2018" → year 2018, month 6.
  it('Details : "juin 2018" → year 2018, month 6', () => {
    const { months } = mapDetailsCotisationsRows(DETAILS_RAW, CLUB_ID, MEMBERSHIPS, NOW)
    const juin = months.filter((m) => m.year === 2018 && m.month === 6)
    // 2 membres résolus (Afoudah + Diallo) → 2 months pour juin 2018.
    expect(juin).toHaveLength(2)
    expect(juin.every((m) => m.year === 2018 && m.month === 6)).toBe(true)
    // juin 2018 : les deux ont versé 100 → status 'paid'.
    expect(juin.every((m) => m.status === 'paid' && m.amount === 100)).toBe(true)
  })

  // 5. NaN GÉRÉ — une valeur numérique brute non parsable produit null via le
  //    parser numérique partagé (toNumOrNull), jamais NaN. C'est le contrat sur
  //    lequel reposent tous les *RowDTO numériques.
  it('NaN géré : une valeur non parsable → null (jamais NaN)', () => {
    expect(toNumOrNull('pas un nombre')).toBeNull()
    expect(toNumOrNull('')).toBeNull()
    expect(toNumOrNull('  ')).toBeNull()
    // Conséquence dans un mapper : une position dont quantity vient d'une valeur
    // non parsable porte quantity === null (et surtout pas NaN).
    const bad = pos('Bad', 'BAD', toNumOrNull('???'))
    const { positions } = mapPortefeuilleRows([bad], CLUB_ID)
    expect(positions[0]!.quantity).toBeNull()
    expect(Number.isNaN(positions[0]!.quantity as unknown as number)).toBe(false)
  })

  // 6. TYPE HISTORIQUE — "Achat" → 'buy', "Dividende" → 'dividend', inconnu → 'other'.
  it('Historique : mapping des types FR → enum métier', () => {
    const txs = mapHistoriqueRows(HISTORIQUE_ROWS, CLUB_ID)
    expect(txs.map((t) => t.type)).toEqual(['buy', 'sell', 'dividend', 'coupon', 'other'])
  })

  // 7. COTISATIONS MATCHING — les noms connus matchent un membership (avec son id) ;
  //    le nom inconnu atterrit dans unmatched[] et ne produit pas de contribution.
  it('Cotisations : matching par nom + unmatched pour les inconnus', () => {
    const { contributions, unmatched, unknownStatuses } = mapCotisationsRows(
      COTISATIONS_ROWS,
      CLUB_ID,
      MEMBERSHIPS
    )
    expect(contributions).toHaveLength(2) // Afoudah + Diallo
    const afoudah = contributions.find((c) => c.membership_id === 'm-1')!
    expect(afoudah.status).toBe('ok') // "À jour" → 'ok'
    const diallo = contributions.find((c) => c.membership_id === 'm-2')!
    expect(diallo.status).toBe('late') // "retard" → 'late'

    expect(unmatched).toEqual(['INCONNU Personne'])
    // Aucun statut non reconnu dans la fixture (À jour / retard / vide sont tous gérés).
    expect(unknownStatuses).toEqual([])
  })
})
