import * as React from 'react'
import { cn } from '../../lib/cn'

export interface LinkProps {
  href: string
  className?: string
  children: React.ReactNode
  [key: string]: unknown
}

export function Link({ href, className, children, ...props }: LinkProps) {
  const isExternal = href.startsWith('http') || href.startsWith('//')
  const classes = cn(
    'text-text underline decoration-accent hover:decoration-2',
    'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] rounded-sm',
    className
  )

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...props}>
        {children}
      </a>
    )
  }

  return (
    <a href={href} className={classes} {...props}>
      {children}
    </a>
  )
}
