'use client'

// NetworkClubsTable (NET-005) — tableau des clubs du RÉSEAU (vue membre réseau).
//
// Présentationnel : aucune logique métier ni I/O. Reçoit des lignes BRUTES (valo numérique,
// dates ISO, compteurs) et formate EN INTERNE via @evolve/utils (formatEUR / formatRelativeTime)
// — modèle MembersList (table financière la plus proche, qui formate aussi en interne), au
// contraire d'InvitationsTable qui reçoit des strings pré-formatées. Justif : le statut de sync
// se dérive de `lastSyncedAt` (relatif + pastille) et la parité fr/en du temps relatif passe par
// une `locale` injectée — formater en interne garde cette logique testable et hors de l'app.
//
// Colonnes : Club (nom + slug mono + initiale) · Membres actifs · Valo agrégée (€, « — » si null)
//            · Dernière sync (temps relatif + pastille statut) · Matrice (badge) · Actions (Voir/Sync).
//
// STATUTS SYNC via tokens dataviz UNIQUEMENT (jamais le rouge brand) :
//   ok      → data-positive (vert)   : sync récente
//   stale   → data-warning  (ambre)  : sync trop ancienne (> staleAfterMs)
//   never   → data-neutral  (gris)   : jamais synchronisé (lastSyncedAt null)
// Une ligne « club neuf » = matrice « non connectée », sync « jamais », valo « — ».
//
// Réf : MembersList / InvitationsTable (table headless présentationnelle), KPICard (parité tokens),
//       CLAUDE.md (a11y AA, zéro hex, formatage @evolve/utils, jamais de NaN/undefined).

import * as React from 'react'
import { formatEUR, formatRelativeTime } from '@evolve/utils'

import { Badge } from '../../atoms/Badge'
import { Icon } from '../../atoms/Icon'
import { EmptyState } from '../../molecules/EmptyState'
import { cn } from '../../lib/cn'

/** Statut de sync dérivé (pastille). `never` = jamais synchronisé (lastSyncedAt null). */
export type ClubSyncStatus = 'ok' | 'stale' | 'never'

/** Ligne club consommée par la table — valeurs BRUTES (formatage interne). */
export interface NetworkClubRow {
  id: string
  name: string
  slug: string
  /** Nombre de membres actifs (entier ≥ 0). */
  activeMembersCount: number
  /** Valorisation agrégée en euros, ou `null` si jamais synchronisé → affiché « — ». */
  aggregatedValuation: number | null
  /** Date ISO du dernier sync réussi, ou `null` si jamais synchronisé. */
  lastSyncedAt: string | null
  /** Matrice Sheets branchée (clubs.sheet_id non vide). */
  matrixConnected: boolean
}

/** En-têtes de colonnes (défauts FR). */
export interface NetworkClubsTableColumnLabels {
  club: string
  members: string
  valuation: string
  lastSync: string
  matrix: string
  actions: string
}

const DEFAULT_COLUMN_LABELS: NetworkClubsTableColumnLabels = {
  club: 'Club',
  members: 'Membres actifs',
  valuation: 'Valo agrégée',
  lastSync: 'Dernière sync',
  matrix: 'Matrice',
  actions: 'Actions',
}

/** Toutes les chaînes user-facing/a11y. Défauts FR byte-exacts. */
export interface NetworkClubsTableLabels {
  columns?: Partial<NetworkClubsTableColumnLabels>
  /** aria-label du tableau. */
  tableLabel?: string
  /** Libellés des statuts de sync (pastille). */
  syncStatuses?: Partial<Record<ClubSyncStatus, string>>
  /** Texte affiché quand le club n'a jamais été synchronisé (colonne Dernière sync). */
  neverSynced?: string
  /** Libellés du badge matrice. */
  matrix?: { connected?: string; disconnected?: string }
  /** Texte « — » de valo absente (aria-label / title du tiret muet). */
  valuationNone?: string
  /** aria-label « Voir le club {nom} ». */
  viewLabel?: (name: string) => string
  /** aria-label « Synchroniser le club {nom} ». */
  syncLabel?: (name: string) => string
  /** Titre de l'état vide. */
  emptyTitle?: string
  /** Description de l'état vide. */
  emptyDescription?: string
  /** Locale BCP-47 du temps relatif (« il y a 1 h » vs « 1 h ago »). Défaut 'fr-FR'. */
  locale?: string
}

const DEFAULT_TABLE_LABEL = 'Clubs du réseau'
const DEFAULT_SYNC_STATUS_LABEL: Record<ClubSyncStatus, string> = {
  ok: 'À jour',
  stale: 'En retard',
  never: 'Jamais',
}
const DEFAULT_NEVER_SYNCED = 'Jamais synchronisé'
const DEFAULT_MATRIX_CONNECTED = 'Connectée'
const DEFAULT_MATRIX_DISCONNECTED = 'Non connectée'
const DEFAULT_VALUATION_NONE = 'Valorisation indisponible'
const DEFAULT_EMPTY_TITLE = 'Aucun club'
const DEFAULT_EMPTY_DESCRIPTION = 'Ajoute un premier club pour démarrer le réseau.'
const defaultViewLabel = (name: string) => `Voir le club ${name}`
const defaultSyncLabel = (name: string) => `Synchroniser le club ${name}`

/** Seuil par défaut au-delà duquel un sync est « en retard » (24 h ; le cron tourne /2h). */
export const DEFAULT_STALE_AFTER_MS = 24 * 60 * 60 * 1000

/**
 * Dérive le statut de sync d'un club depuis sa dernière date de sync.
 * Pur & exporté pour test unitaire. `now`/`staleAfterMs` injectables (déterminisme).
 */
export function deriveSyncStatus(
  lastSyncedAt: string | null,
  now: Date = new Date(),
  staleAfterMs: number = DEFAULT_STALE_AFTER_MS
): ClubSyncStatus {
  if (!lastSyncedAt) return 'never'
  const d = new Date(lastSyncedAt)
  if (Number.isNaN(d.getTime())) return 'never'
  return now.getTime() - d.getTime() > staleAfterMs ? 'stale' : 'ok'
}

/** Classes de la pastille de statut (dataviz tokens — JAMAIS le rouge brand). */
const SYNC_DOT_CLASS: Record<ClubSyncStatus, string> = {
  ok: 'bg-data-positive',
  stale: 'bg-data-warning',
  never: 'bg-data-neutral',
}

/** Initiale du club (avatar textuel). Fallback robuste pour un nom vide. */
function clubInitial(name: string): string {
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '·'
}

export interface NetworkClubsTableProps {
  clubs: NetworkClubRow[]
  isLoading?: boolean
  /** Action « Voir » la fiche d'un club. Omise → bouton masqué. */
  onView?: (club: NetworkClubRow) => void
  /** Action « Synchroniser » un club. Omise → bouton masqué. */
  onSync?: (club: NetworkClubRow) => void
  /** Heure de référence pour la dérivation du statut (test/déterminisme). Défaut now(). */
  now?: Date
  /** Seuil « en retard » en ms. Défaut DEFAULT_STALE_AFTER_MS. */
  staleAfterMs?: number
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: NetworkClubsTableLabels
}

const TH_CLASS = 'text-left text-[12px] font-semibold text-text-ter py-2 px-3 first:pl-0'
const TD_CLASS = 'py-3 px-3 first:pl-0 align-middle text-[14px] text-text'
const numClass = "text-right [font-feature-settings:'tnum']"

/** Bouton d'action icône (Voir / Synchroniser). Cible tactile ≥ 44px. */
function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: 'Eye' | 'RefreshCw'
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter',
        'transition-shadow duration-[150ms] hover:bg-neutral-100',
        'focus:outline-none focus-visible:shadow-[var(--sh-glow)]'
      )}
    >
      <Icon name={icon} size={16} aria-hidden="true" />
    </button>
  )
}

/**
 * Tableau des clubs du réseau. Présentationnel (ordre fourni par l'app, pas de tri interne :
 * le RPC renvoie déjà trié par nom). États : loading (skeleton), vide (EmptyState), liste.
 */
export function NetworkClubsTable({
  clubs,
  isLoading,
  onView,
  onSync,
  now,
  staleAfterMs,
  labels,
}: NetworkClubsTableProps) {
  const columnLabels = { ...DEFAULT_COLUMN_LABELS, ...labels?.columns }
  const tableLabel = labels?.tableLabel ?? DEFAULT_TABLE_LABEL
  const syncStatusLabels = { ...DEFAULT_SYNC_STATUS_LABEL, ...labels?.syncStatuses }
  const neverSynced = labels?.neverSynced ?? DEFAULT_NEVER_SYNCED
  const matrixConnectedLabel = labels?.matrix?.connected ?? DEFAULT_MATRIX_CONNECTED
  const matrixDisconnectedLabel = labels?.matrix?.disconnected ?? DEFAULT_MATRIX_DISCONNECTED
  const valuationNone = labels?.valuationNone ?? DEFAULT_VALUATION_NONE
  const viewLabel = labels?.viewLabel ?? defaultViewLabel
  const syncLabel = labels?.syncLabel ?? defaultSyncLabel
  const locale = labels?.locale ?? 'fr-FR'

  const actionsEnabled = Boolean(onView || onSync)
  // `now` figé au rendu : déterministe pour la dérivation, ré-évalué à chaque refetch des données.
  const refNow = React.useMemo(() => now ?? new Date(), [now])

  if (!isLoading && clubs.length === 0) {
    return (
      <EmptyState
        icon="Building2"
        title={labels?.emptyTitle ?? DEFAULT_EMPTY_TITLE}
        description={labels?.emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
      />
    )
  }

  const colCount = actionsEnabled ? 6 : 5

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label={tableLabel}>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={TH_CLASS}>
              {columnLabels.club}
            </th>
            <th scope="col" className={cn(TH_CLASS, 'text-right')}>
              {columnLabels.members}
            </th>
            <th scope="col" className={cn(TH_CLASS, 'text-right')}>
              {columnLabels.valuation}
            </th>
            <th scope="col" className={TH_CLASS}>
              {columnLabels.lastSync}
            </th>
            <th scope="col" className={TH_CLASS}>
              {columnLabels.matrix}
            </th>
            {actionsEnabled && (
              <th scope="col" className={cn(TH_CLASS, 'text-right')}>
                <span className="sr-only">{columnLabels.actions}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: colCount }).map((__, j) => (
                    <td key={j} className="py-3 px-3 first:pl-0">
                      <div className="h-4 rounded bg-card-sub motion-safe:animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : clubs.map((club) => {
                const status = deriveSyncStatus(club.lastSyncedAt, refNow, staleAfterMs)
                return (
                  <tr
                    key={club.id}
                    data-testid="network-club-row"
                    className="border-b border-border align-middle"
                  >
                    {/* Club : initiale + nom + slug mono atténué. */}
                    <td className={TD_CLASS}>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-sub font-display text-[14px] font-bold text-text-sec"
                        >
                          {clubInitial(club.name)}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-text">{club.name}</span>
                          <span className="font-mono text-[12px] text-text-ter">{club.slug}</span>
                        </div>
                      </div>
                    </td>

                    {/* Membres actifs. */}
                    <td className={cn(TD_CLASS, numClass)}>{club.activeMembersCount}</td>

                    {/* Valo agrégée : « — » muet mais explicité (jamais un tiret ambigu). */}
                    <td className={cn(TD_CLASS, numClass, 'font-semibold')}>
                      {club.aggregatedValuation == null ? (
                        <span role="img" title={valuationNone} aria-label={valuationNone}>
                          <span aria-hidden="true">—</span>
                        </span>
                      ) : (
                        formatEUR(club.aggregatedValuation)
                      )}
                    </td>

                    {/* Dernière sync : pastille statut (dataviz) + temps relatif / « jamais ». */}
                    <td className={cn(TD_CLASS, 'text-text-sec')}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={cn('h-2 w-2 shrink-0 rounded-full', SYNC_DOT_CLASS[status])}
                          aria-hidden="true"
                        />
                        <span>
                          {status === 'never'
                            ? neverSynced
                            : formatRelativeTime(club.lastSyncedAt!, refNow, locale)}
                        </span>
                        {/* Statut textuel pour l'AT (la couleur n'est jamais le seul signal). */}
                        <span className="sr-only">{syncStatusLabels[status]}</span>
                      </span>
                    </td>

                    {/* Matrice : badge success/neutral (tokens dataviz). */}
                    <td className={TD_CLASS}>
                      <Badge variant={club.matrixConnected ? 'success' : 'neutral'}>
                        {club.matrixConnected ? matrixConnectedLabel : matrixDisconnectedLabel}
                      </Badge>
                    </td>

                    {/* Actions : Voir / Synchroniser (rendues seulement si callback fourni). */}
                    {actionsEnabled && (
                      <td className={cn(TD_CLASS, 'text-right')}>
                        <div className="inline-flex items-center gap-1">
                          {onView && (
                            <ActionButton
                              icon="Eye"
                              label={viewLabel(club.name)}
                              onClick={() => onView(club)}
                            />
                          )}
                          {onSync && (
                            <ActionButton
                              icon="RefreshCw"
                              label={syncLabel(club.name)}
                              onClick={() => onSync(club)}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
        </tbody>
      </table>
    </div>
  )
}
