import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '../../lib/cn'

export type CotisationVariant = 'paid' | 'late' | 'pending' | 'exempt'

const variantClasses: Record<CotisationVariant, string> = {
  paid: 'bg-data-positive-50 hover:opacity-80',
  late: 'bg-data-warning-50 hover:opacity-80',
  pending: 'bg-data-neutral-50 hover:opacity-80',
  exempt: 'bg-neutral-100 opacity-50',
}

export interface CotisationMonthProps {
  variant: CotisationVariant
  tooltip: string
  size?: 'sm' | 'md'
  'aria-label': string
}

export function CotisationMonth({
  variant,
  tooltip,
  size = 'md',
  'aria-label': ariaLabel,
}: CotisationMonthProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={ariaLabel}
          className={cn(
            'rounded-sm transition-opacity duration-[150ms]',
            'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
            size === 'sm' ? 'h-3 w-3' : 'h-6 w-6 min-h-[24px] min-w-[24px]',
            variantClasses[variant]
          )}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          className="z-50 bg-card border border-border rounded-[10px] shadow-[var(--sh-pop)] px-3 py-2 text-[12px] text-text max-w-[200px]"
        >
          {tooltip}
          <Popover.Arrow className="fill-card" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
