import * as React from 'react'
import { cn } from '../../lib/cn'

export type LogoVariant = 'full' | 'mark'

export interface LogoProps {
  /** 'full' affiche le logotype complet (marque + nom), 'mark' affiche uniquement l'icône */
  variant?: LogoVariant
  /**
   * URL de l'image de marque (ex. `/logo.jpg` servi par l'app). Si fournie, elle remplace
   * la marque SVG par défaut. Présentationnel : l'app injecte l'URL (pas d'import d'asset
   * dans @evolve/ui → aucun couplage bundler/test). Fallback SVG si absente (Storybook).
   */
  src?: string
  className?: string
}

export const Logo = React.forwardRef<HTMLSpanElement, LogoProps>(
  ({ variant = 'full', src, className }, ref) => {
    return (
      <span
        ref={ref}
        role="img"
        className={cn('inline-flex items-center gap-2 font-display', className)}
        aria-label="Evolve Capital"
      >
        {src ? (
          // Logo de marque (image). Décoratif ici : le nom accessible vient de l'aria-label
          // du conteneur. La pastille arrondie habille le fond (le visuel fourni est opaque).
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 shrink-0 rounded-[8px] object-cover"
          />
        ) : (
          <svg
            viewBox="0 0 32 32"
            className="h-8 w-8 shrink-0"
            aria-hidden="true"
            focusable="false"
          >
            <rect width="32" height="32" rx="8" className="fill-brand-yellow" />
            <path
              d="M10 9h12M10 16h9M10 23h12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-neutral-900"
            />
          </svg>
        )}
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
