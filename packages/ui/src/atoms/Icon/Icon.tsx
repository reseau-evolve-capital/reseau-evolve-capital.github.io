import * as React from 'react'
import { icons, type LucideProps } from 'lucide-react'
import { cn } from '../../lib/cn'

export type IconName = keyof typeof icons

export interface IconProps extends Omit<LucideProps, 'size'> {
  name: IconName
  size?: 16 | 20 | 24
  className?: string
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  const LucideIcon = icons[name]
  if (!LucideIcon) {
    if (process.env['NODE_ENV'] !== 'production') {
      console.warn(`Icon "${name}" not found in lucide-react`)
    }
    return null
  }
  return <LucideIcon size={size} className={cn('shrink-0', className)} {...props} />
}
