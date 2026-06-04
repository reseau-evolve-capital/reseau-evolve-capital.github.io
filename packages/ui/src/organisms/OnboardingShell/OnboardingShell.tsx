import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface OnboardingShellProps {
  /** Contenu de l'en-tête (ex : ProgressHeader) */
  header?: ReactNode
  /** Contenu du pied de page (ex : boutons de navigation) */
  footer?: ReactNode
  /** Contenu principal de l'étape */
  children: ReactNode
  className?: string
}

/**
 * Wrapper non-interactif pour les étapes d'onboarding.
 * Fournit le centrage plein-écran, les slots header/children/footer.
 * Zéro logique — présentationnel pur.
 */
export function OnboardingShell({ header, footer, children, className }: OnboardingShellProps) {
  return (
    <div className="flex min-h-screen w-full min-w-0 items-center justify-center bg-gradient-to-b from-card to-bg-page p-4">
      <section
        className={cn(
          // min-w-0 : autorise la carte à rétrécir sous la largeur min-content de son
          // contenu (ex. carrousel à slides non-shrink) → pas de débordement horizontal mobile.
          'flex w-full min-w-0 max-w-[640px] flex-col gap-6 rounded-lg border border-border bg-card p-6 shadow-[var(--sh-card)] sm:p-8',
          className
        )}
      >
        {header}
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
        {footer && <div className="flex flex-col gap-3">{footer}</div>}
      </section>
    </div>
  )
}
