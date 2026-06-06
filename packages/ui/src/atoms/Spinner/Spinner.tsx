import * as React from 'react'
import { cn } from '../../lib/cn'

export interface SpinnerProps {
  size?: 16 | 20 | 24
  className?: string
  'aria-label'?: string
}

export function Spinner({
  size = 20,
  className,
  'aria-label': ariaLabel = 'Chargement…',
}: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={cn('animate-spin motion-reduce:animate-none', className)}
    >
      <circle cx="12" cy="12" r="10" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}
