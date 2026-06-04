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
}

export function DashboardHero({
  netMarketValue,
  syncedAt,
  variation,
  historicalData,
  isLoading = false,
  onClick,
  className,
}: DashboardHeroProps) {
  if (isLoading) {
    return <Skeleton height={128} radius="14px" className={cn(className)} />
  }

  const Wrapper: React.ElementType = onClick ? 'button' : 'div'
  // Nom accessible CONCIS et formaté FR (sinon le bouton concatène tout son contenu —
  // libellé + montant brut + « mis à jour » — ce qui est verbeux et lit « 12345.67 »).
  const accessibleName = `Ta quote-part : ${formatEUR(netMarketValue)}${onClick ? ', voir le détail' : ''}`

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
          Ta quote-part
        </p>
        <CurrencyAmount amount={netMarketValue} size="xl" className="mt-2" />
        {variation && (
          <div className="mt-1">
            <TrendBadge {...variation} />
          </div>
        )}
        {syncedAt && (
          <p className="mt-1 text-[12px] text-text-ter">
            Mis à jour {formatRelativeTime(syncedAt)}
          </p>
        )}
        {historicalData && historicalData.length >= 2 && (
          <SparklineMini data={historicalData} className="mt-3" />
        )}
      </Wrapper>
      {/* Région live HORS du bouton : annonce la valeur (formatée) sans alourdir le nom du bouton. */}
      <span aria-live="polite" className="sr-only">
        {`Ta quote-part : ${formatEUR(netMarketValue)}`}
      </span>
    </>
  )
}
