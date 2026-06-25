import * as React from 'react'
import { Icon } from '../../atoms/Icon'
import { OpChip } from '../../atoms/OpChip'
import {
  getOperationType,
  OPERATION_TYPE_ORDER,
  type OperationTypeKey,
} from '../../atoms/OperationType/operationTypes'
import { cn } from '../../lib/cn'

export interface OperationTypeCardProps {
  type: OperationTypeKey
  /** Libellé (i18n côté appelant). Défaut : libellé FR du catalogue. */
  label?: string
  /** Description (i18n côté appelant). Défaut : description FR du catalogue. */
  description?: string
  onSelect: (type: OperationTypeKey) => void
  className?: string
}

/**
 * OperationTypeCard — carte cliquable d'un type d'opération (E-OPS-2 §4 `.op-typecard`).
 * `OpChip` 48 + nom + desc + flèche. Rendu en `<button>` → focus/clavier/pointer natifs.
 */
export function OperationTypeCard({
  type,
  label,
  description,
  onSelect,
  className,
}: OperationTypeCardProps) {
  const meta = getOperationType(type)
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={cn(
        'flex min-h-[44px] flex-col items-start gap-3.5 rounded-md border border-border bg-card p-5 text-left shadow-[var(--sh-card)]',
        'transition-[border-color,transform] duration-[150ms]',
        'hover:-translate-y-0.5 hover:border-text-ter active:scale-[0.99]',
        'focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
        className
      )}
    >
      <OpChip type={type} size={48} />
      <span className="font-display text-[16px] font-bold tracking-[-0.01em] text-text">
        {label ?? meta.label}
      </span>
      <span className="text-[12.5px] leading-[1.4] text-text-ter">
        {description ?? meta.description}
      </span>
      <Icon name="ArrowRight" size={16} aria-hidden="true" className="mt-auto text-text-ter" />
    </button>
  )
}

export interface OperationTypeSelectorProps {
  /** Types proposés (ordre). Défaut : les 6 types de l'assistant (OPERATION_TYPE_ORDER). */
  types?: readonly OperationTypeKey[]
  /** Surcharge de libellés/descriptions par type (i18n côté appelant). */
  copy?: Partial<Record<OperationTypeKey, { label?: string; description?: string }>>
  onSelect: (type: OperationTypeKey) => void
  /** Nom accessible de la grille (i18n côté appelant). */
  ariaLabel?: string
  className?: string
}

/**
 * OperationTypeSelector — grille des types d'opération (E-OPS-2 §4 Étape 1).
 * 3 colonnes desktop, 2 colonnes mobile. Chaque carte appelle `onSelect(type)`.
 * Token-driven, sans dépendance i18n (copy injectable).
 */
export function OperationTypeSelector({
  types = OPERATION_TYPE_ORDER,
  copy,
  onSelect,
  ariaLabel = "Choisir un type d'opération",
  className,
}: OperationTypeSelectorProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4', className)}
    >
      {types.map((t) => (
        <OperationTypeCard
          key={t}
          type={t}
          label={copy?.[t]?.label}
          description={copy?.[t]?.description}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
