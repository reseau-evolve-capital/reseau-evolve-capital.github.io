import * as React from 'react'
import { cn } from '../../lib/cn'

export type LogoVariant = 'full' | 'mark'

export interface LogoProps {
  /** 'full' affiche le logotype complet (marque + nom), 'mark' affiche uniquement l'icône */
  variant?: LogoVariant
  className?: string
}

export const Logo = React.forwardRef<HTMLSpanElement, LogoProps>(
  ({ variant = 'full', className }, ref) => {
    return (
      <span
        ref={ref}
        role="img"
        className={cn('inline-flex items-center gap-2 font-display', className)}
        aria-label="Evolve Capital"
      >
        <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true" focusable="false">
          <rect width="32" height="32" rx="8" className="fill-brand-yellow" />
          <path
            d="M10 9h12M10 16h9M10 23h12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-neutral-900"
          />
        </svg>
        {variant === 'full' && (
          // Couleur héritée du conteneur (currentColor) pour s'adapter clair/sombre
          // et aux panneaux toujours-sombres (login) sans surcharge.
          <span className="text-[16px] font-semibold leading-none">Evolve Capital</span>
        )}
      </span>
    )
  }
)
Logo.displayName = 'Logo'
