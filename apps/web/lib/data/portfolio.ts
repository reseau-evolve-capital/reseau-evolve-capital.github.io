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

export type MemberRole = Database['public']['Enums']['member_role']

export interface PortfolioData {
  clubId: string
  positions: PositionRow[]
  syncedAt: string | null
  userRole: MemberRole
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
  const { data: rows, error } = await supabase
    .from('positions')
    .select(
      'id, name, symbol, category, sector, quantity, pump, market_price_eur, market_value, book_value, allocation_pct, gain_loss_eur, gain_loss_pct, synced_at'
    )
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('market_value', { ascending: false, nullsFirst: false })

  if (error) throw error
  if (!rows || rows.length === 0) return null

  const userRole = await getMemberRole(supabase, userId, clubId)

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
    syncedAt,
    userRole,
  }
}

/** Convertit des points de % en fraction 0..1. Protège contre les NaN. */
const pctToFraction = (v: number | null): number => (v == null || !Number.isFinite(v) ? 0 : v / 100)

/** Construit le view-model enrichi + total + allocation par secteur (fractions 0..1). PUR. */
export function buildPortfolio(
  rows: PositionRow[],
  prices: Record<string, number | null>
): { positions: PortfolioPosition[]; totalValue: number; allocation: AllocationItem[] } {
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
      quantity: r.quantity,
      pru: r.pump,
      livePrice,
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

  return { positions, totalValue, allocation }
}

/** Filtre par secteur (null = tous) puis trie selon le critère et la direction. PUR. Ne mute pas l'entrée. */
export function filterAndSort(
  positions: PortfolioPosition[],
  sector: string | null,
  sort: PortfolioSort,
  dir: PortfolioDir
): PortfolioPosition[] {
  const filtered = sector
    ? positions.filter(
        (p) => (p.sector && p.sector.trim() !== '' ? p.sector : OTHER_SECTOR_LABEL) === sector
      )
    : positions

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
