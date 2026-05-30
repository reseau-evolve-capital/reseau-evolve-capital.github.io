import * as React from 'react'
import { cn } from '../../lib/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[14px] text-text placeholder:text-text-ter',
        'transition-shadow duration-[150ms] focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
        'aria-[invalid=true]:border-data-negative',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
