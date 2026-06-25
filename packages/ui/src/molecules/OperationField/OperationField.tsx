import * as React from 'react'
import { useId } from 'react'
import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

type FieldVariant = 'input' | 'amount' | 'select' | 'textarea'

interface OperationFieldBase {
  /** Libellé (affiché en capitales). i18n côté appelant. */
  label: string
  /** Champ obligatoire → astérisque `--data-negative` + aria-required. */
  required?: boolean
  /** Aide sous le champ (état neutre). */
  hint?: string
  /** Message d'erreur (prend le pas sur le hint, colore le champ). */
  error?: string
  /** Suffixe affiché à droite du champ montant (variant `amount`). Défaut « € ». */
  suffix?: string
  className?: string
}

export interface OperationInputFieldProps
  extends OperationFieldBase, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  variant?: 'input' | 'amount'
}

export interface OperationSelectFieldProps
  extends OperationFieldBase, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  variant: 'select'
  children: React.ReactNode
}

export interface OperationTextareaFieldProps
  extends OperationFieldBase, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  variant: 'textarea'
}

export type OperationFieldProps =
  | OperationInputFieldProps
  | OperationSelectFieldProps
  | OperationTextareaFieldProps

const CONTROL_BASE =
  'w-full rounded-md border bg-card px-[15px] py-[13px] text-text font-body ' +
  'text-[16px] md:text-[14px] ' +
  'transition-shadow duration-[150ms] focus:outline-none ' +
  'disabled:opacity-40 disabled:cursor-not-allowed'

function controlClasses(hasError: boolean, extra?: string) {
  return cn(
    CONTROL_BASE,
    hasError
      ? 'border-data-negative focus-visible:shadow-[0_0_0_4px_var(--color-data-negative-50)]'
      : 'border-border-strong focus-visible:border-brand-yellow focus-visible:shadow-[var(--sh-glow)]',
    extra
  )
}

/**
 * OperationField — champ générique de l'assistant de saisie (E-OPS-2 §4 `.op-field`).
 *
 * Label en capitales + astérisque requis (`--data-negative`), contrôle adaptatif
 * (input / montant suffixé / select natif / textarea), hint, et message d'erreur
 * avec icône. Token-driven (aucun hex) ; focus visible jaune, erreur = bordure
 * `--data-negative` + ring `--data-negative-50`. i18n via props (label/hint/error).
 *
 * Le select est natif (`<select>`) pour rester sans dépendance et a11y par défaut ;
 * le Radix Select de `@evolve/ui` reste disponible si l'appelant veut un menu riche.
 */
export function OperationField(props: OperationFieldProps) {
  const { label, required, hint, error, className } = props
  const variant: FieldVariant = props.variant ?? 'input'
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [error ? errId : hintId].filter(Boolean).join(' ') || undefined
  const hasError = Boolean(error)

  const aria = {
    id,
    'aria-describedby': describedBy,
    ...(hasError ? { 'aria-invalid': true as const } : {}),
    ...(required ? { 'aria-required': true as const } : {}),
  }

  let control: React.ReactNode
  if (variant === 'select') {
    const { children, ...rest } = props as OperationSelectFieldProps
    const {
      label: _l,
      required: _r,
      hint: _h,
      error: _e,
      suffix: _s,
      variant: _v,
      className: _c,
      ...selectProps
    } = rest
    control = (
      <select {...aria} {...selectProps} className={controlClasses(hasError)}>
        {children}
      </select>
    )
  } else if (variant === 'textarea') {
    const {
      label: _l,
      required: _r,
      hint: _h,
      error: _e,
      suffix: _s,
      variant: _v,
      className: _c,
      ...taProps
    } = props as OperationTextareaFieldProps
    control = (
      <textarea
        {...aria}
        {...taProps}
        className={controlClasses(hasError, 'min-h-[80px] resize-y')}
      />
    )
  } else {
    const {
      label: _l,
      required: _r,
      hint: _h,
      error: _e,
      suffix,
      variant: _v,
      className: _c,
      ...inputProps
    } = props as OperationInputFieldProps
    if (variant === 'amount') {
      control = (
        <div className="relative">
          <input
            {...aria}
            inputMode="decimal"
            {...inputProps}
            className={controlClasses(hasError, 'pr-9')}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-[15px] flex items-center font-display text-[14px] text-text-ter"
          >
            {suffix ?? '€'}
          </span>
        </div>
      )
    } else {
      control = <input {...aria} {...inputProps} className={controlClasses(hasError)} />
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={id}
        className="font-body text-[12px] font-semibold uppercase tracking-[0.05em] text-text-ter"
      >
        {label}
        {required && (
          <span className="ml-1 text-data-negative" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {control}

      {error ? (
        <p
          id={errId}
          role="alert"
          aria-live="polite"
          className="flex items-center gap-1.5 text-[12.5px] text-data-negative"
        >
          <Icon name="CircleAlert" size={16} aria-hidden="true" className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[12.5px] text-text-ter">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
