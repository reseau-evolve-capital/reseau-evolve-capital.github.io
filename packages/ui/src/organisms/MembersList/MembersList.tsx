import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { formatEUR, formatPct } from '@evolve/utils'
import { AccessBadge, type AccessStatus, type AccessBadgeLabels } from '../../atoms/AccessBadge'
import { Badge, type BadgeVariant } from '../../atoms/Badge'
import { Pill, type PillStatus } from '../../atoms/Pill'
import { ProgressBar } from '../../atoms/ProgressBar'
import { EmptyState } from '../../molecules/EmptyState'
import { MemberActionsMenu, type MemberActionsMenuLabels } from '../../molecules/MemberActionsMenu'
import { cn } from '../../lib/cn'

export type MemberRoleKey = 'member' | 'treasurer' | 'president' | 'network_admin'
export type MemberContribStatus = 'ok' | 'pending' | 'late' | 'exempt'
/** Statut d'accès d'un membre à l'espace (ADM-007). apps/web ne passe que active|locked. */
export type MemberAccessStatus = Extract<AccessStatus, 'active' | 'locked'>

/** Ligne membre consommée par la table (déjà mappée par apps/web). */
export interface MemberRow {
  id: string
  fullName: string
  email: string
  role: MemberRoleKey
  totalContributed: number
  detentionPct: number // fraction 0..1
  monthsCount: number
  status: MemberContribStatus | null
  /** Statut d'accès à l'espace membre (ADM-007). */
  accessStatus: MemberAccessStatus
}

/** Libellés des en-têtes de colonnes (aussi injectés dans l'aria-label de tri). */
export interface MembersListColumnLabels {
  fullName: string
  role: string
  totalContributed: string
  detentionPct: string
  monthsCount: string
  status: string
  /** En-tête de la colonne d'accès (ADM-007). */
  access: string
}

/** Toutes les chaînes user-facing/a11y de la liste. Défauts FR byte-exacts. */
export interface MembersListLabels {
  /** En-têtes de colonnes. */
  columns?: Partial<MembersListColumnLabels>
  /** Libellés des rôles (Badge). */
  roles?: Partial<Record<MemberRoleKey, string>>
  /** Libellés des statuts de cotisation (Pill). */
  statuses?: Partial<Record<MemberContribStatus, string>>
  /** Libellés des statuts d'accès (AccessBadge). active/locked. */
  access?: Pick<AccessBadgeLabels, 'active' | 'locked'>
  /** Libellés du menu d'actions (MemberActionsMenu). */
  actions?: MemberActionsMenuLabels
  /** Titre de l'état vide. */
  emptyTitle?: string
  /** Description de l'état vide. */
  emptyDescription?: string
  /** aria-label du tableau. */
  tableLabel?: string
  /** aria-label « Trier par {col} » (+ suffixe de direction). */
  sortLabel?: (column: string, direction: 'asc' | 'desc' | false) => string
  /** aria-label de la barre de quote-part « Quote-part de {nom} ». */
  detentionBarLabel?: (name: string) => string
}

export interface MembersListProps {
  members: MemberRow[]
  isLoading?: boolean
  /**
   * Action « Bloquer l'accès » sur une ligne active (ADM-007). Si aucun des trois
   * callbacks d'accès n'est fourni, la colonne « Actions » (menu) est omise — la
   * pastille d'accès reste affichée. Rétro-compatible.
   */
  onLockMember?: (member: MemberRow) => void
  /** Action « Débloquer » sur une ligne bloquée (ADM-007). */
  onUnlockMember?: (member: MemberRow) => void
  /** Action « Voir la fiche » d'un membre (ADM-007). */
  onViewMember?: (member: MemberRow) => void
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: MembersListLabels
}

const DEFAULT_ROLE_LABEL: Record<MemberRoleKey, string> = {
  member: 'Membre',
  treasurer: 'Trésorier',
  president: 'Président',
  network_admin: 'Admin réseau',
}
const ROLE_VARIANT: Record<MemberRoleKey, BadgeVariant> = {
  member: 'neutral',
  treasurer: 'brand',
  president: 'warning',
  network_admin: 'error',
}
const STATUS_PILL: Record<MemberContribStatus, PillStatus> = {
  ok: 'cotisation-ok',
  pending: 'cotisation-pending',
  late: 'cotisation-late',
  exempt: 'cotisation-exempt',
}
const DEFAULT_STATUS_LABEL: Record<MemberContribStatus, string> = {
  ok: 'À jour',
  pending: 'En attente',
  late: 'En retard',
  exempt: 'Exempté',
}

const DEFAULT_COLUMN_LABELS: MembersListColumnLabels = {
  fullName: 'Membre',
  role: 'Rôle',
  totalContributed: 'Total cotisé',
  detentionPct: 'Quote-part',
  monthsCount: 'Mois cotisés',
  status: 'Statut',
  access: 'Accès',
}

const DEFAULT_EMPTY_TITLE = 'Aucun membre'
const DEFAULT_EMPTY_DESCRIPTION = "Ce club n'a pas encore de membre correspondant à ce filtre."
const DEFAULT_TABLE_LABEL = 'Membres du club'

const defaultSortLabel: NonNullable<MembersListLabels['sortLabel']> = (column, direction) =>
  `Trier par ${column}${
    direction === 'asc' ? ', tri croissant' : direction === 'desc' ? ', tri décroissant' : ''
  }`

const defaultDetentionBarLabel: NonNullable<MembersListLabels['detentionBarLabel']> = (name) =>
  `Quote-part de ${name}`

const col = createColumnHelper<MemberRow>()
const numClass = "text-right [font-feature-settings:'tnum']"

/** Config du menu d'actions par ligne (ADM-007). `enabled=false` → colonne omise. */
interface ActionsConfig {
  enabled: boolean
  labels?: MemberActionsMenuLabels
  onLock?: (member: MemberRow) => void
  onUnlock?: (member: MemberRow) => void
  onViewProfile?: (member: MemberRow) => void
}

/** Construit les colonnes avec les libellés fournis (défauts FR). */
function buildColumns(
  columnLabels: MembersListColumnLabels,
  roleLabels: Record<MemberRoleKey, string>,
  statusLabels: Record<MemberContribStatus, string>,
  accessLabels: Pick<AccessBadgeLabels, 'active' | 'locked'>,
  detentionBarLabel: (name: string) => string,
  actions: ActionsConfig
) {
  const baseColumns = [
    col.accessor('fullName', {
      header: columnLabels.fullName,
      cell: (c) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">{c.getValue()}</span>
          <span className="text-[12px] text-text-ter">{c.row.original.email}</span>
        </div>
      ),
    }),
    col.accessor('role', {
      header: columnLabels.role,
      enableSorting: false,
      cell: (c) => <Badge variant={ROLE_VARIANT[c.getValue()]}>{roleLabels[c.getValue()]}</Badge>,
    }),
    col.accessor('totalContributed', {
      header: columnLabels.totalContributed,
      cell: (c) => <span className={cn(numClass, 'font-semibold')}>{formatEUR(c.getValue())}</span>,
    }),
    col.accessor('detentionPct', {
      header: columnLabels.detentionPct,
      cell: (c) => (
        <div className="flex flex-col items-end gap-1">
          <span className={numClass}>{formatPct(c.getValue(), { showSign: false })}</span>
          <ProgressBar
            value={c.getValue() * 100}
            label={detentionBarLabel(c.row.original.fullName)}
            className="w-20"
          />
        </div>
      ),
    }),
    col.accessor('monthsCount', {
      header: columnLabels.monthsCount,
      cell: (c) => <span className={numClass}>{c.getValue()}</span>,
    }),
    col.accessor('status', {
      header: columnLabels.status,
      enableSorting: false,
      cell: (c) => {
        const s = c.getValue()
        return s ? <Pill status={STATUS_PILL[s]}>{statusLabels[s]}</Pill> : <span>—</span>
      },
    }),
    // Colonne « Accès » (ADM-007), juste après « Statut ».
    col.accessor('accessStatus', {
      header: columnLabels.access,
      enableSorting: false,
      cell: (c) => <AccessBadge status={c.getValue()} labels={accessLabels} />,
    }),
  ]

  if (!actions.enabled) return baseColumns

  return [
    ...baseColumns,
    // Colonne d'actions (menu « ··· »). En-tête présent pour l'a11y (scope col),
    // mais visuellement masqué (cohérent avec la réf : pas de libellé visible).
    col.display({
      id: 'actions',
      header: () => <span className="sr-only">{actions.labels?.trigger ?? 'Actions'}</span>,
      cell: (c) => (
        <div className="flex justify-end">
          <MemberActionsMenu
            accessStatus={c.row.original.accessStatus}
            labels={actions.labels}
            onLock={actions.onLock ? () => actions.onLock?.(c.row.original) : undefined}
            onUnlock={actions.onUnlock ? () => actions.onUnlock?.(c.row.original) : undefined}
            onViewProfile={
              actions.onViewProfile ? () => actions.onViewProfile?.(c.row.original) : undefined
            }
          />
        </div>
      ),
    }),
  ]
}

const ariaSort = (dir: false | 'asc' | 'desc'): 'none' | 'ascending' | 'descending' =>
  dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'

/** Tableau des membres du club (vue trésorier). Présentationnel : tri interne TanStack,
 *  le filtre « impayé » est géré par l'app (URL state). Modèle = PortfolioTable. */
export function MembersList({
  members,
  isLoading,
  onLockMember,
  onUnlockMember,
  onViewMember,
  labels,
}: MembersListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'totalContributed', desc: true },
  ])

  const columnLabels = React.useMemo(
    () => ({ ...DEFAULT_COLUMN_LABELS, ...labels?.columns }),
    [labels?.columns]
  )
  const roleLabels = React.useMemo(
    () => ({ ...DEFAULT_ROLE_LABEL, ...labels?.roles }),
    [labels?.roles]
  )
  const statusLabels = React.useMemo(
    () => ({ ...DEFAULT_STATUS_LABEL, ...labels?.statuses }),
    [labels?.statuses]
  )
  const accessLabels = labels?.access ?? {}
  const detentionBarLabel = labels?.detentionBarLabel ?? defaultDetentionBarLabel
  const sortLabel = labels?.sortLabel ?? defaultSortLabel
  const tableLabel = labels?.tableLabel ?? DEFAULT_TABLE_LABEL

  // Le menu d'actions n'apparaît que si au moins un callback d'accès est fourni
  // (rétro-compatibilité : sans callbacks, on garde la pastille sans le menu).
  const actionsEnabled = Boolean(onLockMember || onUnlockMember || onViewMember)
  const actionsLabels = labels?.actions

  const columns = React.useMemo(
    () =>
      buildColumns(columnLabels, roleLabels, statusLabels, accessLabels, detentionBarLabel, {
        enabled: actionsEnabled,
        labels: actionsLabels,
        onLock: onLockMember,
        onUnlock: onUnlockMember,
        onViewProfile: onViewMember,
      }),
    [
      columnLabels,
      roleLabels,
      statusLabels,
      accessLabels,
      detentionBarLabel,
      actionsEnabled,
      actionsLabels,
      onLockMember,
      onUnlockMember,
      onViewMember,
    ]
  )

  const table = useReactTable({
    data: members,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!isLoading && members.length === 0) {
    return (
      <EmptyState
        icon="Users"
        title={labels?.emptyTitle ?? DEFAULT_EMPTY_TITLE}
        description={labels?.emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
      />
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label={tableLabel}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border">
              {hg.headers.map((h) => {
                const sortable = h.column.getCanSort()
                return (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={sortable ? ariaSort(h.column.getIsSorted()) : undefined}
                    className="text-left text-[12px] font-semibold text-text-ter py-2 px-3 first:pl-0"
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        aria-label={sortLabel(
                          String(h.column.columnDef.header),
                          h.column.getIsSorted()
                        )}
                        className="inline-flex items-center gap-1 focus-visible:shadow-[var(--sh-glow)] focus-visible:outline-none rounded"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span aria-hidden="true">
                          {h.column.getIsSorted() === 'asc'
                            ? '↑'
                            : h.column.getIsSorted() === 'desc'
                              ? '↓'
                              : '↕'}
                        </span>
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {columns.map((_c, j) => (
                    <td key={j} className="py-3 px-3 first:pl-0">
                      <div className="h-4 rounded bg-card-sub motion-safe:animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-testid="member-row"
                  className="border-b border-border align-middle"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-3 first:pl-0 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
