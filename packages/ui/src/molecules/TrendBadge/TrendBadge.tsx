import * as React from 'react'
import { cn } from '../../lib/cn'

export type TrendDirection = 'up' | 'down' | 'flat' | 'warn'

/** RÈGLE HARD : "down" utilise TOUJOURS data-negative — JAMAIS brand-red (#E93E3A) */
const directionConfig: Record<TrendDirection, { bg: string; text: string; glyph: string }> = {
  up: { bg: 'bg-data-positive-50', text: 'text-data-positive', glyph: '▲' },
  down: { bg: 'bg-data-negative-50', text: 'text-data-negative', glyph: '▼' },
  flat: { bg: 'bg-data-neutral-50', text: 'text-data-neutral', glyph: '—' },
  warn: { bg: 'bg-data-warning-50', text: 'text-data-warning', glyph: '⚠' },
}

export interface TrendBadgeProps {
  direction: TrendDirection
  value: string
  subValue?: string
  className?: string
}

export function TrendBadge({ direction, value, subValue, className }: TrendBadgeProps) {
  const { bg, text, glyph } = directionConfig[direction]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[9999px] px-3 py-1',
        'font-body font-semibold text-[13px] [font-feature-settings:"tnum"]',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-[320ms]',
        bg,
        text,
        className
      )}
    >
      <span aria-hidden="true">{glyph}</span>
      <span>{value}</span>
      {subValue && <span className="opacity-70">{subValue}</span>}
    </span>
  )
}
