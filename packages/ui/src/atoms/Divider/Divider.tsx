import * as React from 'react'
import { cn } from '../../lib/cn'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  strong?: boolean
  className?: string
}

export function Divider({ orientation = 'horizontal', strong = false, className }: DividerProps) {
  return (
    <hr
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-l self-stretch',
        strong ? 'border-border-strong' : 'border-border',
        className
      )}
    />
  )
}
