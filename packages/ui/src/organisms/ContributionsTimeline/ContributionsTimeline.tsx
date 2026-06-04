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

export interface ContributionsTimelineProps {
  /** Années déjà triées (plus récente en premier). */
  years: TimelineYear[]
  isLoading?: boolean
  className?: string
}

/** Initiales de mois (1-12 → index 0-11). Présentationnel, FR. */
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const

/** Légende de la timeline. Chaque entrée réutilise EXACTEMENT les classes de
 *  CotisationMonth (variantClasses) pour que la légende soit véridique. L'entrée
 *  « À venir » décrit le rendu des mois futurs (absents en DB → non rendus). */
const LEGEND: ReadonlyArray<{ label: string; swatch: string }> = [
  // paid : jaune Evolve plein (cf. CotisationMonth — surtout pas le vert data-positive).
  { label: 'Payé', swatch: 'bg-brand-yellow' },
  // pending : mois courant en attente.
  { label: 'En cours', swatch: 'bg-data-neutral-50' },
  // late : retard (data-warning, jamais le rouge brand).
  { label: 'Retard', swatch: 'bg-data-warning-50' },
  // exempt : dispensé de cotisation.
  { label: 'Exempté', swatch: 'bg-neutral-100 opacity-50' },
  // À venir : mois futurs, non rendus dans la grille → swatch « vide » bordé.
  { label: 'À venir', swatch: 'border border-dashed border-border bg-transparent' },
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
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Légende : pastille décorative (aria-hidden) + libellé lisible (jamais la couleur seule). */}
      <ul aria-label="Légende des statuts" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn('h-3 w-3 rounded-sm', item.swatch)} />
            <span className="text-[12px] leading-none text-text-sec">{item.label}</span>
          </li>
        ))}
      </ul>

      <div
        role="list"
        aria-label="Historique des cotisations"
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
                      {MONTH_INITIALS[m.month - 1]}
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
