'use client'

// MigrationVerifyTable (OPS-106) — écran utilitaire « Vérification migration ».
//
// Présentationnel PUR : aucune logique métier ni I/O, AUCUNE dépendance @evolve/data
// (règle CLAUDE.md : packages/ui ne dépend jamais de packages/data). Reçoit des agrégats
// DÉJÀ calculés par l'app (solde / counts / delta / ok) et se contente de les rendre et de
// formater les montants en interne via @evolve/utils (modèle NetworkClubsTable / MembersList).
//
// But fonctionnel (cahier §6.2) : comparer pour chaque club les sources « legacy » vs la
// nouvelle table `operations`, sur 3 métriques. Un delta 0 → ✓ (cohérent) ; un delta non-nul
// → ✗ signalé avec le token dataviz `data-negative` (JAMAIS le rouge brand #E93E3A — règle
// CLAUDE.md). Le trésorier voit son club ; le network admin voit les clubs du réseau.
//
// Colonnes par métrique : Métrique · Legacy · Operations · Delta · Statut (✓/✗).
// La métrique « Solde espèces » est monétaire (formatEUR) ; les deux autres sont des compteurs.
//
// États : empty (club sans aucune donnée des deux côtés) et error (chargement KO) explicites —
// jamais de NaN/undefined à l'écran (fallback « — »). A11y : table sémantique, statut exposé
// en texte à l'AT (la couleur n'est jamais le seul signal), focus glow sur l'éventuel récapitulatif.
//
// Réf : NetworkClubsTable (table présentationnelle la plus proche), Badge (tokens dataviz),
//       CLAUDE.md (zéro hex, formatage @evolve/utils, jamais de NaN, data-negative ≠ rouge brand).

import * as React from 'react'
import { formatEUR } from '@evolve/utils'

import { Badge } from '../../atoms/Badge'
import { Icon } from '../../atoms/Icon'
import { EmptyState } from '../../molecules/EmptyState'
import { cn } from '../../lib/cn'

/** Type de métrique : `cash` est monétaire (formatEUR), `count` est un entier. */
export type MigrationMetricKind = 'cash' | 'count'

/** Une ligne de comparaison legacy vs operations pour UNE métrique d'UN club. */
export interface MigrationVerifyRow {
  /** Clé stable de la métrique (réutilisée pour la clé React). */
  key: string
  /** Libellé de la métrique (déjà traduit côté app). */
  metric: string
  /** Nature de la valeur (formatage). */
  kind: MigrationMetricKind
  /** Valeur côté legacy (portfolio_aggregates / contribution_months / transactions). */
  legacy: number
  /** Valeur côté nouvelle table `operations`. */
  operations: number
  /** Écart `operations - legacy` (pré-calculé par l'app). 0 = cohérent. */
  delta: number
  /** true si delta vaut 0 (cohérent). Pré-calculé pour découpler l'UI de la tolérance. */
  ok: boolean
}

/** Données de vérification d'un club : son identité + ses 3 lignes de métrique. */
export interface ClubVerifyData {
  clubId: string
  clubName: string
  rows: MigrationVerifyRow[]
}

/** En-têtes de colonnes (défauts FR). */
export interface MigrationVerifyColumnLabels {
  metric: string
  legacy: string
  operations: string
  delta: string
  status: string
}

const DEFAULT_COLUMN_LABELS: MigrationVerifyColumnLabels = {
  metric: 'Métrique',
  legacy: 'Legacy',
  operations: 'Opérations',
  delta: 'Delta',
  status: 'Statut',
}

/** Toutes les chaînes user-facing/a11y. Défauts FR byte-exacts. */
export interface MigrationVerifyTableLabels {
  columns?: Partial<MigrationVerifyColumnLabels>
  /** Statut « cohérent » (delta 0). */
  okLabel?: string
  /** Statut « écart détecté » (delta ≠ 0). */
  mismatchLabel?: string
  /** Bandeau résumé d'un club « tout cohérent ». */
  clubOkSummary?: string
  /** Bandeau résumé d'un club « N écart(s) détecté(s) » (param count). */
  clubMismatchSummary?: (count: number) => string
  /** Titre de l'état vide (club sans aucune donnée). */
  emptyTitle?: string
  /** Description de l'état vide. */
  emptyDescription?: string
  /** Titre de l'état d'erreur. */
  errorTitle?: string
  /** Description de l'état d'erreur. */
  errorDescription?: string
}

const DEFAULT_OK_LABEL = 'Cohérent'
const DEFAULT_MISMATCH_LABEL = 'Écart détecté'
const DEFAULT_CLUB_OK_SUMMARY = 'Toutes les métriques sont cohérentes.'
const defaultClubMismatchSummary = (count: number) =>
  count === 1 ? '1 écart détecté à investiguer.' : `${count} écarts détectés à investiguer.`
const DEFAULT_EMPTY_TITLE = 'Aucune donnée à comparer'
const DEFAULT_EMPTY_DESCRIPTION =
  "Ce club n'a ni données legacy ni opérations migrées pour le moment."
const DEFAULT_ERROR_TITLE = 'Vérification indisponible'
const DEFAULT_ERROR_DESCRIPTION =
  'Impossible de charger les données de comparaison. Réessaie plus tard.'

/** Nombre d'écarts (delta ≠ 0) parmi les lignes d'un club. Pur & exporté pour test. */
export function countMismatches(rows: MigrationVerifyRow[]): number {
  return rows.reduce((n, r) => (r.ok ? n : n + 1), 0)
}

/** Formate une valeur de métrique selon sa nature (monétaire vs compteur). Jamais de NaN. */
function formatMetricValue(value: number, kind: MigrationMetricKind): string {
  if (!Number.isFinite(value)) return '—'
  return kind === 'cash' ? formatEUR(value) : String(value)
}

/** Formate le delta avec signe explicite pour un compteur, formatEUR pour un montant. */
function formatDelta(delta: number, kind: MigrationMetricKind): string {
  if (!Number.isFinite(delta)) return '—'
  if (kind === 'cash') return formatEUR(delta)
  // Compteur : signe explicite (+3 / -2) pour orienter l'investigation.
  return delta > 0 ? `+${delta}` : String(delta)
}

const TH_CLASS = 'text-left text-[12px] font-semibold text-text-ter py-2 px-3 first:pl-0'
const TD_CLASS = 'py-3 px-3 first:pl-0 align-middle text-[14px] text-text'
const numClass = "text-right [font-feature-settings:'tnum']"

/** Tableau de comparaison d'UN club (3 lignes de métrique). Présentationnel. */
function ClubTable({
  data,
  columnLabels,
  okLabel,
  mismatchLabel,
}: {
  data: ClubVerifyData
  columnLabels: MigrationVerifyColumnLabels
  okLabel: string
  mismatchLabel: string
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className="w-full border-collapse"
        aria-label={`${data.clubName} — ${columnLabels.metric}`}
      >
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={TH_CLASS}>
              {columnLabels.metric}
            </th>
            <th scope="col" className={cn(TH_CLASS, 'text-right')}>
              {columnLabels.legacy}
            </th>
            <th scope="col" className={cn(TH_CLASS, 'text-right')}>
              {columnLabels.operations}
            </th>
            <th scope="col" className={cn(TH_CLASS, 'text-right')}>
              {columnLabels.delta}
            </th>
            <th scope="col" className={TH_CLASS}>
              {columnLabels.status}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr
              key={row.key}
              data-testid="migration-verify-row"
              data-ok={row.ok ? 'true' : 'false'}
              className="border-b border-border align-middle"
            >
              <td className={cn(TD_CLASS, 'font-medium')}>{row.metric}</td>
              <td className={cn(TD_CLASS, numClass, 'text-text-sec')}>
                {formatMetricValue(row.legacy, row.kind)}
              </td>
              <td className={cn(TD_CLASS, numClass, 'text-text-sec')}>
                {formatMetricValue(row.operations, row.kind)}
              </td>
              {/* Delta : non-nul → token data-negative (JAMAIS le rouge brand). */}
              <td
                className={cn(
                  TD_CLASS,
                  numClass,
                  'font-semibold',
                  row.ok ? 'text-text' : 'text-data-negative'
                )}
              >
                {formatDelta(row.delta, row.kind)}
              </td>
              {/* Statut : badge + libellé texte (la couleur n'est jamais le seul signal). */}
              <td className={TD_CLASS}>
                {row.ok ? (
                  <Badge variant="success">
                    <Icon name="Check" size={16} aria-hidden="true" className="mr-1" />
                    {okLabel}
                  </Badge>
                ) : (
                  <Badge variant="error">
                    <Icon name="X" size={16} aria-hidden="true" className="mr-1" />
                    {mismatchLabel}
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface MigrationVerifyTableProps {
  /** Un bloc de comparaison par club (1 pour le trésorier, N pour le network admin). */
  clubs: ClubVerifyData[]
  /** true → état d'erreur explicite (chargement KO côté serveur). */
  isError?: boolean
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: MigrationVerifyTableLabels
}

/**
 * Écran « Vérification migration » (OPS-106). Rend un tableau de comparaison par club, avec un
 * bandeau récapitulatif (tout cohérent / N écarts). États error + empty explicites.
 * Présentationnel pur : l'app calcule les deltas et `ok` ; ce composant ne fait que rendre.
 */
export function MigrationVerifyTable({ clubs, isError, labels }: MigrationVerifyTableProps) {
  const columnLabels = { ...DEFAULT_COLUMN_LABELS, ...labels?.columns }
  const okLabel = labels?.okLabel ?? DEFAULT_OK_LABEL
  const mismatchLabel = labels?.mismatchLabel ?? DEFAULT_MISMATCH_LABEL
  const clubOkSummary = labels?.clubOkSummary ?? DEFAULT_CLUB_OK_SUMMARY
  const clubMismatchSummary = labels?.clubMismatchSummary ?? defaultClubMismatchSummary

  if (isError) {
    return (
      <EmptyState
        icon="TriangleAlert"
        title={labels?.errorTitle ?? DEFAULT_ERROR_TITLE}
        description={labels?.errorDescription ?? DEFAULT_ERROR_DESCRIPTION}
      />
    )
  }

  if (clubs.length === 0) {
    return (
      <EmptyState
        icon="ArrowLeftRight"
        title={labels?.emptyTitle ?? DEFAULT_EMPTY_TITLE}
        description={labels?.emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {clubs.map((club) => {
        const mismatches = countMismatches(club.rows)
        const allOk = mismatches === 0
        return (
          <section
            key={club.clubId}
            data-testid="migration-verify-club"
            aria-label={club.clubName}
            className="flex flex-col gap-3"
          >
            <header className="flex flex-col gap-1">
              <h3 className="font-display text-[16px] font-bold text-text">{club.clubName}</h3>
              <p
                className={cn(
                  'inline-flex items-center gap-1.5 text-[13px]',
                  allOk ? 'text-data-positive' : 'text-data-negative'
                )}
              >
                <Icon name={allOk ? 'CircleCheck' : 'TriangleAlert'} size={16} aria-hidden="true" />
                {allOk ? clubOkSummary : clubMismatchSummary(mismatches)}
              </p>
            </header>
            <ClubTable
              data={club}
              columnLabels={columnLabels}
              okLabel={okLabel}
              mismatchLabel={mismatchLabel}
            />
          </section>
        )
      })}
    </div>
  )
}
