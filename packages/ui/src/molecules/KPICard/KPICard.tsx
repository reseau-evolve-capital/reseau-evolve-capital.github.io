import * as React from 'react'
import { formatEUR } from '@evolve/utils'
import { TrendBadge, type TrendBadgeProps } from '../TrendBadge'
import { Icon, type IconName } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export interface KPICardProps {
  title: string
  value: number
  trend?: TrendBadgeProps
  href?: string
  icon?: IconName
  className?: string
}

export function KPICard({ title, value, trend, href, icon, className }: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-card border border-border rounded-[10px] p-6 shadow-[var(--sh-card)]',
        'transition-[border-color] duration-[150ms]',
        'hover:border-border-strong',
        'focus-within:shadow-[var(--sh-glow)]',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3.5">
        <p className="font-display font-bold text-[14px] tracking-[-0.01em] text-text">{title}</p>
        {icon && <Icon name={icon} size={20} className="text-text-ter" />}
      </div>

      <p className="font-display font-[800] text-[28px] leading-none tracking-[-0.02em] text-text [font-feature-settings:'tnum','lnum']">
        {formatEUR(value)}
      </p>

      {(trend ?? href) ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          {trend && <TrendBadge {...trend} />}
          {href && (
            <a
              href={href}
              className="text-[13px] font-semibold text-text border-b border-accent pb-px hover:bg-accent hover:text-accent-ink hover:px-1.5 hover:py-0.5 hover:border-0 hover:rounded-sm transition-all duration-[150ms]"
            >
              Voir détail
            </a>
          )}
        </div>
      ) : null}
    </div>
  )
}
