import * as React from 'react'
import { cn } from '../../lib/cn'

export interface DashboardMetricsRibbonItem {
  /** Libellé court (ex. « Investi »). */
  label: string
  /** Valeur déjà formatée par l'appelant (ex. « 12 400 € »). */
  value: string
  /** Slot optionnel accolé au libellé (ex. un `<InfoTip>` explicatif). */
  info?: React.ReactNode
}

export interface DashboardMetricsRibbonProps {
  items: DashboardMetricsRibbonItem[]
  className?: string
}

/**
 * Ruban de métriques du dashboard V2 — une seule card, 3 cellules séparées par
 * une bordure verticale. Sémantique liste de définitions (<dl>/<dt>/<dd>).
 * Présentationnel : labels et valeurs arrivent déjà formatés (i18n côté app).
 */
export function DashboardMetricsRibbon({ items, className }: DashboardMetricsRibbonProps) {
  if (items.length === 0) return null

  return (
    <dl
      className={cn(
        'grid grid-cols-3 bg-card border border-border rounded-[10px] shadow-[var(--sh-card)]',
        className
      )}
    >
      {items.map((item, i) => (
        <div
          key={`${item.label}-${i}`}
          className={cn('min-w-0 py-3 pl-4 pr-2', i > 0 && 'border-l border-border')}
        >
          {/* La troncature vit sur le <span> : un overflow hidden sur le <dt> clipperait
              le slot info (zone de hit 44px du déclencheur InfoTip). */}
          <dt className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.10em] text-text-ter">
            <span className="truncate">{item.label}</span>
            {item.info}
          </dt>
          <dd className="whitespace-nowrap font-display text-[17px] font-bold tabular-nums text-text">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
