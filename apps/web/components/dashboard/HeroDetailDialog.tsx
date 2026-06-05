'use client'

// Modale détail Hero (DSH-009) — bottom-sheet expliquant la quote-part du membre.
// Slide-up 320ms en motion-safe ; instantané pour prefers-reduced-motion.
// Radix Dialog fournit focus-trap, Escape et l'a11y (Title + Description requis).
// Réf : DSH-009, CLAUDE.md (a11y AA, copy FR, zéro hex en dur).

import * as React from 'react'

import Link from 'next/link'

import { useTranslations, useLocale } from 'next-intl'

import * as Dialog from '@radix-ui/react-dialog'

import { CurrencyAmount } from '@evolve/ui'
import { formatRelativeTime, formatPct } from '@evolve/utils'

export interface HeroDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  netMarketValue: number
  /** Fraction 0..1 — formatée via formatPct. */
  detentionPct: number
  clubName: string
  syncedAt: string | null
}

export function HeroDetailDialog({
  open,
  onOpenChange,
  netMarketValue,
  detentionPct,
  clubName,
  syncedAt,
}: HeroDetailDialogProps) {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          className="fixed z-50 inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[16px] bg-card p-6
                     motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-[320ms]
                     focus:outline-none"
        >
          <Dialog.Title className="font-display font-bold text-[16px] text-text">
            {t('detail.title')}
          </Dialog.Title>
          <Dialog.Description className="text-[14px] text-text-sec mt-1">
            {t('detail.description', {
              pct: formatPct(detentionPct, { showSign: false }),
              clubName,
            })}
          </Dialog.Description>
          <div className="mt-4">
            <CurrencyAmount amount={netMarketValue} size="lg" />
          </div>
          {syncedAt && (
            <p className="mt-2 text-[12px] text-text-ter">
              {t('detail.lastSync', { time: formatRelativeTime(syncedAt, undefined, locale) })}
            </p>
          )}
          <Link
            href="/portfolio"
            className="mt-4 inline-block text-[14px] font-semibold text-brand-yellow"
          >
            {t('detail.viewPortfolio')}
          </Link>
          <Dialog.Close
            aria-label={tCommon('close')}
            className="absolute top-4 right-4 min-h-[44px] min-w-[44px] text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none rounded-md"
          >
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
