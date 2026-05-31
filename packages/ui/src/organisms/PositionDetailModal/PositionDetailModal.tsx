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

export interface PositionDetailModalProps {
  position: PortfolioPosition | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
export function PositionDetailModal({ position, open, onOpenChange }: PositionDetailModalProps) {
  if (!position) return null

  const isLoss = position.gainLossPct < 0
  const perfColor = isLoss ? 'text-data-negative' : 'text-data-positive'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[16px] bg-card p-6',
            'md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[16px]',
            'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-[320ms]',
            'focus:outline-none max-h-[90vh] overflow-y-auto'
          )}
        >
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

          {/* Grille de stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-5">
            <Stat label="Quantité" value={String(position.quantity)} />
            <Stat label="PRU" value={position.pru == null ? '—' : formatEUR(position.pru)} />
            <Stat
              label="Cours"
              value={position.livePrice == null ? '—' : formatEUR(position.livePrice)}
            />
            <Stat label="Valeur totale" value={formatEUR(position.currentValue)} />
            <Stat label="+/- €" value={formatEUR(position.gainLossEur)} className={perfColor} />
            <Stat label="+/- %" value={formatPct(position.gainLossPct)} className={perfColor} />
            <Stat
              label="% du portefeuille"
              value={formatPct(position.allocationPct, { showSign: false })}
            />
          </div>

          {/* Bouton fermer — min 44×44px, focus-visible glow token */}
          <Dialog.Close
            aria-label="Fermer"
            className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none rounded-md"
          >
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
