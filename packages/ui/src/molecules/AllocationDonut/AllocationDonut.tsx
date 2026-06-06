'use client'
import * as React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { formatEUR, formatPct } from '@evolve/utils'
import { type AllocationItem, OTHER_SECTOR_LABEL } from '@evolve/types'
import { cn } from '../../lib/cn'

export interface AllocationDonutProps {
  data: AllocationItem[]
  totalValue: number
  className?: string
  /** Libellé sous la valeur totale (centre du donut). Défaut FR. */
  totalLabel?: string
  /** Préfixe de l'aria-label du graphique. Défaut FR. */
  ariaLabelPrefix?: string
  /** Libellé a11y de la légende. Défaut FR. */
  legendLabel?: string
}

// Palette de secteurs = tokens CSS uniquement (jamais de hex — garde CI). Assignée par index ;
// le secteur "Autres" force le token neutre pour rester lisible.
const SECTOR_PALETTE = [
  'var(--color-brand-yellow)',
  'var(--color-data-positive)',
  'var(--color-data-warning)',
  'var(--color-brand-orange)',
  'var(--color-accent)',
  'var(--color-data-neutral)',
]

function colorFor(label: string, index: number): string {
  if (label === OTHER_SECTOR_LABEL) return 'var(--color-data-neutral)'
  return SECTOR_PALETTE[index % SECTOR_PALETTE.length] as string
}

/** Donut d'allocation par secteur. Statique (pas de tooltip interactif). Tokens CSS only.
 *  Le role="img" est placé sur le div conteneur (pas sur PieChart) pour garantir
 *  la détection dans jsdom où Recharts peut wrapper différemment. */
export function AllocationDonut({
  data,
  totalValue,
  className,
  totalLabel = 'Valeur totale',
  ariaLabelPrefix = 'Allocation du portefeuille : ',
  legendLabel = "Légende de l'allocation",
}: AllocationDonutProps) {
  if (!Array.isArray(data) || data.length === 0) return null

  const ariaLabel =
    ariaLabelPrefix +
    data.map((d) => `${d.label} ${formatPct(d.percentage, { showSign: false })}`).join(', ')

  return (
    <div className={cn('w-full flex flex-col items-center', className)}>
      {/* role="img" sur le conteneur pour compatibilité jsdom/Recharts */}
      <div className="relative w-full" style={{ height: 260 }} role="img" aria-label={ariaLabel}>
        {/* Recharts assigne role="img" à chaque <path> de secteur → masqué aux AT :
            l'aria-label du conteneur porte déjà la description complète (svg-img-alt). */}
        <div className="h-full w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart data-testid="allocation-donut">
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={2}
                isAnimationActive={false}
                // Donut décoratif (aria-hidden) → on retire le <g> focusable de Recharts
                // (rootTabIndex=0 par défaut), sinon « aria-hidden-focus ».
                rootTabIndex={-1}
              >
                {data.map((d, i) => (
                  <Cell key={d.label} fill={colorFor(d.label, i)} stroke="var(--color-card)" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <span className="font-display font-bold text-[18px] text-text [font-feature-settings:'tnum']">
            {formatEUR(totalValue)}
          </span>
          <span className="text-[12px] text-text-ter">{totalLabel}</span>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label={legendLabel}>
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-[13px] text-text-sec">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorFor(d.label, i) }}
              aria-hidden="true"
            />
            <span>{d.label}</span>
            <span className="font-semibold text-text [font-feature-settings:'tnum']">
              {formatPct(d.percentage, { showSign: false })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
