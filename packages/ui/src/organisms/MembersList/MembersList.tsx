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

export interface MembersListProps {
  members: MemberRow[]
  isLoading?: boolean
}

const ROLE_LABEL: Record<MemberRoleKey, string> = {
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
const STATUS_PILL: Record<MemberContribStatus, { status: PillStatus; label: string }> = {
  ok: { status: 'cotisation-ok', label: 'À jour' },
  pending: { status: 'cotisation-pending', label: 'En attente' },
  late: { status: 'cotisation-late', label: 'En retard' },
  exempt: { status: 'cotisation-exempt', label: 'Exempté' },
}

const col = createColumnHelper<MemberRow>()
const numClass = "text-right [font-feature-settings:'tnum']"

const columns = [
  col.accessor('fullName', {
    header: 'Membre',
    cell: (c) => (
      <div className="flex flex-col">
        <span className="font-semibold text-text">{c.getValue()}</span>
        <span className="text-[12px] text-text-ter">{c.row.original.email}</span>
      </div>
    ),
  }),
  col.accessor('role', {
    header: 'Rôle',
    enableSorting: false,
    cell: (c) => <Badge variant={ROLE_VARIANT[c.getValue()]}>{ROLE_LABEL[c.getValue()]}</Badge>,
  }),
  col.accessor('totalContributed', {
    header: 'Total cotisé',
    cell: (c) => <span className={cn(numClass, 'font-semibold')}>{formatEUR(c.getValue())}</span>,
  }),
  col.accessor('detentionPct', {
    header: 'Quote-part',
    cell: (c) => (
      <div className="flex flex-col items-end gap-1">
        <span className={numClass}>{formatPct(c.getValue(), { showSign: false })}</span>
        <ProgressBar
          value={c.getValue() * 100}
          label={`Quote-part de ${c.row.original.fullName}`}
          className="w-20"
        />
      </div>
    ),
  }),
  col.accessor('monthsCount', {
    header: 'Mois cotisés',
    cell: (c) => <span className={numClass}>{c.getValue()}</span>,
  }),
  col.accessor('status', {
    header: 'Statut',
    enableSorting: false,
    cell: (c) => {
      const s = c.getValue()
      return s ? <Pill status={STATUS_PILL[s].status}>{STATUS_PILL[s].label}</Pill> : <span>—</span>
    },
  }),
]

const ariaSort = (dir: false | 'asc' | 'desc'): 'none' | 'ascending' | 'descending' =>
  dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'

/** Tableau des membres du club (vue trésorier). Présentationnel : tri interne TanStack,
 *  le filtre « impayé » est géré par l'app (URL state). Modèle = PortfolioTable. */
export function MembersList({ members, isLoading }: MembersListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'totalContributed', desc: true },
  ])

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
        title="Aucun membre"
        description="Ce club n'a pas encore de membre correspondant à ce filtre."
      />
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Membres du club">
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
                        aria-label={`Trier par ${String(h.column.columnDef.header)}${
                          h.column.getIsSorted() === 'asc'
                            ? ', tri croissant'
                            : h.column.getIsSorted() === 'desc'
                              ? ', tri décroissant'
                              : ''
                        }`}
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
