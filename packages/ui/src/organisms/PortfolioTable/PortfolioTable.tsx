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
import type { PortfolioPosition } from '@evolve/types'
import { Badge } from '../../atoms/Badge'
import { EmptyState } from '../../molecules/EmptyState'
import { cn } from '../../lib/cn'

export interface PortfolioTableProps {
  positions: PortfolioPosition[]
  isLoading?: boolean
  onRowClick: (position: PortfolioPosition) => void
}

const col = createColumnHelper<PortfolioPosition>()
const numClass = "text-right [font-feature-settings:'tnum']"
const perfClass = (n: number) => (n < 0 ? 'text-data-negative' : 'text-data-positive')

const columns = [
  col.accessor('name', {
    header: 'Actif',
    cell: (c) => (
      <div className="flex flex-col">
        <span className="font-semibold text-text">{c.getValue()}</span>
        <span className="text-[12px] text-text-ter">{c.row.original.symbol}</span>
      </div>
    ),
  }),
  col.accessor('category', {
    header: 'Type',
    cell: (c) => (c.getValue() ? <Badge>{c.getValue()}</Badge> : <span>—</span>),
    enableSorting: false,
  }),
  col.accessor('quantity', {
    header: 'Quantité',
    cell: (c) => <span className={numClass}>{c.getValue()}</span>,
  }),
  col.accessor('pru', {
    header: 'PRU',
    cell: (c) => (
      <span className={numClass}>
        {c.getValue() == null ? '—' : formatEUR(c.getValue() as number)}
      </span>
    ),
  }),
  col.accessor('livePrice', {
    header: 'Cours',
    cell: (c) => (
      <span className={numClass}>
        {c.getValue() == null ? '—' : formatEUR(c.getValue() as number)}
      </span>
    ),
  }),
  col.accessor('currentValue', {
    header: 'Valeur',
    cell: (c) => <span className={cn(numClass, 'font-semibold')}>{formatEUR(c.getValue())}</span>,
  }),
  col.accessor('gainLossEur', {
    header: '+/- €',
    cell: (c) => (
      <span className={cn(numClass, perfClass(c.getValue()))}>{formatEUR(c.getValue())}</span>
    ),
  }),
  col.accessor('gainLossPct', {
    header: '+/- %',
    cell: (c) => (
      <span className={cn(numClass, perfClass(c.getValue()))}>{formatPct(c.getValue())}</span>
    ),
  }),
]

const ariaSort = (dir: false | 'asc' | 'desc'): 'none' | 'ascending' | 'descending' =>
  dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'

/** Tableau desktop des positions (headless TanStack Table v8 + balisage HTML natif). */
export function PortfolioTable({ positions, isLoading, onRowClick }: PortfolioTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'currentValue', desc: true }])

  const table = useReactTable({
    data: positions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!isLoading && positions.length === 0) {
    return (
      <EmptyState
        icon="ChartPie"
        title="Aucune position"
        description="Ton club n'a pas encore de position ouverte."
      />
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label="Portefeuille des positions">
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
                        className="inline-flex items-center gap-1 focus-visible:shadow-[var(--sh-glow)] outline-none rounded"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span aria-hidden="true">
                          {h.column.getIsSorted() === 'asc'
                            ? '↑'
                            : h.column.getIsSorted() === 'desc'
                              ? '↓'
                              : ''}
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
                  onClick={() => onRowClick(row.original)}
                  data-testid="position-row"
                  className="border-b border-border hover:bg-card-sub cursor-pointer transition-colors"
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
