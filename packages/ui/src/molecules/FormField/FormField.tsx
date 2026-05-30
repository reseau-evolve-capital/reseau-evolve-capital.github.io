import * as React from 'react'
import { useId } from 'react'
import { cn } from '../../lib/cn'

export interface FormFieldProps {
  label: string
  helpText?: string
  error?: string
  required?: boolean
  className?: string
  children: (props: {
    id: string
    'aria-describedby'?: string
    'aria-invalid'?: true
    'aria-required'?: true
  }) => React.ReactNode
}

export function FormField({
  label,
  helpText,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const helpId = helpText ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[14px] font-semibold text-text">
        {label}
        {required && (
          <span className="ml-1 text-data-negative" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({
        id,
        'aria-describedby': describedBy,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(required ? { 'aria-required': true as const } : {}),
      })}

      {helpText && (
        <p id={helpId} className="text-[12px] text-text-ter">
          {helpText}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" aria-live="polite" className="text-[12px] text-data-negative">
          {error}
        </p>
      )}
    </div>
  )
}
