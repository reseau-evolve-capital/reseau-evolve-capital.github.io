'use client'

// Donut « Par catégorie » de la console feedbacks (NET-019). SVG pur (pas de dépendance chart) :
// déterministe SSR, tokens dataviz uniquement (jamais de rouge brand, jamais de hex en dur via le
// style inline → on passe par les variables CSS du design-system). a11y : role="img" + aria-label
// descriptif (les segments décoratifs sont aria-hidden) + légende textuelle lisible.

import { formatPct } from '@evolve/utils'

export interface CategoryDatum {
  /** Libellé déjà résolu (i18n) — ex. « UX », « Données », « Autre ». */
  label: string
  count: number
}

// Palette dataviz (tokens CSS) — neutre, jamais le rouge brand pour une catégorie.
const PALETTE = [
  'var(--color-brand-yellow)',
  'var(--color-data-positive)',
  'var(--color-data-warning)',
  'var(--color-brand-orange)',
  'var(--color-accent)',
  'var(--color-data-neutral)',
]

const SIZE = 160
const STROKE = 26
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

export function CategoryDonut({
  data,
  ariaLabelPrefix = 'Retours par catégorie : ',
  legendLabel = 'Légende des catégories',
  totalLabel = 'retours',
}: {
  data: CategoryDatum[]
  ariaLabelPrefix?: string
  legendLabel?: string
  totalLabel?: string
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null

  // Pré-calcul des arcs (offset cumulatif via préfixe immuable — pas de mutation après render).
  const fractions = data.map((d) => d.count / total)
  // prefix[i] = somme des fractions AVANT le segment i (offset de départ de l'arc).
  const prefix = fractions.reduce<number[]>((acc, f, i) => {
    acc.push(i === 0 ? 0 : (acc[i - 1] as number) + (fractions[i - 1] as number))
    return acc
  }, [])
  const segments = data.map((d, i) => {
    const fraction = fractions[i] as number
    const dash = fraction * CIRC
    return {
      color: PALETTE[i % PALETTE.length] as string,
      dash,
      offset: -(prefix[i] as number) * CIRC,
      fraction,
      label: d.label,
      count: d.count,
    }
  })

  const ariaLabel =
    ariaLabelPrefix +
    segments.map((s) => `${s.label} ${formatPct(s.fraction, { showSign: false })}`).join(', ')

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="relative shrink-0"
        style={{ width: SIZE, height: SIZE }}
        role="img"
        aria-label={ariaLabel}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className="-rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-card-sub)"
            strokeWidth={STROKE}
          />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </svg>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <span className="font-display text-[22px] font-bold text-text [font-feature-settings:'tnum']">
            {total}
          </span>
          <span className="text-[12px] text-text-ter">{totalLabel}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5" aria-label={legendLabel}>
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[13px] text-text-sec">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 truncate">{s.label}</span>
            <span className="ml-auto font-semibold text-text [font-feature-settings:'tnum']">
              {s.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
