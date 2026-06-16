'use client'

// PushOptInSheet (PUSH-001 ; spec §11) — pre-prompt d'opt-in Web Push.
//
// SELF-CONTAINED (apps/web) : construit directement sur Radix Dialog (focus-trap, Escape,
// Title + Description requis) plutôt que de réutiliser un composant @evolve/ui — pour ne pas
// muter PwaInstallSheet (qui pilote la bannière d'installation PWA en prod). Le pattern Radix
// est calqué sur FeedbackSheet : modale centrée sur scrim (desktop ~420px) / bottom-sheet
// ancré bas (mobile, grab-handle).
//
// Réf visuelle : « Notifications — Maquettes (standalone) », frames ref-push-01..06
// (pré-prompt desktop/mobile, light & dark) — bell pastille jaune, headline « Ne manquez plus
// un vote », note d'anonymat (cadenas), CTA jaune pleine largeur, « Plus tard » + lien profil.
//
// Props STABLES { open, onAccept, onDismiss } (PushOptInMount en dépend). État `busy` pendant
// requestPermission OS + subscribe + POST (la promesse onAccept peut prendre un instant).

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'

import { Icon } from '@evolve/ui'

/** Concatène des classes (aucune fusion Tailwind nécessaire ici — pas d'utilitaires en conflit). */
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export type PushOptInSheetProps = {
  open: boolean
  /** Lance requestPermission → subscribe → POST. */
  onAccept: () => void | Promise<void>
  /** « Plus tard » / fermeture (X, Escape, clic backdrop). */
  onDismiss: () => void
}

/** Spinner inline (conserve la largeur du CTA pendant le chargement). */
function CtaSpinner() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PushOptInSheet({ open, onAccept, onDismiss }: PushOptInSheetProps) {
  const t = useTranslations('push')
  const [busy, setBusy] = useState(false)

  const handleCta = () => {
    if (busy) return
    setBusy(true)
    void Promise.resolve(onAccept()).finally(() => setBusy(false))
  }

  // Toute fermeture non-CTA (X, Escape, clic backdrop) passe par onDismiss.
  const handleOpenChange = (next: boolean) => {
    if (!next) onDismiss()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          className={cn(
            'fixed z-50 bg-card shadow-[var(--sh-modal)] focus:outline-none',
            // Mobile : bottom-sheet ancré bas, coins sup. arrondis, grab-handle.
            'inset-x-0 bottom-0 w-full rounded-t-[14px] border-t border-border',
            'px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]',
            // Desktop : modale centrée ~420px, tous coins arrondis.
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[14px] sm:border sm:px-6 sm:pb-6 sm:pt-6',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[220ms]'
          )}
        >
          {/* Grab-handle mobile (décoratif). */}
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong sm:hidden"
            aria-hidden="true"
          />

          {/* En-tête : pastille cloche jaune + bouton fermer X. */}
          <div className="flex items-start justify-between gap-3">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink"
              aria-hidden="true"
            >
              <Icon name="Bell" size={20} />
            </span>
            <Dialog.Close
              aria-label={t('prePrompt.later')}
              className={cn(
                '-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
                'text-text-ter transition-colors duration-[150ms] hover:bg-card-sub hover:text-text-sec',
                'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
              )}
            >
              <Icon name="X" size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* Corps : headline + subline. */}
          <Dialog.Title className="mt-4 font-display text-[20px] font-bold leading-snug text-text">
            {t('prePrompt.headline')}
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 font-body text-[14px] font-medium leading-relaxed text-text-sec">
            {t('prePrompt.subline')}
          </Dialog.Description>

          {/* Note d'anonymat : encart cadenas. */}
          <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-border bg-card-sub px-3 py-3">
            <Icon
              name="Lock"
              size={16}
              className="mt-0.5 shrink-0 text-text-ter"
              aria-hidden="true"
            />
            <p className="font-body text-[13px] leading-relaxed text-text-ter">
              {t('prePrompt.trustNote')}
            </p>
          </div>

          {/* CTA primaire pleine largeur. */}
          <button
            type="button"
            onClick={handleCta}
            disabled={busy}
            aria-busy={busy || undefined}
            className={cn(
              'mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)]',
              'bg-accent text-[15px] font-semibold text-accent-ink',
              'transition-all duration-[150ms] hover:opacity-90',
              'active:scale-[0.99] motion-reduce:active:scale-100',
              'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
              'disabled:cursor-not-allowed'
            )}
          >
            {busy ? (
              <>
                <CtaSpinner />
                <span className="sr-only">{t('prePrompt.accept')}</span>
                <span aria-hidden="true" className="invisible">
                  {t('prePrompt.accept')}
                </span>
              </>
            ) : (
              t('prePrompt.accept')
            )}
          </button>

          {/* Pied : « Plus tard » à gauche, lien profil à droite. */}
          <div className="mt-2 flex items-center justify-between gap-3">
            <Dialog.Close
              className={cn(
                'inline-flex h-11 items-center rounded-md px-1',
                'font-body text-[14px] font-medium text-text-sec',
                'transition-colors duration-[150ms] hover:text-text',
                'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
              )}
            >
              {t('prePrompt.later')}
            </Dialog.Close>
            <Link
              href="/profil"
              onClick={onDismiss}
              className={cn(
                'inline-flex h-11 items-center rounded-md px-1',
                'font-body text-[14px] font-semibold text-accent',
                'transition-opacity duration-[150ms] hover:opacity-80',
                'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
              )}
            >
              {t('prePrompt.manageInProfile')}
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
