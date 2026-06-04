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
import { Badge, type BadgeVariant } from '../../atoms/Badge'
import { Pill, type PillStatus } from '../../atoms/Pill'
import { ProgressBar } from '../../atoms/ProgressBar'
import { EmptyState } from '../../molecules/EmptyState'
import { cn } from '../../lib/cn'

export type MemberRoleKey = 'member' | 'treasurer' | 'president' | 'network_admin'
export type MemberContribStatus = 'ok' | 'pending' | 'late' | 'exempt'

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
}

/** Libellés des en-têtes de colonnes (aussi injectés dans l'aria-label de tri). */
export interface MembersListColumnLabels {
  fullName: string
  role: string
  totalContributed: string
  detentionPct: string
  monthsCount: string
  status: string
}

/** Toutes les chaînes user-facing/a11y de la liste. Défauts FR byte-exacts. */
export interface MembersListLabels {
  /** En-têtes de colonnes. */
  columns?: Partial<MembersListColumnLabels>
  /** Libellés des rôles (Badge). */
  roles?: Partial<Record<MemberRoleKey, string>>
  /** Libellés des statuts de cotisation (Pill). */
  statuses?: Partial<Record<MemberContribStatus, string>>
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

/** Construit les colonnes avec les libellés fournis (défauts FR). */
function buildColumns(
  columnLabels: MembersListColumnLabels,
  roleLabels: Record<MemberRoleKey, string>,
  statusLabels: Record<MemberContribStatus, string>,
  detentionBarLabel: (name: string) => string
) {
  return [
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
  ]
}

const ariaSort = (dir: false | 'asc' | 'desc'): 'none' | 'ascending' | 'descending' =>
  dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'

/** Tableau des membres du club (vue trésorier). Présentationnel : tri interne TanStack,
 *  le filtre « impayé » est géré par l'app (URL state). Modèle = PortfolioTable. */
export function MembersList({ members, isLoading, labels }: MembersListProps) {
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
  const detentionBarLabel = labels?.detentionBarLabel ?? defaultDetentionBarLabel
  const sortLabel = labels?.sortLabel ?? defaultSortLabel
  const tableLabel = labels?.tableLabel ?? DEFAULT_TABLE_LABEL

  const columns = React.useMemo(
    () => buildColumns(columnLabels, roleLabels, statusLabels, detentionBarLabel),
    [columnLabels, roleLabels, statusLabels, detentionBarLabel]
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
