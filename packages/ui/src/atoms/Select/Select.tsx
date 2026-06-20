import * as React from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { cn } from '../../lib/cn'

export const SelectRoot = RadixSelect.Root
export const SelectValue = RadixSelect.Value
export const SelectPortal = RadixSelect.Portal

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>(({ className, children, ...props }, ref) => (
  <RadixSelect.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-[10px] border border-border bg-card px-3',
      'text-[14px] text-text placeholder:text-text-ter',
      'transition-shadow duration-[150ms] focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      className
    )}
    {...props}
  >
    {children}
    <RadixSelect.Icon>
      <svg className="h-4 w-4 text-text-ter" fill="none" viewBox="0 0 24 24">
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </RadixSelect.Icon>
  </RadixSelect.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <RadixSelect.Content
    ref={ref}
    position={position}
    sideOffset={4}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-[10px] border border-border bg-card shadow-[var(--sh-pop)]',
      className
    )}
    {...props}
  >
    <RadixSelect.ScrollUpButton className="flex items-center justify-center py-1 text-text-ter">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M18 15l-6-6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </RadixSelect.ScrollUpButton>
    <RadixSelect.Viewport
      className={cn(
        'p-1',
        'max-h-[min(var(--radix-select-content-available-height),320px)] overflow-y-auto'
      )}
    >
      {children}
    </RadixSelect.Viewport>
    <RadixSelect.ScrollDownButton className="flex items-center justify-center py-1 text-text-ter">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </RadixSelect.ScrollDownButton>
  </RadixSelect.Content>
))
SelectContent.displayName = 'SelectContent'

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(({ className, children, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-1.5 text-[14px] text-text',
      'outline-none focus:bg-neutral-100 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
      className
    )}
    {...props}
  >
    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
  </RadixSelect.Item>
))
SelectItem.displayName = 'SelectItem'
