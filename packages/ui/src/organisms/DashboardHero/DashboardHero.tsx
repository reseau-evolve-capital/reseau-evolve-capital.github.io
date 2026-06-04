'use client'
import * as React from 'react'
import { formatRelativeTime, formatEUR } from '@evolve/utils'
import { CurrencyAmount } from '../../molecules/CurrencyAmount'
import { TrendBadge, type TrendBadgeProps } from '../../molecules/TrendBadge'
import { SparklineMini } from '../../molecules/SparklineMini'
import { Skeleton } from '../../atoms/Skeleton'
import { cn } from '../../lib/cn'

export interface DashboardHeroProps {
  netMarketValue: number
  syncedAt?: Date | string | null
  /** V0 : non passé (pas de source historique). Le composant le supporte en V1+. */
  variation?: TrendBadgeProps
  /** V0 : non passé (pas de source historique). Le composant le supporte en V1+. */
  historicalData?: number[]
  isLoading?: boolean
  onClick?: () => void
  className?: string
  /** Libellé du hero. Défaut FR. */
  label?: string
  /** Suffixe a11y ajouté au nom accessible quand le hero est cliquable. Défaut FR. */
  detailLabel?: string
  /** Gabarit du nom accessible : reçoit le montant déjà formaté (NBSP fr-FR). Défaut FR. */
  accessibleNameTemplate?: (formattedAmount: string) => string
  /** Gabarit du texte « mis à jour » : reçoit le temps relatif déjà formaté. Défaut FR. */
  syncedAtTemplate?: (relativeTime: string) => string
}

export function DashboardHero({
  netMarketValue,
  syncedAt,
  variation,
  historicalData,
  isLoading = false,
  onClick,
  className,
  label = 'Ta quote-part',
  detailLabel = ', voir le détail',
  accessibleNameTemplate = (formattedAmount) => `Ta quote-part : ${formattedAmount}`,
  syncedAtTemplate = (relativeTime) => `Mis à jour ${relativeTime}`,
}: DashboardHeroProps) {
  if (isLoading) {
    return <Skeleton height={128} radius="14px" className={cn(className)} />
  }

  const Wrapper: React.ElementType = onClick ? 'button' : 'div'
  // Nom accessible CONCIS et formaté FR (sinon le bouton concatène tout son contenu —
  // libellé + montant brut + « mis à jour » — ce qui est verbeux et lit « 12345.67 »).
  const baseAccessibleName = accessibleNameTemplate(formatEUR(netMarketValue))
  const accessibleName = `${baseAccessibleName}${onClick ? detailLabel : ''}`

  return (
    <>
      <Wrapper
        {...(onClick ? { onClick, type: 'button' as const, 'aria-label': accessibleName } : {})}
        className={cn(
          'w-full text-left bg-card border border-border rounded-[14px] shadow-[var(--sh-card)] p-6',
          'flex flex-col gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[220ms]',
          onClick && 'focus-visible:shadow-[var(--sh-glow)] outline-none cursor-pointer',
          className
        )}
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-sec">
          {label}
        </p>
        <CurrencyAmount amount={netMarketValue} size="xl" className="mt-2" />
        {variation && (
          <div className="mt-1">
            <TrendBadge {...variation} />
          </div>
        )}
        {syncedAt && (
          <p className="mt-1 text-[12px] text-text-ter">
            {syncedAtTemplate(formatRelativeTime(syncedAt))}
          </p>
        )}
        {historicalData && historicalData.length >= 2 && (
          <SparklineMini data={historicalData} className="mt-3" />
        )}
      </Wrapper>
      {/* Région live HORS du bouton : annonce la valeur (formatée) sans alourdir le nom du bouton. */}
      <span aria-live="polite" className="sr-only">
        {baseAccessibleName}
      </span>
    </>
  )
}
