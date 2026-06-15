// Dérivation du statut GLOBAL de cotisation, avec FALLBACK sur l'échéancier mensuel.
//
// Problème (bug observé en prod) : le statut global affiché sur le dashboard ET en tête de la
// page cotisations est une RECOPIE de la colonne « statut » de la feuille COTISATIONS
// (`contributions.status`). Cette colonne bugge régulièrement sur la matrice (cellule vide,
// `#ERROR!`, libellé non reconnu) → le mapper `cotisations.mapper.ts` retombe sur `pending`
// (« En attente »). Conséquence : un membre clairement EN RETARD voyait « En attente » sur son
// dashboard, en contradiction avec sa propre frise mensuelle (qui, elle, sait déduire le retard).
//
// Correctif : quand le statut feuille est `pending` (= information absente/illisible), on DÉRIVE
// le statut réel depuis l'historique mensuel (feuille « Details cotisations »), déjà fiable et
// source de `months_count`. On applique EXACTEMENT le même contexte que la frise (`deriveVariant`
// dans `contributions.ts`) pour garantir qu'un badge global et la frise ne se contredisent JAMAIS.
//
// C'est un FALLBACK, pas un override : un statut feuille EXPLICITE (`ok`/`late`/`exempt`) prime
// toujours et n'est jamais recalculé — on ne dérive qu'en l'absence d'info fiable.
//
// Réf : DATA_MODEL.md §2.6/§2.7, CLAUDE.md (jamais de statut trompeur à l'écran).

import type { Database } from '@evolve/data'

export type ContributionStatus = Database['public']['Enums']['contribution_status']
export type MonthStatus = Database['public']['Enums']['month_status']

/** Sous-ensemble d'un `contribution_months` suffisant pour dériver le statut global. */
export interface MonthForStatus {
  year: number
  month: number
  status: MonthStatus
}

/** Indice ordinal absolu d'un mois (year*12 + month-1) — même convention que `contributions.ts`. */
function toYM(year: number, month: number): number {
  return year * 12 + (month - 1)
}

/** `joined_at` (ISO `string` ou `null`) → indice ordinal du mois d'adhésion, ou `null` si absent
 *  /invalide. Partagé entre dashboard.ts et contributions.ts pour borner les mois pré-adhésion. */
export function joinedAtToYM(joinedAt: string | null): number | null {
  if (!joinedAt) return null
  const d = new Date(joinedAt)
  return Number.isNaN(d.getTime()) ? null : d.getFullYear() * 12 + d.getMonth()
}

/**
 * Statut global de cotisation, avec fallback dérivé de l'échéancier mensuel.
 *
 * Règle :
 *   - statut feuille EXPLICITE (`ok`/`late`/`exempt`) → conservé tel quel (la feuille prime) ;
 *   - statut feuille `pending` → on dérive depuis les mois, avec le MÊME contexte que la frise :
 *       • mois antérieur à l'adhésion (`< joinedAtYM`) → ignoré (sans objet) ;
 *       • mois strictement futur (`> nowYM`)           → ignoré (pas encore dû) ;
 *       • sinon : `late` ⇒ arriéré, `paid` ⇒ cotisé ;
 *     puis : au moins un arriéré ⇒ `late` ; sinon au moins un mois payé ⇒ `ok` ;
 *     sinon `pending` (aucun signal exploitable — on n'invente pas un « à jour » trompeur).
 *
 * Pure (testée sans DB). `joinedAtYM`/`nowYM` sont des indices ordinaux (cf. toYM).
 */
export function deriveContributionStatus(
  sheetStatus: ContributionStatus,
  months: MonthForStatus[],
  joinedAtYM: number | null,
  nowYM: number
): ContributionStatus {
  if (sheetStatus !== 'pending') return sheetStatus

  let hasArrear = false
  let hasPaid = false
  for (const m of months) {
    const ym = toYM(m.year, m.month)
    if (joinedAtYM != null && ym < joinedAtYM) continue // pré-adhésion : sans objet
    if (ym > nowYM) continue // futur : pas encore dû
    if (m.status === 'late') hasArrear = true
    else if (m.status === 'paid') hasPaid = true
  }

  if (hasArrear) return 'late'
  if (hasPaid) return 'ok'
  return 'pending'
}

/**
 * Montant dû d'un membre en retard, avec fallback dérivé de l'échéancier mensuel.
 *
 * Problème (RT-05) : le bandeau de retard affichait `lateAlert.title` avec `formatEUR(amountDue)`
 * sans condition. Quand la colonne « Montant dû » de la matrice est vide/illisible, `amount_due`
 * vaut 0 → bandeau « Tu as un retard de cotisation de 0,00 € » : trompeur (viole CLAUDE.md, jamais
 * de « 0,00 € » trompeur à l'écran).
 *
 * Règle (décision owner) :
 *   - `sheetAmountDue > 0` (donnée source explicite) → conservé tel quel (la donnée prime) ;
 *   - sinon → on DÉRIVE : (nb de mois `late`, post-adhésion ET ≤ mois courant) × `minContribution`.
 *     On applique EXACTEMENT les mêmes bornes que `deriveContributionStatus` pour rester cohérent
 *     avec la frise et le badge de statut.
 *
 * Le résultat peut être 0 (ex. `minContribution` indisponible/0, ou aucun mois `late` exploitable) :
 * dans ce cas le bandeau affichera la variante SANS montant (`lateAlert.titleNoAmount`), jamais
 * « 0,00 € ». Pure (testée sans DB). `joinedAtYM`/`nowYM` sont des indices ordinaux (cf. toYM).
 */
export function deriveAmountDue(
  sheetAmountDue: number,
  months: MonthForStatus[],
  joinedAtYM: number | null,
  nowYM: number,
  minContribution: number
): number {
  // La donnée source explicite prime toujours (on ne recalcule jamais un montant fourni).
  if (sheetAmountDue > 0) return sheetAmountDue

  // Sinon : compte des mois `late` exploitables (mêmes bornes que la dérivation de statut).
  let lateMonths = 0
  for (const m of months) {
    const ym = toYM(m.year, m.month)
    if (joinedAtYM != null && ym < joinedAtYM) continue // pré-adhésion : sans objet
    if (ym > nowYM) continue // futur : pas encore dû
    if (m.status === 'late') lateMonths += 1
  }

  // minContribution peut être 0/absent → produit 0 ; le garde-fou d'affichage prend le relais.
  return lateMonths * minContribution
}
