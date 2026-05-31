'use client'
import * as React from 'react'
import { formatRelativeTime } from '@evolve/utils'
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

  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className={cn(
        'w-full text-left bg-card border border-border rounded-[14px] shadow-[var(--sh-card)] p-6',
        'flex flex-col gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[220ms]',
        onClick && 'focus-visible:shadow-[var(--sh-glow)] outline-none cursor-pointer',
        className
      )}
    >
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-sec">
        Ta valorisation nette
      </p>
      <CurrencyAmount amount={netMarketValue} size="xl" className="mt-2" />
      <span aria-live="polite" className="sr-only">
        {`Valorisation nette : ${netMarketValue} euros`}
      </span>
      {variation && (
        <div className="mt-1">
          <TrendBadge {...variation} />
        </div>
      )}
      {syncedAt && (
        <p className="mt-1 text-[12px] text-text-ter">Mis à jour {formatRelativeTime(syncedAt)}</p>
      )}
      {historicalData && historicalData.length >= 2 && (
        <SparklineMini data={historicalData} className="mt-3" />
      )}
    </Wrapper>
  )
}
