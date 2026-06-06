import { useId } from 'react'
import { Checkbox } from '../../atoms/Checkbox'
import { Link } from '../../atoms/Link'
import { cn } from '../../lib/cn'

export interface ConsentRowProps {
  /** État coché du consentement */
  checked: boolean
  /** Callback Radix : reçoit `boolean | 'indeterminate'` — ignorez 'indeterminate' si non utilisé */
  onCheckedChange: (checked: boolean) => void
  /** Texte du consentement */
  label: string
  /** URL de la page de détail (ex: CGU) */
  linkHref?: string
  /** Texte du lien inline — défaut "lire" */
  linkLabel?: string
  /**
   * Cible du lien de détail. `_blank` ouvre dans un nouvel onglet (avec
   * `rel="noopener noreferrer"` automatique) — utile quand la ligne vit dans un
   * flux à état volatile (ex: onboarding zustand en mémoire) où une navigation
   * pleine page viderait l'état. Défaut `_self`.
   */
  linkTarget?: '_blank' | '_self'
  /** Affiche une astérisque rouge si requis */
  required?: boolean
  className?: string
}

/**
 * Ligne de consentement interactive : Checkbox + label cliquable + lien optionnel [lire].
 * Le lien est un SIBLING du label (pas un enfant) pour éviter que le clic sur le lien
 * déclenche aussi le label-activation et toggle la checkbox en même temps.
 */
export function ConsentRow({
  checked,
  onCheckedChange,
  label,
  linkHref,
  linkLabel = 'lire',
  linkTarget = '_self',
  required,
  className,
}: ConsentRowProps) {
  const id = useId()
  const labelId = `${id}-label`
  const linkId = linkHref ? `${id}-link` : undefined

  const handleCheckedChange = (value: boolean | 'indeterminate') => {
    if (value !== 'indeterminate') {
      onCheckedChange(value)
    }
  }

  return (
    <div className={cn('flex items-start gap-3 py-2', className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={handleCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={linkId}
        className="mt-0.5 shrink-0"
      />
      <div className="flex flex-1 flex-wrap items-baseline gap-1">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- associé via id + aria-labelledby sur le Checkbox Radix */}
        <label id={labelId} htmlFor={id} className="cursor-pointer text-[14px] text-text">
          {label}
          {required && (
            <span className="ml-1 text-data-negative" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {linkHref && (
          <Link
            id={linkId}
            href={linkHref}
            className="text-[14px]"
            {...(linkTarget === '_blank' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            [{linkLabel}]
          </Link>
        )}
      </div>
    </div>
  )
}
