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

/** Libellés des colonnes du tableau (en-têtes, aussi injectés dans l'aria-label de tri). */
export interface PortfolioTableColumnLabels {
  name: string
  category: string
  quantity: string
  pru: string
  livePrice: string
  currentValue: string
  gainLossEur: string
  gainLossPct: string
}

/** Toutes les chaînes user-facing/a11y de la table. Défauts FR byte-exacts. */
export interface PortfolioTableLabels {
  /** En-têtes de colonnes. */
  columns?: Partial<PortfolioTableColumnLabels>
  /** Titre de l'état vide. */
  emptyTitle?: string
  /** Description de l'état vide. */
  emptyDescription?: string
  /** CTA historique des transactions (V1, non cliquable). */
  transactionsHistory?: string
  /** aria-label du tableau. */
  tableLabel?: string
  /** aria-label « Trier par {col} » (+ suffixe de direction). */
  sortLabel?: (column: string, direction: 'asc' | 'desc' | false) => string
  /** aria-label « Voir le détail de {nom} » sur chaque ligne. */
  rowLabel?: (name: string) => string
  /** Compteur du footer : N lignes rendues sur M total. */
  counter?: (rendered: number, total: number) => string
}

const DEFAULT_COLUMN_LABELS: PortfolioTableColumnLabels = {
  name: 'Actif',
  category: 'Type',
  quantity: 'Quantité',
  pru: 'PRU',
  livePrice: 'Cours',
  currentValue: 'Valeur',
  gainLossEur: '+/- €',
  gainLossPct: '+/- %',
}

const DEFAULT_EMPTY_TITLE = 'Aucune position'
const DEFAULT_EMPTY_DESCRIPTION = "Ton club n'a pas encore de position ouverte."
const DEFAULT_TRANSACTIONS_HISTORY = 'Historique des transactions (bientôt) →'
const DEFAULT_TABLE_LABEL = 'Portefeuille des positions'

const defaultSortLabel: NonNullable<PortfolioTableLabels['sortLabel']> = (column, direction) =>
  `Trier par ${column}${
    direction === 'asc' ? ', tri croissant' : direction === 'desc' ? ', tri décroissant' : ''
  }`

const defaultRowLabel: NonNullable<PortfolioTableLabels['rowLabel']> = (name) =>
  `Voir le détail de ${name}`

/**
 * Compteur du footer. N = lignes rendues, M = total club.
 * - M inconnu ou N === M → « N position(s) » (pas de filtre → pas trompeur).
 * - sinon → « Affiche N sur M — voir toutes » (conforme à la réf desktop).
 */
const defaultCounter: NonNullable<PortfolioTableLabels['counter']> = (rendered, total) => {
  if (total <= rendered) {
    return `${rendered} position${rendered > 1 ? 's' : ''}`
  }
  return `Affiche ${rendered} sur ${total} — voir toutes`
}

export interface PortfolioTableProps {
  positions: PortfolioPosition[]
  isLoading?: boolean
  onRowClick: (position: PortfolioPosition) => void
  /**
   * Nombre total de positions du club (avant filtrage). Sert au compteur du footer
   * « Affiche N sur M ». Si omis ou égal à `positions.length`, le footer affiche
   * simplement « N positions » (aucun filtre actif → pas de « sur »).
   */
  totalCount?: number
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: PortfolioTableLabels
}

const col = createColumnHelper<PortfolioPosition>()
const numClass = "text-right [font-feature-settings:'tnum']"
const perfClass = (n: number) => (n < 0 ? 'text-data-negative' : 'text-data-positive')

/** Construit les colonnes avec les libellés d'en-tête fournis (défauts FR). */
function buildColumns(columnLabels: PortfolioTableColumnLabels) {
  return [
    col.accessor('name', {
      header: columnLabels.name,
      cell: (c) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">{c.getValue()}</span>
          <span className="text-[12px] text-text-ter">{c.row.original.symbol}</span>
        </div>
      ),
    }),
    col.accessor('category', {
      header: columnLabels.category,
      cell: (c) => (c.getValue() ? <Badge>{c.getValue()}</Badge> : <span>—</span>),
      enableSorting: false,
    }),
    col.accessor('quantity', {
      header: columnLabels.quantity,
      cell: (c) => <span className={numClass}>{c.getValue()}</span>,
    }),
    col.accessor('pru', {
      header: columnLabels.pru,
      cell: (c) => (
        <span className={numClass}>
          {c.getValue() == null ? '—' : formatEUR(c.getValue() as number)}
        </span>
      ),
    }),
    col.accessor('livePrice', {
      header: columnLabels.livePrice,
      cell: (c) => (
        <span className={numClass}>
          {c.getValue() == null ? '—' : formatEUR(c.getValue() as number)}
        </span>
      ),
    }),
    col.accessor('currentValue', {
      header: columnLabels.currentValue,
      cell: (c) => <span className={cn(numClass, 'font-semibold')}>{formatEUR(c.getValue())}</span>,
    }),
    col.accessor('gainLossEur', {
      header: columnLabels.gainLossEur,
      cell: (c) => (
        <span className={cn(numClass, perfClass(c.getValue()))}>{formatEUR(c.getValue())}</span>
      ),
    }),
    col.accessor('gainLossPct', {
      header: columnLabels.gainLossPct,
      cell: (c) => (
        <span className={cn(numClass, perfClass(c.getValue()))}>{formatPct(c.getValue())}</span>
      ),
    }),
  ]
}

const ariaSort = (dir: false | 'asc' | 'desc'): 'none' | 'ascending' | 'descending' =>
  dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'

/** Tableau desktop des positions (headless TanStack Table v8 + balisage HTML natif). */
export function PortfolioTable({
  positions,
  isLoading,
  onRowClick,
  totalCount,
  labels,
}: PortfolioTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'currentValue', desc: true }])

  const columnLabels = React.useMemo(
    () => ({ ...DEFAULT_COLUMN_LABELS, ...labels?.columns }),
    [labels?.columns]
  )
  const columns = React.useMemo(() => buildColumns(columnLabels), [columnLabels])

  const sortLabel = labels?.sortLabel ?? defaultSortLabel
  const rowLabel = labels?.rowLabel ?? defaultRowLabel
  const counter = labels?.counter ?? defaultCounter
  const tableLabel = labels?.tableLabel ?? DEFAULT_TABLE_LABEL
  const transactionsHistory = labels?.transactionsHistory ?? DEFAULT_TRANSACTIONS_HISTORY

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
        title={labels?.emptyTitle ?? DEFAULT_EMPTY_TITLE}
        description={labels?.emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
      />
    )
  }

  const rendered = table.getRowModel().rows.length
  const total = totalCount ?? positions.length

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
                  onClick={() => onRowClick(row.original)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRowClick(row.original)
                    }
                  }}
                  tabIndex={0}
                  aria-label={rowLabel(row.original.name)}
                  data-testid="position-row"
                  className="border-b border-border hover:bg-card-sub cursor-pointer transition-colors focus-visible:shadow-[var(--sh-glow)] focus-visible:outline-none"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-3 first:pl-0 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
        {!isLoading && (
          <tfoot>
            <tr>
              <td colSpan={columns.length} className="pt-3 px-3 first:pl-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                  <span className="text-text-sec">{counter(rendered, total)}</span>
                  {/* Historique des transactions reporté à la V1 (pas de route cible). */}
                  <span
                    aria-disabled="true"
                    className="font-semibold text-text-ter cursor-not-allowed select-none"
                  >
                    {transactionsHistory}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
