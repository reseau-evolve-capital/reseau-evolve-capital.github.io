import * as React from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { cn } from '../../lib/cn'

export interface CheckboxProps extends RadixCheckbox.CheckboxProps {}

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      className={cn(
        'h-5 w-5 rounded-sm border border-border bg-card',
        'transition-colors duration-[150ms]',
        'data-[state=checked]:bg-brand-yellow data-[state=checked]:border-brand-yellow',
        'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center">
        <svg className="h-3 w-3 text-accent-ink" fill="none" viewBox="0 0 12 12">
          <path
            d="M2 6l3 3 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
}
