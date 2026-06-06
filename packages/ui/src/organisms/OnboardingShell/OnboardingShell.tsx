import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface OnboardingShellProps {
  /** Contenu de l'en-tête (ex : titre d'étape, sous-texte). Optionnel. */
  header?: ReactNode
  /** Contenu du pied de page (ex : boutons de navigation). Optionnel. */
  footer?: ReactNode
  /** Contenu principal de l'étape */
  children: ReactNode
  /**
   * Largeur max de la colonne de contenu. `'narrow'` (640 px, défaut) pour les
   * étapes formulaire/consentements ; `'wide'` (960 px) pour le carrousel du tour.
   */
  width?: 'narrow' | 'wide'
  className?: string
}

/**
 * Zone de contenu d'une étape d'onboarding (réf desktop « Login & Onboarding »).
 *
 * Le chrome global (top bar logo + « ONBOARDING · ÉTAPE X / 3 » + aide + bascule
 * de thème + progression segmentée) vit dans le layout `(auth)/onboarding`
 * (`OnboardingChrome`). Ce shell ne fournit donc que la colonne de contenu
 * centrée et thémée — **pas une carte flottante** sur fond vide (corrige le
 * « composant nu » rapporté). Fond hérité du chrome → transparent ici.
 *
 * Zéro logique — présentationnel pur. Slots `header`/`footer` optionnels.
 */
export function OnboardingShell({
  header,
  footer,
  children,
  width = 'narrow',
  className,
}: OnboardingShellProps) {
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
      <section
        className={cn(
          // min-w-0 : autorise la colonne à rétrécir sous la largeur min-content de
          // son contenu (ex. carrousel à slides non-shrink) → pas de débordement mobile.
          'flex w-full min-w-0 flex-col gap-6',
          width === 'wide' ? 'max-w-[960px]' : 'max-w-[640px]',
          className
        )}
      >
        {header && <div className="flex min-w-0 flex-col gap-3">{header}</div>}
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
        {footer && <div className="flex flex-col gap-3">{footer}</div>}
      </section>
    </div>
  )
}
