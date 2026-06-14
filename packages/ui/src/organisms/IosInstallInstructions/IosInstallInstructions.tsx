'use client'

// IosInstallInstructions (PWA-001) — modale 2 étapes « ajouter à l'écran d'accueil » iOS.
//
// Sur iOS Safari, l'installation PWA est manuelle (pas de beforeinstallprompt) : on
// guide l'utilisateur en deux étapes illustrées — (1) appuyer sur Partager, (2) choisir
// « Sur l'écran d'accueil ». Les illustrations s'adaptent à l'appareil (iPhone : Share
// en bas-centre ; iPad : Share en haut-droite).
//
// Radix Dialog → aria-modal=true, focus-trap, Escape ferme, retour focus au déclencheur.
// z-index 60 (au-dessus de la bottom sheet à 50). L'étape revient à 1 à chaque réouverture.
//
// PRÉSENTATIONNEL STRICT : tout le copy arrive par la prop `copy` (i18n côté app), zéro
// window/data. Tokens uniquement, jamais de hex (sauf l'unique rgba accent du surlignage,
// porté par l'illustration ShareMenuStep). Réf : SensitiveConfirmModal (Radix + tokens).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { cn } from '../../lib/cn'
import { IphoneShareStep } from './illustrations/IphoneShareStep'
import { IpadShareStep } from './illustrations/IpadShareStep'
import { ShareMenuStep } from './illustrations/ShareMenuStep'

export type IosInstallStep = 1 | 2

export interface IosInstallInstructionsCopy {
  step1Title: string
  step1Body: string
  step1Caption: string
  step2Title: string
  step2Body: string
  step2Caption: string
  /**
   * Note rassurante affichée à l'étape 2 : la disposition du menu Partager varie selon
   * la version d'iOS, donc on rappelle de toujours chercher « Sur l'écran d'accueil »
   * plutôt qu'une position numérique.
   */
  versionNote: string
  /** Libellé surligné dans le menu Partager (étape 2), ex. « Sur l'écran d'accueil ». */
  step2HighlightLabel: string
  /** CTA étape 1 → étape 2, ex. « Étape suivante ». */
  next: string
  /** CTA étape 2 → fermeture, ex. « C'est fait ». */
  done: string
  /** aria-label du bouton fermer (X). */
  close: string
  /** Compteur d'étape, ex. (1, 2) → « Étape 1 sur 2 ». */
  stepLabel: (current: IosInstallStep, total: number) => string
}

export interface IosInstallInstructionsProps {
  open: boolean
  device: 'iphone' | 'ipad'
  onClose: () => void
  /** Notifie l'app qu'une étape est affichée (analytics). */
  onStepView?: (step: IosInstallStep) => void
  copy: IosInstallInstructionsCopy
}

export function IosInstallInstructions({
  open,
  device,
  onClose,
  onStepView,
  copy,
}: IosInstallInstructionsProps) {
  const [step, setStep] = React.useState<IosInstallStep>(1)

  // Réinitialise à l'étape 1 à chaque (ré)ouverture.
  React.useEffect(() => {
    if (open) setStep(1)
  }, [open])

  // Notifie l'app de l'étape affichée (uniquement quand la modale est ouverte).
  React.useEffect(() => {
    if (open) onStepView?.(step)
  }, [open, step, onStepView])

  const isStep1 = step === 1
  const title = isStep1 ? copy.step1Title : copy.step2Title
  const body = isStep1 ? copy.step1Body : copy.step2Body
  const caption = isStep1 ? copy.step1Caption : copy.step2Caption

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  const handlePrimary = () => {
    if (isStep1) setStep(2)
    else onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[var(--overlay)] motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-[16px] bg-card shadow-[var(--sh-modal)]',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[220ms]',
            'focus:outline-none'
          )}
        >
          {/* En-tête : compteur d'étape + titre + bouton fermer. */}
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-ter">
                {copy.stepLabel(step, 2)}
              </p>
              <Dialog.Title className="mt-1 font-display text-[18px] font-bold text-text">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label={copy.close}
              className={cn(
                '-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
                'text-text-ter transition-colors duration-[150ms] hover:bg-card-sub hover:text-text-sec',
                'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
              )}
            >
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          {/* Illustration de l'étape courante. */}
          <div className="mt-4 px-5">
            <div className="rounded-[12px] border border-border bg-card-sub p-4">
              {isStep1 ? (
                device === 'ipad' ? (
                  <IpadShareStep />
                ) : (
                  <IphoneShareStep />
                )
              ) : (
                <ShareMenuStep highlightLabel={copy.step2HighlightLabel} />
              )}
            </div>
          </div>

          {/* Corps + caption mono. Radix relie automatiquement Title→aria-labelledby et
              Description→aria-describedby sur Content (pas d'ids/aria manuels = pas de warning). */}
          <div className="px-5 pt-4">
            <Dialog.Description className="text-[14px] leading-relaxed text-text-sec">
              {body}
            </Dialog.Description>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-text-ter">
              {caption}
            </p>
            {/* Note de version iOS — uniquement à l'étape 2, là où la disposition du menu
                Partager varie d'une version à l'autre (texte secondaire, rassurant). */}
            {!isStep1 ? (
              <p className="mt-2 text-[12px] leading-relaxed text-text-ter">{copy.versionNote}</p>
            ) : null}
          </div>

          {/* Pied : CTA primaire (suivant / fait). */}
          <div className="px-5 pb-5 pt-5">
            <button
              type="button"
              onClick={handlePrimary}
              className={cn(
                'inline-flex h-12 w-full items-center justify-center rounded-[var(--r-md)]',
                'bg-accent text-[15px] font-semibold text-accent-ink',
                'transition-all duration-[150ms] hover:opacity-90',
                'active:scale-[0.99] motion-reduce:active:scale-100',
                'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
              )}
            >
              {isStep1 ? copy.next : copy.done}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
