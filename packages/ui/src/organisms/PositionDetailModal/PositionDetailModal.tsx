'use client'

// Modale détail d'une position (PFT — Task 6).
// Bottom-sheet slide-up 320ms en motion-safe ; instantané pour prefers-reduced-motion.
// Radix Dialog : focus-trap, Escape et a11y (Title + Description requis).
// Réf : HeroDetailDialog.tsx, CLAUDE.md (a11y AA, copy FR, zéro hex en dur).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { formatEUR, formatPct } from '@evolve/utils'
import type { PortfolioPosition } from '@evolve/types'

import { Badge } from '../../atoms/Badge'
import { cn } from '../../lib/cn'

/** Libellés des statistiques de la modale + a11y. Défauts FR byte-exacts. */
export interface PositionDetailModalLabels {
  quantity?: string
  pru?: string
  livePrice?: string
  currentValue?: string
  gainLossEur?: string
  gainLossPct?: string
  allocationPct?: string
  /** aria-label du bouton fermer. */
  close?: string
}

const DEFAULT_LABELS: Required<PositionDetailModalLabels> = {
  quantity: 'Quantité',
  pru: 'PRU',
  livePrice: 'Cours',
  currentValue: 'Valeur totale',
  gainLossEur: '+/- €',
  gainLossPct: '+/- %',
  allocationPct: '% du portefeuille',
  close: 'Fermer',
}

export interface PositionDetailModalProps {
  position: PortfolioPosition | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: PositionDetailModalLabels
}

/** Ligne de statistique : label discret + valeur en chiffres tabulaires. */
function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[12px] text-text-ter mb-1">{label}</p>
      <p
        className={cn(
          "font-display font-bold text-[16px] text-text [font-feature-settings:'tnum']",
          className
        )}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * Modale détail d'une position (Radix Dialog + motion-safe CSS).
 * Affiche les stats clés : quantité, PRU, cours live, valeur totale, +/- € et %, % du portefeuille.
 * Aucune sparkline en V0 (pas d'historique par position).
 */
export function PositionDetailModal({
  position,
  open,
  onOpenChange,
  labels,
}: PositionDetailModalProps) {
  const t = { ...DEFAULT_LABELS, ...labels }
  // Calcul sûr même quand position est null (Dialog.Root doit toujours être rendu).
  const isLoss = position ? position.gainLossPct < 0 : false
  const perfColor = isLoss ? 'text-data-negative' : 'text-data-positive'

  return (
    <Dialog.Root open={open && position !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[16px] bg-card p-6',
            'md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[16px]',
            'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-[320ms]',
            'focus:outline-none max-h-[90vh] overflow-y-auto'
          )}
        >
          {position && (
            <>
              {/* En-tête : nom, symbole, badge catégorie */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Dialog.Title className="font-display font-bold text-[18px] text-text">
                    {position.name}
                  </Dialog.Title>
                  <Dialog.Description className="text-[13px] text-text-ter mt-0.5">
                    {position.symbol}
                  </Dialog.Description>
                </div>
                {position.category && <Badge>{position.category}</Badge>}
              </div>

              {/* Grille de stats — sector non affiché en V0 (catégorie via Badge suffit pour la modale). */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-5">
                <Stat label={t.quantity} value={String(position.quantity)} />
                <Stat label={t.pru} value={position.pru == null ? '—' : formatEUR(position.pru)} />
                <Stat
                  label={t.livePrice}
                  value={position.livePrice == null ? '—' : formatEUR(position.livePrice)}
                />
                <Stat label={t.currentValue} value={formatEUR(position.currentValue)} />
                <Stat
                  label={t.gainLossEur}
                  value={formatEUR(position.gainLossEur)}
                  className={perfColor}
                />
                <Stat
                  label={t.gainLossPct}
                  value={formatPct(position.gainLossPct)}
                  className={perfColor}
                />
                <Stat
                  label={t.allocationPct}
                  value={formatPct(position.allocationPct, { showSign: false })}
                />
              </div>

              {/* Bouton fermer — min 44×44px, focus-visible glow token */}
              <Dialog.Close
                aria-label={t.close}
                className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none rounded-md"
              >
                ✕
              </Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
