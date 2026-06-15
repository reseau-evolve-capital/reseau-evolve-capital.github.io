// Couche data du portefeuille (E-PFT). RLS isole les positions par club (auth.uid()).
// buildPortfolio et filterAndSort sont PURS (testés). Valo LIVE si prix fourni, sinon fallback
// snapshot DB market_value (décision de cadrage). gain_loss_pct / allocation_pct sont stockés en
// POINTS DE % → divisés par 100 pour formatPct (fraction 0..1).

import type { createServerClient, Database } from '@evolve/data'
import {
  type PortfolioPosition,
  type AllocationItem,
  type PortfolioSort,
  type PortfolioDir,
  OTHER_SECTOR_LABEL,
  OTHER_TYPOLOGY_LABEL,
} from '@evolve/types'

/** Client Supabase serveur tel que retourné par `createServerClient` (session + RLS). */
type ServerClient = ReturnType<typeof createServerClient>

type DbPositionRow = Database['public']['Tables']['positions']['Row']
type MembershipRow = Database['public']['Tables']['memberships']['Row']

/** Sous-ensemble de colonnes lues pour le portefeuille. */
export type PositionRow = Pick<
  DbPositionRow,
  | 'id'
  | 'name'
  | 'symbol'
  | 'category'
  | 'sector'
  | 'typologie'
  | 'quantity'
  | 'pump'
  | 'market_price_eur'
  | 'market_value'
  | 'book_value'
  | 'allocation_pct'
  | 'gain_loss_eur'
  | 'gain_loss_pct'
>

/** PositionRow enrichi de synced_at (sélectionné dans la query mais hors Pick). */
type PositionRowWithSync = PositionRow & { synced_at: string | null }

type DbAggregateRow = Database['public']['Tables']['portfolio_aggregates']['Row']

/** Ligne d'agrégat du portefeuille (« Portefeuille », « Provision », soldes…). */
export type PortfolioAggregate = Pick<
  DbAggregateRow,
  'label' | 'market_value' | 'book_value' | 'allocation_pct'
>

export type MemberRole = Database['public']['Enums']['member_role']

export interface PortfolioData {
  clubId: string
  positions: PositionRow[]
  /** Lignes d'agrégat actives (total « Portefeuille », « Provision », soldes…). */
  aggregates: PortfolioAggregate[]
  syncedAt: string | null
  userRole: MemberRole
}

/** Normalise un libellé d'agrégat pour le matching (minuscules, accents/espaces lissés). PUR. */
export function normalizeAggregateLabel(label: string): string {
  return label.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Libellé normalisé de la ligne d'agrégat « Portefeuille » (= total affiché). */
const PORTEFEUILLE_LABEL = 'portefeuille'

/** Libellé normalisé de la ligne d'agrégat « ESPECES » (= liquidité du club, RT-08). */
const ESPECES_LABEL = 'especes'

/**
 * Vrai si l'agrégat est un solde d'opérations « court terme » / « long terme » (RT-08).
 * Ces lignes (« Solde : opérations courts termes », « … longs termes ») sont des soldes
 * d'opérations perturbants pour le membre → masquées. Match tolérant (normalisé, sans accent)
 * sur la présence de « solde » + « terme(s) ».
 */
function isOperationsBalance(label: string): boolean {
  const n = normalizeAggregateLabel(label)
  return n.includes('solde') && n.includes('terme')
}

/**
 * Retourne la `market_value` de la ligne d'agrégat « Portefeuille » si présente (match par
 * label normalisé), sinon null. Sert de TOTAL affiché (col G de la matrice). PUR.
 */
export function totalFromAggregates(aggregates: PortfolioAggregate[]): number | null {
  const row = aggregates.find((a) => normalizeAggregateLabel(a.label) === PORTEFEUILLE_LABEL)
  const v = row?.market_value
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Vrai si l'agrégat est une ligne « Remboursement (en cours) » (RT-10) : on lui adjoint un
 * InfoTip explicatif côté UI. Match tolérant (normalisé, sans accent) sur « remboursement ».
 * PUR. */
export function isReimbursementAggregate(label: string): boolean {
  return normalizeAggregateLabel(label).includes('remboursement')
}

/**
 * Liquidité du club (RT-08) : `market_value` de l'agrégat « ESPECES » (match par label
 * normalisé). La valeur peut être POSITIVE ou NÉGATIVE. Retourne null si la ligne est absente
 * ou sans valeur exploitable (l'UI masque alors la section). PUR.
 */
export function liquidityFromAggregates(aggregates: PortfolioAggregate[]): number | null {
  const row = aggregates.find((a) => normalizeAggregateLabel(a.label) === ESPECES_LABEL)
  const v = row?.market_value
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Soldes affichés sous le donut (C2bis). Tout agrégat SAUF (RT-08 / RT-10) :
 *  - « Portefeuille » (déjà affiché comme total) ;
 *  - « ESPECES » (affiché dans sa propre section « Liquidité ») ;
 *  - les soldes d'opérations « courts/longs termes » (soldes perturbants, masqués) ;
 *  - les agrégats à `market_value` null (ex. « Remboursement en cours » sans montant →
 *    le « — » trompeur disparaît, RT-10).
 * Conserve l'ordre source. PUR. */
export function balanceAggregates(aggregates: PortfolioAggregate[]): PortfolioAggregate[] {
  return aggregates.filter((a) => {
    const n = normalizeAggregateLabel(a.label)
    if (n === PORTEFEUILLE_LABEL || n === ESPECES_LABEL) return false
    if (isOperationsBalance(a.label)) return false
    return typeof a.market_value === 'number' && Number.isFinite(a.market_value)
  })
}

/** Résout le rôle du membre courant dans un club (RLS filtre par auth.uid()).
 *  Fallback 'member' si aucune adhésion active trouvée. Utilisé pour construire
 *  un PortfolioData vide cohérent côté route quand le club n'a aucune position. */
export async function getMemberRole(
  supabase: ServerClient,
  userId: string,
  clubId: string
): Promise<MemberRole> {
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle<Pick<MembershipRow, 'role'>>()
  return membership?.role ?? 'member'
}

/** Charge les positions actives + rôle membre + fraîcheur du club. RLS filtre par club_id.
 *  Retourne null si aucune position active (état empty). */
export async function getPortfolioData(
  supabase: ServerClient,
  userId: string,
  clubId: string
): Promise<PortfolioData | null> {
  // Les 3 lectures sont indépendantes → parallélisées (fix latence par-navigation, ticket C).
  // Lignes d'agrégat : un échec de lecture ne doit pas casser le portefeuille (fallback
  // total = somme live). RLS filtre par club sur chaque requête.
  const [{ data: rows, error }, userRole, { data: aggRows }] = await Promise.all([
    supabase
      .from('positions')
      .select(
        'id, name, symbol, category, sector, typologie, quantity, pump, market_price_eur, market_value, book_value, allocation_pct, gain_loss_eur, gain_loss_pct, synced_at'
      )
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('market_value', { ascending: false, nullsFirst: false }),
    getMemberRole(supabase, userId, clubId),
    supabase
      .from('portfolio_aggregates')
      .select('label, market_value, book_value, allocation_pct')
      .eq('club_id', clubId)
      .eq('is_active', true),
  ])

  if (error) throw error
  if (!rows || rows.length === 0) return null

  const aggregates: PortfolioAggregate[] = (aggRows as PortfolioAggregate[] | null) ?? []

  // `synced_at` n'est pas dans le Pick PositionRow — cast unique sur le résultat de la query.
  const typedRows = rows as PositionRowWithSync[]

  // Prend le synced_at le plus récent parmi les positions du club.
  const syncedAt = typedRows.reduce<string | null>((acc, r) => {
    if (!r.synced_at) return acc
    if (!acc) return r.synced_at
    return r.synced_at > acc ? r.synced_at : acc
  }, null)

  // PositionRowWithSync est assignable à PositionRow[] — pas besoin de re-mapper champ par champ.
  const positions: PositionRow[] = typedRows

  return {
    clubId,
    positions,
    aggregates,
    syncedAt,
    userRole,
  }
}

/** Convertit des points de % en fraction 0..1. Protège contre les NaN. */
const pctToFraction = (v: number | null): number => (v == null || !Number.isFinite(v) ? 0 : v / 100)

/** Libellé par défaut du regroupement « Autres » de l'allocation par titre (RT-11). Neutre côté
 *  data ; l'appelant (PortfolioView) passe son propre libellé i18n. */
export const DEFAULT_OTHER_TITLE_LABEL = 'Autres'

/** Nombre de titres montrés individuellement avant regroupement en « Autres » (RT-11). */
const TOP_TITLES = 8

/**
 * Allocation par TITRE (RT-11) : agrège `currentValue` par `name` de position, trie desc, garde
 * les `topN` premiers et regroupe le reste sous un libellé « Autres » (paramétrable pour i18n).
 * `percentage` en FRACTION 0..1 sur `totalValue`. PUR. Jamais de NaN (total ≤ 0 → percentage 0).
 */
export function buildAllocationByTitle(
  positions: PortfolioPosition[],
  totalValue: number,
  otherLabel: string = DEFAULT_OTHER_TITLE_LABEL,
  topN: number = TOP_TITLES
): AllocationItem[] {
  // Agrège par nom (un même titre peut apparaître sur plusieurs lignes).
  const byTitle = new Map<string, number>()
  for (const p of positions) {
    const key = p.name && p.name.trim() !== '' ? p.name : otherLabel
    byTitle.set(key, (byTitle.get(key) ?? 0) + p.currentValue)
  }

  const sorted = [...byTitle.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  // Top N affichés individuellement ; le reste fusionné en « Autres » (ajouté à un éventuel
  // « Autres » déjà présent issu des titres sans nom).
  const head = sorted.slice(0, topN)
  const tail = sorted.slice(topN)
  const merged: { label: string; value: number }[] = [...head]
  if (tail.length > 0) {
    const tailSum = tail.reduce((s, e) => s + e.value, 0)
    const existing = merged.find((e) => e.label === otherLabel)
    if (existing) existing.value += tailSum
    else merged.push({ label: otherLabel, value: tailSum })
  }

  return merged.map((e) => ({
    label: e.label,
    value: e.value,
    percentage: totalValue > 0 ? e.value / totalValue : 0,
  }))
}

/**
 * Construit le view-model enrichi + total + allocation par secteur ET par titre (fractions 0..1).
 * PUR. `otherTitleLabel` permet à l'appelant de fournir le libellé « Autres » i18n du regroupement
 * par titre (RT-11) ; défaut neutre côté data.
 */
export function buildPortfolio(
  rows: PositionRow[],
  prices: Record<string, number | null>,
  otherTitleLabel: string = DEFAULT_OTHER_TITLE_LABEL
): {
  positions: PortfolioPosition[]
  totalValue: number
  allocation: AllocationItem[]
  allocationByTitle: AllocationItem[]
} {
  const enriched = rows.map((r) => {
    const liveRaw = prices[r.symbol]
    // Un prix doit être strictement positif pour être un cours valide ; 0/null/NaN → fallback snapshot.
    const livePrice = typeof liveRaw === 'number' && liveRaw > 0 ? liveRaw : null
    const bookValue = Number(r.book_value ?? 0)
    const currentValue = livePrice !== null ? r.quantity * livePrice : Number(r.market_value ?? 0)
    // si gain_loss_eur absent du snapshot, recalcul depuis market_value − book_value
    const gainLossEur =
      livePrice !== null
        ? currentValue - bookValue
        : Number(r.gain_loss_eur ?? currentValue - bookValue)
    const gainLossPct =
      livePrice !== null
        ? bookValue > 0
          ? gainLossEur / bookValue
          : 0
        : pctToFraction(r.gain_loss_pct)

    const vm: PortfolioPosition = {
      id: r.id,
      name: r.name,
      symbol: r.symbol,
      category: r.category,
      sector: r.sector,
      typologie: r.typologie,
      quantity: r.quantity,
      pru: r.pump,
      livePrice,
      // Cours matrice (snapshot) — repli d'affichage du cours quand pas de prix live.
      marketPrice: Number(r.market_price_eur) > 0 ? Number(r.market_price_eur) : null,
      currentValue,
      gainLossEur,
      gainLossPct,
      allocationPct: 0, // recalculé après totalisation
      isLive: livePrice !== null,
    }
    return vm
  })

  const totalValue = enriched.reduce((s, p) => s + p.currentValue, 0)

  const positions: PortfolioPosition[] = enriched.map((p) => ({
    ...p,
    allocationPct: totalValue > 0 ? p.currentValue / totalValue : 0,
  }))

  // Agrégation par secteur (secteur vide ou null → OTHER_SECTOR_LABEL).
  const bySector = new Map<string, number>()
  for (const p of positions) {
    const key = p.sector && p.sector.trim() !== '' ? p.sector : OTHER_SECTOR_LABEL
    bySector.set(key, (bySector.get(key) ?? 0) + p.currentValue)
  }

  const allocation: AllocationItem[] = [...bySector.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percentage: totalValue > 0 ? value / totalValue : 0,
    }))
    .sort((a, b) => b.value - a.value)

  // Agrégation par TITRE (RT-11) : top N + « Autres » (libellé i18n fourni par l'appelant).
  const allocationByTitle = buildAllocationByTitle(positions, totalValue, otherTitleLabel)

  return { positions, totalValue, allocation, allocationByTitle }
}

/** Secteur d'une position pour le filtre (vide/null → « Autres »). */
function sectorKey(p: PortfolioPosition): string {
  return p.sector && p.sector.trim() !== '' ? p.sector : OTHER_SECTOR_LABEL
}

/** Typologie d'une position pour le filtre (vide/null → « Autres »). */
function typologieKey(p: PortfolioPosition): string {
  return p.typologie && p.typologie.trim() !== '' ? p.typologie : OTHER_TYPOLOGY_LABEL
}

/** Liste dédupliquée des secteurs présents (ordre d'apparition). PUR. */
export function availableSectors(positions: PortfolioPosition[]): string[] {
  return [...new Set(positions.map(sectorKey))]
}

/** Liste dédupliquée des typologies présentes (ordre d'apparition). PUR. */
export function availableTypologies(positions: PortfolioPosition[]): string[] {
  return [...new Set(positions.map(typologieKey))]
}

/**
 * Filtre combiné secteur ∧ typologie (null = axe ignoré) puis trie selon le critère et la
 * direction. PUR. Ne mute pas l'entrée.
 */
export function filterAndSort(
  positions: PortfolioPosition[],
  sector: string | null,
  sort: PortfolioSort,
  dir: PortfolioDir,
  typologie: string | null = null
): PortfolioPosition[] {
  const filtered = positions.filter(
    (p) =>
      (sector == null || sectorKey(p) === sector) &&
      (typologie == null || typologieKey(p) === typologie)
  )

  const sign = dir === 'asc' ? 1 : -1

  return [...filtered].sort((a, b) => {
    let cmp = 0
    if (sort === 'name') {
      cmp = a.name.localeCompare(b.name, 'fr')
    } else if (sort === 'performance') {
      cmp = a.gainLossPct - b.gainLossPct
    } else {
      // 'value'
      cmp = a.currentValue - b.currentValue
    }
    return sign * cmp
  })
}
