// Types view-model du module Portefeuille (E-PFT).
//
// `PortfolioPosition` est le modèle PRÉSENTATIONNEL consommé par @evolve/ui :
// toutes les valeurs sont déjà calculées et normalisées (pourcentages en FRACTION 0..1,
// prêts pour formatPct). La construction depuis la DB + prix live vit côté apps/web
// (buildPortfolio), pas ici. @evolve/types ne dépend d'aucune lib runtime.

/** Une position enrichie, prête à afficher (table, card, modale). */
export interface PortfolioPosition {
  id: string
  name: string
  symbol: string
  /** "Actions" | "ETF" | … (colonne `category`). Peut être null. */
  category: string | null
  /** Secteur ("Technologie"). Null/"" → traité comme "Autres" par l'agrégation. */
  sector: string | null
  /** Typologie du titre ("Offensif" | "Défensif"). Null/"" → traité comme "Autres" par le filtre. */
  typologie: string | null
  quantity: number
  /** PRU pondéré moyen (colonne `pump`). Null si inconnu. */
  pru: number | null
  /** Cours live en €. Null si aucun provider/symbole indisponible → affiché "—". */
  livePrice: number | null
  /** Valeur retenue : live (quantity × livePrice) si dispo, sinon snapshot DB `market_value`. */
  currentValue: number
  /** Gain/Perte en € (currentValue − bookValue). */
  gainLossEur: number
  /** Gain/Perte en FRACTION 0..1 (ex 0.254 = +25,4 %). Peut être négatif. */
  gainLossPct: number
  /** Poids dans le portefeuille en FRACTION 0..1 (recalculé sur le total courant). */
  allocationPct: number
  /** true si `livePrice` a servi au calcul ; false si fallback snapshot. */
  isLive: boolean
}

/** Item d'allocation pour le donut (groupé par secteur). `percentage` en FRACTION 0..1. */
export interface AllocationItem {
  label: string
  value: number
  percentage: number
}

export type PortfolioSort = 'value' | 'name' | 'performance'
export type PortfolioDir = 'asc' | 'desc'

/** Libellé du regroupement des secteurs inconnus/vides. Partagé entre l'agrégation
 *  (buildPortfolio, apps/web) et l'affichage (AllocationDonut) pour éviter toute dérive. */
export const OTHER_SECTOR_LABEL = 'Autres'

/** Libellé du regroupement des typologies inconnues/vides (filtre par typologie).
 *  7/11 positions ont une typologie vide en source → repli « Autres ». */
export const OTHER_TYPOLOGY_LABEL = 'Autres'
