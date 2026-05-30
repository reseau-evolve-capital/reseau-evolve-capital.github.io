import * as React from 'react'
import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '../../lib/cn'

export interface SwitchProps extends RadixSwitch.SwitchProps {}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <RadixSwitch.Root
      className={cn(
        'relative h-6 w-11 rounded-[9999px] border-2 border-border-strong bg-card',
        'transition-colors duration-[150ms]',
        'data-[state=checked]:bg-brand-yellow data-[state=checked]:border-brand-yellow',
        'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block h-4 w-4 rounded-full bg-card shadow-sm',
          'transition-transform duration-[150ms]',
          'translate-x-0.5 data-[state=checked]:translate-x-[22px]'
        )}
      />
    </RadixSwitch.Root>
  )
}
