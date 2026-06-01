import * as React from 'react'
import { CotisationMonth, type CotisationVariant } from '../../molecules/CotisationMonth'
import { EmptyState } from '../../molecules/EmptyState'
import { Skeleton } from '../../atoms/Skeleton'
import { cn } from '../../lib/cn'

/** Une cellule de mois prête au rendu (présentationnel, déjà mappé côté apps/web). */
export interface TimelineMonth {
  /** 1-12 */
  month: number
  variant: CotisationVariant
  /** Contenu riche du Popover (ex: « Mars 2025 — payé 100 € le 05/03/2025 »). */
  tooltip: string
  /** Libellé lecteur d'écran (ex: « Mars 2025, payé 100 euros le 5 mars »). */
  ariaLabel: string
}

/** Un groupe annuel, déjà trié (mois décroissants au sein de l'année). */
export interface TimelineYear {
  year: number
  months: TimelineMonth[]
}

export interface ContributionsTimelineProps {
  /** Années déjà triées (plus récente en premier). */
  years: TimelineYear[]
  isLoading?: boolean
  className?: string
}

/** Initiales de mois (1-12 → index 0-11). Présentationnel, FR. */
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const

/** Déplace le focus entre les cellules via les flèches (roving focus DOM, sans toucher CotisationMonth). */
function handleArrowNav(e: React.KeyboardEvent<HTMLDivElement>): void {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']
  if (!keys.includes(e.key)) return
  const container = e.currentTarget
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
  if (buttons.length === 0) return
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
  const next = current < 0 ? 0 : current + (forward ? 1 : -1)
  const clamped = Math.max(0, Math.min(buttons.length - 1, next))
  buttons[clamped]?.focus()
  e.preventDefault()
}

export function ContributionsTimeline({
  years,
  isLoading = false,
  className,
}: ContributionsTimelineProps) {
  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-6', className)} aria-busy="true">
        {[0, 1].map((y) => (
          <div key={y} className="flex flex-col gap-2">
            <Skeleton height={16} width="64px" radius="6px" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} height={24} width={24} radius="4px" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (years.length === 0) {
    return (
      <EmptyState
        icon="Calendar"
        title="Aucune cotisation pour l'instant"
        description="Ta première cotisation apparaîtra ici."
        className={className}
      />
    )
  }

  return (
    <div
      role="list"
      aria-label="Historique des cotisations"
      className={cn('flex flex-col gap-6', className)}
      onKeyDown={handleArrowNav}
    >
      {years.map((group) => (
        <div key={group.year} role="listitem" className="flex flex-col gap-2">
          <h3 className="sticky top-0 z-10 bg-bg py-1 font-display font-bold text-[14px] text-text">
            {group.year}
          </h3>
          <div className="flex flex-wrap gap-2">
            {group.months.map((m) => (
              <div key={`${group.year}-${m.month}`} className="flex flex-col items-center gap-1">
                <CotisationMonth
                  variant={m.variant}
                  tooltip={m.tooltip}
                  aria-label={m.ariaLabel}
                  size="md"
                />
                <span aria-hidden="true" className="text-[10px] leading-none text-text-ter">
                  {MONTH_INITIALS[m.month - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
