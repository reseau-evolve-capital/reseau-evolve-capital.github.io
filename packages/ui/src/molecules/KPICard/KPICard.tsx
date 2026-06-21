import * as React from 'react'
import { formatEUR, formatPct } from '@evolve/utils'
import { TrendBadge, type TrendBadgeProps } from '../TrendBadge'
import { Icon, type IconName } from '../../atoms/Icon'
import { InfoTip } from '../../atoms/InfoTip'
import { Skeleton } from '../../atoms/Skeleton'
import { cn } from '../../lib/cn'

export interface KPICardProps {
  title: string
  value: number | string
  /** 'eur' (défaut, rétrocompat) | 'pct' (fraction 0..1) | 'raw' (string telle quelle) */
  format?: 'eur' | 'pct' | 'raw'
  trend?: TrendBadgeProps
  href?: string
  icon?: IconName
  isLoading?: boolean
  className?: string
  /** Libellé du lien « voir détail ». Défaut FR. */
  detailLabel?: string
  /** Texte explicatif affiché dans une bulle au clic/hover de l'icône (i). Copy via props. */
  hint?: string
  /** Libellé accessible du bouton (i). Requis si hint est fourni. */
  hintLabel?: string
}

function renderValue(value: number | string, format: NonNullable<KPICardProps['format']>): string {
  if (format === 'raw') return String(value)
  if (typeof value !== 'number') return String(value)
  return format === 'pct' ? formatPct(value, { showSign: false }) : formatEUR(value)
}

export function KPICard({
  title,
  value,
  format = 'eur',
  trend,
  href,
  icon,
  isLoading = false,
  className,
  detailLabel = 'Voir détail',
  hint,
  hintLabel = 'En savoir plus',
}: KPICardProps) {
  return (
    <div
      className={cn(
        // Padding responsive : compact en mobile (p-4), aéré dès sm (p-6).
        'bg-card border border-border rounded-[10px] p-4 sm:p-6 shadow-[var(--sh-card)]',
        'transition-[border-color,transform,box-shadow] duration-[150ms]',
        'hover:border-border-strong md:hover:scale-[1.01]',
        'focus-within:shadow-[var(--sh-glow)] motion-reduce:transition-none motion-reduce:hover:scale-100',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-1.5">
          <p className="font-display font-bold text-[14px] tracking-[-0.01em] text-text">{title}</p>
          {hint && <InfoTip content={hint} aria-label={hintLabel} side="top" />}
        </div>
        {icon && <Icon name={icon} size={20} className="text-text-ter" />}
      </div>

      {isLoading ? (
        <Skeleton height="28px" width="66%" />
      ) : (
        <p className="font-display font-[800] text-[22px] sm:text-[28px] leading-none tracking-[-0.02em] text-text [font-feature-settings:'tnum','lnum']">
          {renderValue(value, format)}
        </p>
      )}

      {!isLoading && (trend ?? href) ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          {trend && <TrendBadge {...trend} />}
          {href && (
            <a
              href={href}
              className="text-[13px] font-semibold text-text border-b border-accent pb-px hover:bg-accent hover:text-accent-ink hover:px-1.5 hover:py-0.5 hover:border-0 hover:rounded-sm transition-all duration-[150ms]"
            >
              {detailLabel}
            </a>
          )}
        </div>
      ) : null}
    </div>
  )
}
