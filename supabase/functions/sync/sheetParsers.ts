// Parsers de bas niveau : matrice brute string[][] (issue de readSheet) → *RowDTO[].
// Le mapping colonne → champ suit DATA_MODEL §4. La ligne d'en-tête (index 0) est
// toujours sautée. Les numériques passent par toNumOrNull (gère le format FR).
// Les mappers métier (packages/data) consomment ensuite ces DTO — ces parsers ne
// font AUCUNE logique métier, juste la projection colonne → champ.

import { toNumOrNull } from '@evolve/utils'
import type {
  BaseRowDTO,
  ParametragesRowDTO,
  PortefeuilleRowDTO,
  HistoriqueRowDTO,
  CotisationsRowDTO,
} from '../../../packages/data/src/types/sheets.ts'

/** Cellule à l'index `i` → string trimée, ou '' si hors limites. */
function cell(row: string[], i: number): string {
  return (row[i] ?? '').trim()
}

/** Cellule → string non vide ou null. */
function cellOrNull(row: string[], i: number): string | null {
  const v = cell(row, i)
  return v === '' ? null : v
}

/** Renvoie les lignes de données (saute l'en-tête) en filtrant les lignes vides. */
function dataRows(rows: string[][]): string[][] {
  return rows.slice(1).filter((r) => r.some((c) => (c ?? '').trim() !== ''))
}

/**
 * PARAMETRAGES → ParametragesRowDTO[].
 * Convention retenue (DATA_MODEL §4.1, structure clé/valeur en colonnes A/B) :
 * A = libellé du paramètre, B = valeur. On reconstitue une unique config-row à
 * partir des lignes clé/valeur. Le mapper ne lit que rows[0].
 */
export function parseParametrages(rows: string[][]): ParametragesRowDTO[] {
  const kv = new Map<string, string>()
  for (const row of rows.slice(1)) {
    const key = cell(row, 0).toLowerCase()
    if (key === '') continue
    kv.set(key, cell(row, 1))
  }
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const found = kv.get(k)
      if (found != null && found !== '') return found
    }
    return ''
  }
  const clubName = get('nom du club', 'nom', 'club')
  if (clubName === '') {
    throw new Error('PARAMETRAGES : "Nom du club" introuvable.')
  }
  return [
    {
      clubName,
      minContribution: toNumOrNull(get('cotisation min', 'cotisation minimale', 'cotisation')) ?? 0,
      penaltyRate: toNumOrNull(get('penalite', 'pénalité', 'penalty')),
      city: get('ville') || null,
      country: get('pays') || null,
    },
  ]
}

/** Base → BaseRowDTO[] (colonnes A..J, DATA_MODEL §4.2). */
export function parseBase(rows: string[][]): BaseRowDTO[] {
  return dataRows(rows).map((row) => ({
    fullName: cell(row, 0), // A
    email: cell(row, 1), // B
    joinedAt: cellOrNull(row, 2), // C
    leftAt: cellOrNull(row, 3), // D
    status: cell(row, 4), // E
    requestedAt: cellOrNull(row, 5), // F
    filesSentAt: cellOrNull(row, 6), // G
    phone: cellOrNull(row, 7), // H
    address: cellOrNull(row, 8), // I
    leftWithAmount: toNumOrNull(cell(row, 9)), // J
  }))
}

/** Portefeuille → PortefeuilleRowDTO[] (colonnes A..W, DATA_MODEL §4.3). */
export function parsePortefeuille(rows: string[][]): PortefeuilleRowDTO[] {
  return dataRows(rows).map((row) => ({
    name: cell(row, 0), // A
    symbol: cell(row, 1), // B
    category: cellOrNull(row, 2), // C
    quantity: toNumOrNull(cell(row, 3)), // D Parts
    currency: cellOrNull(row, 4), // E Devise
    marketPriceEur: toNumOrNull(cell(row, 5)), // F Cours en €
    marketValue: toNumOrNull(cell(row, 6)), // G Valeur boursière
    allocationPct: toNumOrNull(cell(row, 7)), // H %Allocation
    pump: toNumOrNull(cell(row, 8)), // I PUMP
    bookValue: toNumOrNull(cell(row, 9)), // J Coût d'achat
    pe: toNumOrNull(cell(row, 10)), // K PE
    eps: toNumOrNull(cell(row, 11)), // L EPS
    gainLossPct: toNumOrNull(cell(row, 12)), // M Gain/Loss (%)
    gainLossEur: toNumOrNull(cell(row, 13)), // N Gain/Loss en €
    sector: cellOrNull(row, 14), // O Secteur
    stopLossPct: toNumOrNull(cell(row, 15)), // P % Stop Loss
    takeProfitPct: toNumOrNull(cell(row, 16)), // Q % Take profit
    perfCible: toNumOrNull(cell(row, 17)), // R Perf. à conserver
    perfCalibree: toNumOrNull(cell(row, 18)), // S Perf. Calibrée
    stopLossValue: toNumOrNull(cell(row, 19)), // T Stop Loss value
    takeProfitValue: toNumOrNull(cell(row, 20)), // U Take profit value
    currencyRef: cellOrNull(row, 21), // V Devise (référence)
    typologie: cellOrNull(row, 22), // W Typologie du titre
  }))
}

/**
 * HISTORIQUE → HistoriqueRowDTO[] (DATA_MODEL §4.6).
 * Colonnes par index : A Date, B Type, C Symbole, D Nom, E Quantité, F Prix, G Total, H Notes.
 */
export function parseHistorique(rows: string[][]): HistoriqueRowDTO[] {
  return dataRows(rows).map((row) => ({
    transactionDate: cellOrNull(row, 0), // A
    type: cell(row, 1), // B
    symbol: cellOrNull(row, 2), // C
    name: cellOrNull(row, 3), // D
    quantity: toNumOrNull(cell(row, 4)), // E
    price: toNumOrNull(cell(row, 5)), // F
    total: toNumOrNull(cell(row, 6)), // G
    notes: cellOrNull(row, 7), // H
  }))
}

/**
 * COTISATIONS → CotisationsRowDTO[] (synthèse par membre, DATA_MODEL §4.5).
 * Colonnes par index : A Nom, B Nb mois, C Quote-part, D Pénalités, E Total versé,
 * F Valorisation nette, G Statut, H Montant dû.
 */
export function parseCotisations(rows: string[][]): CotisationsRowDTO[] {
  return dataRows(rows).map((row) => ({
    fullName: cell(row, 0), // A
    monthsCount: toNumOrNull(cell(row, 1)), // B
    detentionPct: toNumOrNull(cell(row, 2)), // C
    penalties: toNumOrNull(cell(row, 3)), // D
    totalContributed: toNumOrNull(cell(row, 4)), // E
    netMarketValue: toNumOrNull(cell(row, 5)), // F
    status: cellOrNull(row, 6), // G
    amountDue: toNumOrNull(cell(row, 7)), // H
  }))
}
