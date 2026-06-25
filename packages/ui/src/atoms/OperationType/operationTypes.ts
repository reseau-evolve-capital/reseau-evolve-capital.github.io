import type { IconName } from '../Icon'

/**
 * Catalogue des types d'opération (module Opérations, E-OPS-2).
 *
 * Source de vérité visuelle : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §2.
 *
 * `@evolve/ui` ne dépend JAMAIS de `@evolve/data` : l'union métier est redéclarée ici
 * (elle DOIT rester alignée sur `OperationType` de `@evolve/data/operations/types.ts`).
 * Le design ne définit que 6 styles visuels (cotisation / achat / vente / dividende /
 * frais / pénalité) ; les types métier restants sont rangés sur le style « neutre »
 * (valuation, dividend_stock, member_exit, capital_call, distribution, correction).
 */
export type OperationTypeKey =
  | 'contribution'
  | 'member_exit'
  | 'buy'
  | 'sell'
  | 'dividend_cash'
  | 'dividend_stock'
  | 'fee'
  | 'penalty'
  | 'capital_call'
  | 'distribution'
  | 'valuation'
  | 'correction'

/** Famille de style visuel partagée par les chips/tags. */
export type OperationVisualKind = 'positive' | 'neutral' | 'dividend' | 'warning' | 'negative'

export interface OperationTypeMeta {
  /** Clé métier (alignée @evolve/data OperationType). */
  key: OperationTypeKey
  /** Libellé FR par défaut (le copy traduit passe en prop côté apps/web). */
  label: string
  /** Description courte FR par défaut. */
  description: string
  /** Famille de style → pilote les classes Tailwind du chip/tag. */
  kind: OperationVisualKind
  /** Icône lucide. */
  icon: IconName
  /** Signe attendu du delta cash : +1 entrée, -1 sortie, 0 sans impact cash direct. */
  cashSign: 1 | -1 | 0
}

/** Classes Tailwind (token-driven) par famille de style, pour le fond + le texte du chip. */
export const OPERATION_VISUAL_CLASSES: Record<
  OperationVisualKind,
  { chipBg: string; chipFg: string }
> = {
  positive: { chipBg: 'bg-data-positive-50', chipFg: 'text-data-positive' },
  neutral: { chipBg: 'bg-data-neutral-50', chipFg: 'text-text-sec' },
  // Dividende : le texte/icône change de couleur light↔dark via le token --data-dividend-fg
  // (accent-ink en light, brand-yellow en dark) — reproduit la classe `.op-chip-div`.
  dividend: { chipBg: 'bg-data-dividend-50', chipFg: 'text-data-dividend-fg' },
  warning: { chipBg: 'bg-data-warning-50', chipFg: 'text-data-warning' },
  negative: { chipBg: 'bg-data-negative-50', chipFg: 'text-data-negative' },
}

/**
 * Mapping complet type métier → métadonnées d'affichage.
 * Les 6 types « cœur » suivent la spec §2 ; les autres tombent sur « neutre ».
 */
export const OPERATION_TYPES: Record<OperationTypeKey, OperationTypeMeta> = {
  contribution: {
    key: 'contribution',
    label: 'Cotisation',
    description: "Versement d'un membre",
    kind: 'positive',
    icon: 'Wallet',
    cashSign: 1,
  },
  buy: {
    key: 'buy',
    label: 'Achat',
    description: "Acquisition d'un titre",
    kind: 'neutral',
    icon: 'TrendingUp',
    cashSign: -1,
  },
  sell: {
    key: 'sell',
    label: 'Vente',
    description: "Cession d'un titre",
    kind: 'neutral',
    icon: 'TrendingDown',
    cashSign: 1,
  },
  dividend_cash: {
    key: 'dividend_cash',
    label: 'Dividende',
    description: "Revenu d'un titre",
    kind: 'dividend',
    icon: 'Coins',
    cashSign: 1,
  },
  fee: {
    key: 'fee',
    label: 'Frais',
    description: 'Courtage, charges',
    kind: 'warning',
    icon: 'Receipt',
    cashSign: -1,
  },
  penalty: {
    key: 'penalty',
    label: 'Pénalité',
    description: 'Retard, sanction',
    kind: 'negative',
    icon: 'TriangleAlert',
    cashSign: -1,
  },
  // --- Types métier complémentaires (style neutre) ---
  dividend_stock: {
    key: 'dividend_stock',
    label: 'Dividende en titres',
    description: 'Revenu distribué en titres',
    kind: 'neutral',
    icon: 'Layers',
    cashSign: 0,
  },
  member_exit: {
    key: 'member_exit',
    label: 'Sortie de membre',
    description: "Remboursement d'un membre sortant",
    kind: 'neutral',
    icon: 'LogOut',
    cashSign: -1,
  },
  capital_call: {
    key: 'capital_call',
    label: 'Appel de fonds',
    description: 'Appel de capital aux membres',
    kind: 'neutral',
    icon: 'PiggyBank',
    cashSign: 1,
  },
  distribution: {
    key: 'distribution',
    label: 'Distribution',
    description: 'Versement aux membres',
    kind: 'neutral',
    icon: 'HandCoins',
    cashSign: -1,
  },
  valuation: {
    key: 'valuation',
    label: 'Valorisation',
    description: 'Réévaluation du portefeuille',
    kind: 'neutral',
    icon: 'Scale',
    cashSign: 0,
  },
  correction: {
    key: 'correction',
    label: 'Correction',
    description: 'Ajustement manuel',
    kind: 'neutral',
    icon: 'Wrench',
    cashSign: 0,
  },
}

/** Métadonnées d'un type, avec repli sûr sur « correction » (neutre) si clé inconnue. */
export function getOperationType(key: string | null | undefined): OperationTypeMeta {
  if (key && key in OPERATION_TYPES) {
    return OPERATION_TYPES[key as OperationTypeKey]
  }
  return OPERATION_TYPES.correction
}

/** Les 6 types proposés par défaut dans l'assistant de saisie (ordre de la spec §4). */
export const OPERATION_TYPE_ORDER: readonly OperationTypeKey[] = [
  'contribution',
  'buy',
  'sell',
  'dividend_cash',
  'fee',
  'penalty',
]
