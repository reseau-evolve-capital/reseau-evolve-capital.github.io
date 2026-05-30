import * as React from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant = 'brand' | 'neutral' | 'success' | 'warning' | 'error'

const variantClasses: Record<BadgeVariant, string> = {
  brand: 'bg-brand-yellow text-accent-ink',
  neutral: 'bg-data-neutral-50 text-data-neutral',
  success: 'bg-data-positive-50 text-data-positive',
  warning: 'bg-data-warning-50 text-data-warning',
  error: 'bg-data-negative-50 text-data-negative',
}

export interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[9999px] px-2 py-0.5 text-[12px] font-semibold font-body',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
