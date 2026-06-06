import * as React from 'react'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { cn } from '../../lib/cn'

export const RadioGroupRoot = RadioGroup.Root
export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroup.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroup.Item>
>(({ className, ...props }, ref) => (
  <RadioGroup.Item
    ref={ref}
    className={cn(
      'h-5 w-5 rounded-full border border-border bg-card',
      'data-[state=checked]:border-brand-yellow',
      'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      className
    )}
    {...props}
  >
    <RadioGroup.Indicator className="flex items-center justify-center">
      <span className="block h-2.5 w-2.5 rounded-full bg-brand-yellow" />
    </RadioGroup.Indicator>
  </RadioGroup.Item>
))
RadioGroupItem.displayName = 'RadioGroupItem'
