import * as React from 'react'
import { cn } from '../../lib/cn'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[80px] rounded-[10px] border border-border bg-card px-3 py-2 text-[14px] text-text placeholder:text-text-ter',
        'transition-shadow duration-[150ms] focus:outline-none focus-visible:shadow-[var(--sh-glow)] resize-y',
        'aria-[invalid=true]:border-data-negative',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)
TextArea.displayName = 'TextArea'
