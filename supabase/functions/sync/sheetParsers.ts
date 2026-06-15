// Parsers de bas niveau : matrice brute string[][] (issue de readSheet) → *RowDTO[].
// Le mapping colonne → champ suit DATA_MODEL §4. La ligne d'en-tête (index 0) est
// toujours sautée. Les numériques passent par toNumOrNull (gère le format FR).
// Les mappers métier (packages/data) consomment ensuite ces DTO — ces parsers ne
// font AUCUNE logique métier, juste la projection colonne → champ.

import { toNumOrNull, stripAccents } from '@evolve/utils'
import type {
  BaseRowDTO,
  ParametragesRowDTO,
  PortefeuilleRowDTO,
  HistoriqueRowDTO,
  CotisationsRowDTO,
  ReportingRowDTO,
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
  // Normalisation ROBUSTE des libellés : trim + minuscule + accents retirés.
  // Les libellés de la feuille peuvent varier en casse/accents (ex. « Pénalité »
  // vs « penalite ») : on indexe sur la forme normalisée pour matcher de façon stable.
  const norm = (s: string): string => stripAccents(s.trim().toLowerCase())
  const kv = new Map<string, string>()
  for (const row of rows.slice(1)) {
    const key = norm(cell(row, 0))
    if (key === '') continue
    kv.set(key, cell(row, 1))
  }
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const found = kv.get(norm(k))
      if (found != null && found !== '') return found
    }
    return ''
  }
  const clubName = get('nom du club', 'nom', 'club')
  if (clubName === '') {
    throw new Error('PARAMETRAGES : "Nom du club" introuvable.')
  }
  // broker_account_ref est TEXT : on garde la string brute (toNumOrNull la dénaturerait).
  const brokerAccountRef =
    get(
      'identifiant du club chez le courtier',
      'identifiant courtier',
      'identifiant du compte courtier',
      'compte courtier'
    ) || null
  return [
    {
      clubName,
      minContribution: toNumOrNull(get('cotisation min', 'cotisation minimale', 'cotisation')) ?? 0,
      penaltyRate: toNumOrNull(get('penalite', 'pénalité', 'penalty')),
      city: get('ville') || null,
      country: get('pays') || null,
      brokerAccountRef,
      annualInvestmentCap: toNumOrNull(
        get(
          'limite de cotisation annuelle',
          'plafond annuel',
          'plafond de cotisation annuelle',
          'limite annuelle'
        )
      ),
      brokerName: get('nom du courtier', 'courtier') || null,
      // Dirigeants : noms BRUTS (le matching vers users.full_name se fait côté sync, normalisé).
      // Les libellés source varient (« Président(e) », « President », « Trésorier(e) »…) :
      // le `get` ci-dessus matche déjà sur la forme normalisée (trim + minuscule + sans accent).
      // NB : le Secrétaire n'est PAS extrait (pas de valeur 'secretary' dans l'enum member_role).
      presidentName: get('president(e)', 'president', 'presidente', 'presidence') || null,
      treasurerName: get('tresorier(e)', 'tresorier', 'tresoriere', 'tresorerie') || null,
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

/** Libellé normalisé (trim + minuscule + sans accent) de la ligne « ESPECES » (liquidité). */
const ESPECES_LABEL = 'especes'

/** Projette une ligne `string[]` en PortefeuilleRowDTO selon le mapping colonnes standard (A..W). */
function portefeuilleRowFromCols(row: string[]): PortefeuilleRowDTO {
  return {
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
  }
}

/**
 * Portefeuille → PortefeuilleRowDTO[] (colonnes A..W, DATA_MODEL §4.3).
 *
 * CAS SPÉCIAL « ESPECES » (RT-08) : la liquidité du club est une ligne d'agrégat dont la valeur
 * est décalée en col B (« Symboles ») au lieu de col G : `["ESPECES","159,08€","",...]`. Sans
 * traitement dédié elle serait classée comme une position mal formée (symbol = "159,08€",
 * marketValue null) → invisible. On la reconnaît par son LABEL en col A (normalisé : trim +
 * minuscule + sans accent, donc « ESPECES » == « Espèces »), puis on la projette en agrégat :
 * symbol forcé vide (→ aggregateRows côté mapper) + valeur LUE DYNAMIQUEMENT en col B (jamais
 * de montant en dur — le 159,08€ des snapshots est post-effondrement, cf.
 * docs/audits/sync-incident-2026-06-14/). La valeur peut être positive ou négative.
 */
export function parsePortefeuille(rows: string[][]): PortefeuilleRowDTO[] {
  return dataRows(rows).map((row) => {
    const label = stripAccents(cell(row, 0).toLowerCase())
    if (label === ESPECES_LABEL) {
      // Liquidité : valeur en col B (et non col G). On garde le libellé brut de col A, on force
      // le symbole vide (→ agrégat), et on projette la valeur de col B dans marketValue.
      return {
        ...portefeuilleRowFromCols(row),
        symbol: '', // agrégat (pas une position) — reconnu par le mapper
        marketValue: toNumOrNull(cell(row, 1)), // col B : valeur de la liquidité (signée)
      }
    }
    return portefeuilleRowFromCols(row)
  })
}

/**
 * HISTORIQUE → HistoriqueRowDTO[].
 * Layout RÉEL de la matrice (relevé dans sheet_snapshots.raw_data) — la colonne 0
 * est un n° de ligne, PAS la date :
 *   0 = n° de ligne (ignoré)   1 = TYPE          2 = QUANTITE       3 = TITRES (nom)
 *   4 = TICKER (symbole)       5 = TYPOLOGIE     6 = PRIX D'ACHAT   7 = COUT D'ACHAT (total)
 *   8 = Date                   9 = JUSTIFICATIFS (notes)
 * Les tableaux « courts » (achats récents) peuvent omettre les colonnes 8/9 → date/notes null,
 * la transaction tombe alors en quarantaine douce (transaction_date NOT NULL côté DB).
 * Montants au format FR avec préfixe/suffixe € et signe négatif (ventes) : toNumOrNull nettoie.
 */
export function parseHistorique(rows: string[][]): HistoriqueRowDTO[] {
  return dataRows(rows).map((row) => ({
    type: cell(row, 1), // TYPE (Achat/Vente/…)
    quantity: toNumOrNull(cell(row, 2)), // QUANTITE (négative sur une vente)
    name: cellOrNull(row, 3), // TITRES
    symbol: cellOrNull(row, 4), // TICKER
    price: toNumOrNull(cell(row, 6)), // PRIX D'ACHAT (€…)
    total: toNumOrNull(cell(row, 7)), // COUT D'ACHAT (€…, signé)
    transactionDate: cellOrNull(row, 8), // Date (d/m/yyyy, parfois absente)
    notes: cellOrNull(row, 9), // JUSTIFICATIFS
  }))
}

/**
 * COTISATIONS → CotisationsRowDTO[] (synthèse par membre).
 * Layout RÉEL de la matrice (relevé dans sheet_snapshots.raw_data) :
 *   0 = nom                 1 = Nb de mois cotisés (souvent #ERROR! → null)
 *   2 = Pourcentage de détention (ex. "8,99%")   3 = pénalités dues
 *   4 = Total Cotisé (ex. "28 000,00€")           5 = Valeur Boursière nette
 *   6 = Nb normal de cotisations (numérique — N'EST PAS le statut)
 *   7 = Statut ("Situation régulière"/"irrégulière", souvent #ERROR! ou vide)
 *   8 = Montant dû           9 = Echéancier   10 = Gain/Perte   11 = Suffixe
 * La colonne 6 ("Nb normal") avait été confondue avec le statut : on lit bien 7/8.
 * Toute cellule sale (#ERROR!, vide, NBSP) passe par toNumOrNull → null, jamais d'exception ;
 * la ligne « TOTAUX » ne matche aucun membre et tombe en quarantaine douce côté mapper.
 */
export function parseCotisations(rows: string[][]): CotisationsRowDTO[] {
  return dataRows(rows).map((row) => ({
    fullName: cell(row, 0), // nom
    monthsCount: toNumOrNull(cell(row, 1)), // Nb de mois cotisés
    detentionPct: toNumOrNull(cell(row, 2)), // Pourcentage de détention
    penalties: toNumOrNull(cell(row, 3)), // pénalités dues
    totalContributed: toNumOrNull(cell(row, 4)), // Total Cotisé
    netMarketValue: toNumOrNull(cell(row, 5)), // Valeur Boursière nette
    status: cellOrNull(row, 7), // Statut (≠ col 6 "Nb normal")
    amountDue: toNumOrNull(cell(row, 8)), // Montant dû
  }))
}

/** Motif date jj/mm/aaaa (ou j-m-aaaa) — discrimine les lignes de données REPORTING. */
const REPORTING_DATE_PATTERN = /\d{1,2}[/-]\d{1,2}[/-]\d{4}/

/**
 * REPORTING → ReportingRowDTO[] (série quotidienne club, DSH-011).
 * Layout RÉEL : ligne 0 = titre de la matrice, ligne 1 = en-têtes, puis ~2 900+
 * lignes quotidiennes depuis 2018. Plutôt que de sauter 2 lignes « en dur »
 * (fragile si la mise en page bouge), on ne garde que les lignes dont la col A
 * contient un motif de date jj/mm/aaaa : titres/en-têtes/lignes vides sont écartés
 * ICI et ne génèrent donc JAMAIS de warnings de quarantaine côté mapper.
 * Aucune logique métier (recalculs D/E, doublons) : projection pure colonne → champ.
 */
export function parseReporting(rows: string[][]): ReportingRowDTO[] {
  return rows
    .filter((row) => REPORTING_DATE_PATTERN.test(cell(row, 0)))
    .map((row) => ({
      reportDateRaw: cellOrNull(row, 0), // A Date avec jour de semaine («dimanche, 03/05/2026»)
      portfolioValue: toNumOrNull(cell(row, 1)), // B Valorisation portefeuille
      totalContributions: toNumOrNull(cell(row, 2)), // C Cotisations cumulées
      capitalGain: toNumOrNull(cell(row, 3)), // D Plus-value (= B−C, parfois vide)
      performanceRatio: toNumOrNull(cell(row, 4)), // E Performance (ratio B/C, parfois vide)
    }))
}
