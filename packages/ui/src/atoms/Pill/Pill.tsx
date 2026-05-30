import * as React from 'react'
import { cn } from '../../lib/cn'

export type PillStatus =
  | 'cotisation-ok'
  | 'cotisation-late'
  | 'cotisation-pending'
  | 'cotisation-exempt'

const statusClasses: Record<PillStatus, string> = {
  'cotisation-ok': 'bg-data-positive-50 text-data-positive',
  'cotisation-late': 'bg-data-warning-50 text-data-warning',
  'cotisation-pending': 'bg-data-neutral-50 text-data-neutral',
  'cotisation-exempt': 'bg-neutral-100 text-text-ter',
}

export interface PillProps {
  status: PillStatus
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function Pill({ status, icon, className, children }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[9999px] px-2.5 py-1 text-[12px] font-semibold font-body',
        statusClasses[status],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}
