import * as React from 'react'
import { formatEUR } from '@evolve/utils'
import { TrendBadge, type TrendBadgeProps } from '../TrendBadge'
import { cn } from '../../lib/cn'

export interface NumberStatProps {
  value: number
  label: string
  trend?: TrendBadgeProps
  className?: string
}

export function NumberStat({ value, label, trend, className }: NumberStatProps) {
  const formatted = formatEUR(value)
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-[14px] font-semibold text-text-sec uppercase tracking-[0.06em]">{label}</p>
      <p
        className="font-display font-black text-[72px] leading-none tracking-[-0.02em] text-text [font-feature-settings:'tnum','lnum']"
        aria-label={`${label}: ${formatted}`}
      >
        {formatted}
      </p>
      {trend && <TrendBadge {...trend} />}
    </div>
  )
}
