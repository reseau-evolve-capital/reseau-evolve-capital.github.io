import * as React from 'react'
import { EmptyState } from '../../molecules/EmptyState'
import { cn } from '../../lib/cn'

export interface RegulariserListItem {
  membershipId: string
  fullName: string
  lateMonthsCount: number
  amountDue: number
}

export interface RegulariserListLabels {
  title: string
  emptyTitle: string
  emptyDesc: string
  relancer: string
  /** Pre-formatted string like "3 mois" — parent handles pluralization */
  lateMonthsLabel: (count: number) => string
  amountDueAriaLabel: string
}

export interface RegulariserListProps {
  items: RegulariserListItem[]
  onRelancer: (membershipId: string) => void
  onMemberClick: (membershipId: string) => void
  labels: RegulariserListLabels
  /** Format a currency amount for display. Parent provides this to avoid i18n dep in packages/ui */
  formatAmount: (amount: number) => string
}

function onActivate(e: React.KeyboardEvent<HTMLElement>, callback: () => void): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    callback()
  }
}

export function RegulariserList({
  items,
  onRelancer,
  onMemberClick,
  labels,
  formatAmount,
}: RegulariserListProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="CircleCheck" title={labels.emptyTitle} description={labels.emptyDesc} />
    )
  }

  return (
    <div className="bg-card border border-border rounded-[10px] overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-display font-bold text-[14px] tracking-[-0.01em] text-text">
          {labels.title}
        </h3>
      </div>
      <ul role="list" className="divide-y divide-border">
        {items.map((item, index) => (
          <li
            key={item.membershipId}
            role="button"
            tabIndex={0}
            aria-label={item.fullName}
            onClick={() => onMemberClick(item.membershipId)}
            onKeyDown={(e) => onActivate(e, () => onMemberClick(item.membershipId))}
            className={cn(
              'flex items-center justify-between gap-3 px-4 py-3',
              'transition-colors duration-[150ms]',
              'hover:bg-neutral-100 focus-visible:bg-neutral-100',
              'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset'
            )}
            data-testid={`regulariser-row-${item.membershipId}`}
          >
            {/* Left: member info */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-bold text-[14px] text-text truncate">{item.fullName}</span>
              <span className="text-[12px] text-text-ter">
                {labels.lateMonthsLabel(item.lateMonthsCount)}
              </span>
            </div>

            {/* Right: amount + action */}
            <div className="flex items-center gap-3 shrink-0">
              <span
                aria-label={`${labels.amountDueAriaLabel} : ${formatAmount(item.amountDue)}`}
                className={cn(
                  'font-mono text-[14px] tabular-nums',
                  item.amountDue > 0 ? 'text-data-negative-500' : 'text-text'
                )}
              >
                {formatAmount(item.amountDue)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRelancer(item.membershipId)
                }}
                onKeyDown={(e) => e.stopPropagation()}
                aria-label={`${labels.relancer} – ${item.fullName}`}
                className={cn(
                  'min-w-[44px] min-h-[44px] px-3',
                  'inline-flex items-center justify-center',
                  'rounded-md text-[13px] font-semibold',
                  'bg-accent text-accent-ink',
                  'hover:opacity-90 active:opacity-80',
                  'transition-opacity duration-[150ms]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
                )}
              >
                {labels.relancer}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
