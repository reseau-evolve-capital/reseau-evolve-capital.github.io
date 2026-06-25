import * as React from 'react'
import { icons } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  getOperationType,
  OPERATION_VISUAL_CLASSES,
  type OperationTypeKey,
} from '../OperationType/operationTypes'

export interface OpChipProps {
  /** Type métier de l'opération (pilote couleur + icône). */
  type: OperationTypeKey | string
  /** Diamètre du chip en px. 40 (liste) par défaut ; 44-48 (drawer/formulaire). */
  size?: number
  /** Atténue le chip (opération annulée) : grayscale 0.7. */
  cancelled?: boolean
  className?: string
}

/**
 * OpChip — pastille ronde colorée portant l'icône du type d'opération.
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §2 (OpChip).
 *
 * Le fond/texte viennent du catalogue OPERATION_TYPES via des classes Tailwind
 * token-driven (jamais de hex en dur). Le piège dividende light/dark est géré par
 * le token `--data-dividend-fg` (cf. design-system), pas par un inline color.
 */
export function OpChip({ type, size = 40, cancelled = false, className }: OpChipProps) {
  const meta = getOperationType(type)
  const { chipBg, chipFg } = OPERATION_VISUAL_CLASSES[meta.kind]
  const LucideIcon = icons[meta.icon]
  const iconSize = Math.round(size * 0.5)

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill',
        chipBg,
        chipFg,
        cancelled && '[filter:grayscale(0.7)]',
        className
      )}
      style={{ width: size, height: size }}
    >
      {LucideIcon ? <LucideIcon size={iconSize} strokeWidth={1.85} /> : null}
    </span>
  )
}
