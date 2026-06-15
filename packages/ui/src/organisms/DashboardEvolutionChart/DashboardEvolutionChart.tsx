'use client'
import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { SegmentedToggle } from '../../molecules/SegmentedToggle'
import { cn } from '../../lib/cn'

export type EvolutionPeriod = '7d' | '30d' | '90d' | '1y' | 'max'

export interface EvolutionPoint {
  /** Date ISO (informative — la courbe est tracée à index régulier, comme la réf). */
  date: string
  value: number
}

export interface DashboardEvolutionChartProps {
  points: EvolutionPoint[]
  period: EvolutionPeriod
  onPeriodChange: (p: EvolutionPeriod) => void
  periods: Array<{ value: EvolutionPeriod; label: string; mobileHidden?: boolean }>
  /** Variation formatée par l'appelant (ex. « +2 854 € »). */
  summaryValue: string
  /** Sous-valeur formatée (ex. « (+4,55 %) »). */
  summarySub: string
  /** Suffixe optionnel (ex. « depuis ton adhésion » pour MAX). */
  summarySuffix?: string
  /** Titre du bloc (ex. « Évolution » / « Évolution · 30 jours »). */
  title: string
  axisStart: string
  axisEnd: string
  /** Label central de l'axe (rendu en `large` uniquement). */
  axisCenter?: string
  /** Graphe 100px (compact) ou 200px (large). Défaut compact. */
  size?: 'compact' | 'large'
  /** up → var(--data-positive), down → var(--data-negative). Défaut 'up'. */
  direction?: 'up' | 'down'
  /** Micro-label discret (ex. « Courbe illustrative ») si fourni. */
  demoLabel?: string
  /** Nom accessible du groupe de périodes (i18n). Défaut FR. */
  periodGroupLabel?: string
  /** Slot info accolé au titre (ex. un `<InfoTip>` explicatif fourni par l'app).
   *  Présentationnel — pas de défaut FR. */
  info?: React.ReactNode
  className?: string
}

/** Props que Recharts passe au renderer de `dot` (sous-ensemble utile). */
interface DotRendererProps {
  cx?: number
  cy?: number
  index?: number
}

/**
 * Carte « Évolution » du dashboard V2 — courbe de tendance (Recharts AreaChart sans
 * axes, labels de dates en flex comme la réf) + toggle de périodes en pill.
 * Présentationnel : tout le copy (titre, résumé, labels) est injecté, déjà formaté.
 */
export function DashboardEvolutionChart({
  points,
  period,
  onPeriodChange,
  periods,
  summaryValue,
  summarySub,
  summarySuffix,
  title,
  axisStart,
  axisEnd,
  axisCenter,
  size = 'compact',
  direction = 'up',
  demoLabel,
  periodGroupLabel = 'Période',
  info,
  className,
}: DashboardEvolutionChartProps) {
  const gradientId = React.useId()
  const isLarge = size === 'large'
  const color = direction === 'down' ? 'var(--data-negative)' : 'var(--data-positive)'

  // Jamais de NaN à l'écran : seuls les points finis sont tracés.
  const chartData = points
    .filter((p) => typeof p.value === 'number' && isFinite(p.value))
    .map((p, i) => ({ i, value: p.value }))
  const hasCurve = chartData.length >= 2
  const lastIndex = chartData.length - 1
  const chartHeight = isLarge ? 200 : 100

  const reduced =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)

  // Point final : disque plein r=3.5 + halo r=7 — les autres index ne rendent rien.
  const renderLastDot = (props: DotRendererProps): React.JSX.Element => {
    const { cx, cy, index } = props
    if (index !== lastIndex || cx == null || cy == null) {
      return <g key={`pt-${index ?? 'none'}`} />
    }
    return (
      <g key={`pt-${index}`}>
        <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.18} />
        <circle cx={cx} cy={cy} r={3.5} fill={color} />
      </g>
    )
  }

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-[10px] shadow-[var(--sh-card)]',
        isLarge ? 'px-7 pt-6 pb-5' : 'px-4 py-3',
        className
      )}
    >
      {/* Header : titre (+ slot info optionnel) + toggle de périodes, sur une seule ligne.
          La troncature vit sur le <span> intérieur : un overflow sur le conteneur clipperait
          la zone de hit 44px du déclencheur InfoTip. */}
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            'flex min-w-0 items-center gap-1 uppercase',
            isLarge
              ? 'font-body text-[12px] font-semibold tracking-[0.06em] text-text-sec'
              : 'font-mono text-[10px] tracking-[0.10em] text-text-ter'
          )}
        >
          <span className="truncate">{title}</span>
          {info}
        </p>
        {/* Toggle de périodes — composant partagé SegmentedToggle (même markup/a11y que la réf).
            Les `value` typées EvolutionPeriod transitent en `string` puis sont re-typées au retour. */}
        <SegmentedToggle
          ariaLabel={periodGroupLabel}
          value={period}
          options={periods}
          onChange={(v) => onPeriodChange(v as EvolutionPeriod)}
        />
      </div>

      {/* Résumé de la période */}
      <p className="mt-[5px] mb-2 flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            'font-display font-bold tabular-nums text-text',
            isLarge ? 'text-[18px]' : 'text-[15px]'
          )}
        >
          {summaryValue}
        </span>
        <span className={cn('font-medium text-text-sec', isLarge ? 'text-[14px]' : 'text-[12px]')}>
          {summarySub}
        </span>
        {summarySuffix ? (
          <span className={cn('text-text-sec', isLarge ? 'text-[14px]' : 'text-[12px]')}>
            {summarySuffix}
          </span>
        ) : null}
      </p>

      {/* Graphe — décoratif (le résumé textuel porte l'information).
          height en nombre fixe (pas "100%") : tant qu'une dimension calculée est > 0,
          Recharts ne logge pas « width(0) and height(0) … greater than 0 » quand le
          conteneur mesure 0×0 au premier layout/hydratation (ARB-04). */}
      {hasCurve ? (
        <div style={{ height: chartHeight }} aria-hidden="true">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 2, left: 8 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={!reduced}
                dot={renderLastDot}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          style={{ height: chartHeight }}
          className="flex items-center justify-center text-text-ter"
        >
          —
        </div>
      )}

      {/* Axe de dates (labels flex, pas de vrais axes — comme la réf) */}
      <div className="mt-[7px] flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.05em] text-text-ter">
        <span>{axisStart}</span>
        {isLarge && axisCenter ? <span>{axisCenter}</span> : null}
        <span>{axisEnd}</span>
      </div>

      {demoLabel ? (
        <p className="mt-1 text-right font-mono text-[10px] tracking-[0.05em] text-text-ter">
          {demoLabel}
        </p>
      ) : null}
    </div>
  )
}
