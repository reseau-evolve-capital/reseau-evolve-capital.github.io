'use client'

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

/** Un groupe annuel. L'ordre des mois en entrée est libre : le rendu réordonne
 *  toujours en ascendant (janvier → décembre) pour coller à la réf desktop. */
export interface TimelineYear {
  year: number
  months: TimelineMonth[]
}

/** Clés des entrées de légende, dans l'ordre d'affichage. */
type LegendKey = 'paid' | 'pending' | 'late' | 'exempt' | 'upcoming'

/** Toutes les chaînes user-facing/a11y de la timeline. Défauts FR byte-exacts. */
export interface ContributionsTimelineLabels {
  /** Libellés des entrées de légende. */
  legend?: Partial<Record<LegendKey, string>>
  /** Initiales des mois (12 entrées, janvier → décembre). */
  monthInitials?: readonly string[]
  /** aria-label de la légende. */
  legendLabel?: string
  /** aria-label de la liste annuelle. */
  historyLabel?: string
  /** Titre de l'état vide. */
  emptyTitle?: string
  /** Description de l'état vide. */
  emptyDescription?: string
}

export interface ContributionsTimelineProps {
  /** Années déjà triées (plus récente en premier). */
  years: TimelineYear[]
  isLoading?: boolean
  className?: string
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: ContributionsTimelineLabels
}

/** Initiales de mois (1-12 → index 0-11). Présentationnel, FR. */
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const

/** Libellés FR par défaut des entrées de légende. */
const DEFAULT_LEGEND_LABELS: Record<LegendKey, string> = {
  paid: 'Payé',
  pending: 'En cours',
  late: 'Retard',
  exempt: 'Exempté',
  upcoming: 'À venir',
}

const DEFAULT_LEGEND_LABEL = 'Légende des statuts'
const DEFAULT_HISTORY_LABEL = 'Historique des cotisations'
const DEFAULT_EMPTY_TITLE = "Aucune cotisation pour l'instant"
const DEFAULT_EMPTY_DESCRIPTION = 'Ta première cotisation apparaîtra ici.'

/** Pastilles de légende (classes CotisationMonth). Le libellé est résolu à l'usage
 *  via les défauts FR + overrides i18n. L'entrée « upcoming » décrit le rendu des
 *  mois futurs (absents en DB → non rendus). */
const LEGEND_SWATCHES: ReadonlyArray<{ key: LegendKey; swatch: string }> = [
  // paid : jaune Evolve plein (cf. CotisationMonth — surtout pas le vert data-positive).
  { key: 'paid', swatch: 'bg-brand-yellow' },
  // pending : mois courant en attente.
  { key: 'pending', swatch: 'bg-data-neutral-50' },
  // late : retard (ROUGE dataviz data-negative, jamais le rouge brand #E93E3A).
  { key: 'late', swatch: 'bg-data-negative-50' },
  // exempt : dispensé de cotisation.
  { key: 'exempt', swatch: 'bg-neutral-100 opacity-50' },
  // À venir : mois futurs, non rendus dans la grille → swatch « vide » bordé.
  { key: 'upcoming', swatch: 'border border-dashed border-border bg-transparent' },
] as const

/** Déplace le focus entre les cellules via les flèches (roving focus DOM, sans toucher CotisationMonth). */
function handleArrowNav(e: React.KeyboardEvent<HTMLDivElement>): void {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']
  if (!keys.includes(e.key)) return
  const container = e.currentTarget
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
  if (buttons.length === 0) return
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
  const next = current < 0 ? (forward ? 0 : buttons.length - 1) : current + (forward ? 1 : -1)
  const clamped = Math.max(0, Math.min(buttons.length - 1, next))
  buttons[clamped]?.focus()
  e.preventDefault()
}

export function ContributionsTimeline({
  years,
  isLoading = false,
  className,
  labels,
}: ContributionsTimelineProps) {
  const legendLabels = { ...DEFAULT_LEGEND_LABELS, ...labels?.legend }
  const monthInitials = labels?.monthInitials ?? MONTH_INITIALS
  const legendLabel = labels?.legendLabel ?? DEFAULT_LEGEND_LABEL
  const historyLabel = labels?.historyLabel ?? DEFAULT_HISTORY_LABEL

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
        title={labels?.emptyTitle ?? DEFAULT_EMPTY_TITLE}
        description={labels?.emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
        className={className}
      />
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Légende : pastille décorative (aria-hidden) + libellé lisible (jamais la couleur seule). */}
      <ul aria-label={legendLabel} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {LEGEND_SWATCHES.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('h-3 w-3 rounded-sm', item.swatch)} />
            <span className="text-[12px] leading-none text-text-sec">{legendLabels[item.key]}</span>
          </li>
        ))}
      </ul>

      <div
        role="list"
        aria-label={historyLabel}
        className="flex flex-col gap-6"
        onKeyDown={handleArrowNav}
      >
        {years.map((group) => (
          <div key={group.year} role="listitem" className="flex flex-col gap-2">
            <h3 className="sticky top-0 z-10 bg-bg py-1 font-display font-bold text-[14px] text-text">
              {group.year}
            </h3>
            <div className="flex flex-wrap gap-2">
              {/* Ordre d'affichage ASCENDANT (janvier → décembre), quel que soit l'ordre
                  d'entrée. On trie une COPIE (pas de mutation de la prop). Le mapping
                  mois→statut/tooltip/aria-label suit chaque cellule par sa clé `month`. */}
              {[...group.months]
                .sort((a, b) => a.month - b.month)
                .map((m) => (
                  <div
                    key={`${group.year}-${m.month}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <CotisationMonth
                      variant={m.variant}
                      tooltip={m.tooltip}
                      aria-label={m.ariaLabel}
                      size="md"
                    />
                    <span aria-hidden="true" className="text-[10px] leading-none text-text-ter">
                      {monthInitials[m.month - 1]}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
