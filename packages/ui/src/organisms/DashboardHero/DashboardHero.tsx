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
  /** Met le bloc en avant (bordure accent), comme « valeur nette détenue » des cotisations. */
  highlight?: boolean
  /** `card` (défaut) = rendu carte actuel. `open` = hero V2 sans carte, montant display géant. */
  appearance?: 'card' | 'open'
  /** Méta affichée à côté du TrendBadge (ex. « hier · 10.06 »). Rendue si `variation` présent. */
  variationMeta?: string
  /** Slot info accolé au TrendBadge de variation (ex. un `<InfoTip>` explicatif fourni par
   *  l'app). Présentationnel — rendu uniquement si `variation` présent. Pas de défaut FR. */
  variationInfo?: React.ReactNode
  /** Slot rendu sous la ligne de variation (ex. lien « Comprendre… » fourni par l'app). */
  action?: React.ReactNode
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
  highlight = false,
  appearance = 'card',
  variationMeta,
  variationInfo,
  action,
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
  const isOpen = appearance === 'open'
  // Nom accessible CONCIS et formaté FR (sinon le bouton concatène tout son contenu —
  // libellé + montant brut + « mis à jour » — ce qui est verbeux et lit « 12345.67 »).
  const baseAccessibleName = accessibleNameTemplate(formatEUR(netMarketValue))
  const accessibleName = `${baseAccessibleName}${onClick ? detailLabel : ''}`

  return (
    <>
      <Wrapper
        {...(onClick ? { onClick, type: 'button' as const, 'aria-label': accessibleName } : {})}
        className={cn(
          'w-full text-left',
          // `open` (V2) : pas de chrome de carte — le hero vit directement sur la page.
          !isOpen && 'bg-card rounded-[14px] shadow-[var(--sh-card)] p-6',
          !isOpen && (highlight ? 'border-2 border-accent' : 'border border-border'),
          'flex flex-col gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[220ms]',
          onClick && 'focus-visible:shadow-[var(--sh-glow)] outline-none cursor-pointer',
          className
        )}
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-sec">
          {label}
        </p>
        <CurrencyAmount
          amount={netMarketValue}
          size="xl"
          className={cn(
            'mt-2',
            // Montant display géant V2 — surcharge le gabarit `xl` (le cn() de
            // CurrencyAmount merge la className en dernier, vérifié).
            isOpen &&
              'text-[58px] sm:text-[58px] md:text-[88px] leading-[0.95] tracking-[-0.035em] md:tracking-[-0.045em]'
          )}
        />
        {variation && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TrendBadge {...variation} />
            {variationMeta ? (
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-text-ter">
                {variationMeta}
              </span>
            ) : null}
            {/* Slot info (InfoTip injecté par l'app) — explique la variation affichée.
                Rendu UNIQUEMENT quand le hero n'est pas lui-même un <button> (onClick) :
                un interactif imbriqué dans un <button> est invalide en HTML/a11y. L'app
                câble donc l'info sur l'instance desktop (div + action), pas le hero mobile. */}
            {!onClick ? variationInfo : null}
          </div>
        )}
        {action ? <div className="mt-1">{action}</div> : null}
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
