import * as React from 'react'
import { cn } from '../../lib/cn'

export type HeadingLevel = 'display-xl' | 'display-l' | 'h1' | 'h2' | 'h3'

const levelClasses: Record<HeadingLevel, string> = {
  'display-xl': 'text-[72px] leading-none tracking-[-0.02em] font-black',
  'display-l': 'text-[56px] leading-none tracking-[-0.02em] font-black',
  h1: 'text-[32px] leading-tight tracking-[-0.01em] font-bold',
  h2: 'text-[24px] leading-tight tracking-[-0.01em] font-bold',
  h3: 'text-[20px] leading-snug font-semibold',
}

const defaultTag: Record<HeadingLevel, React.ElementType> = {
  'display-xl': 'h1',
  'display-l': 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
}

export interface HeadingProps {
  level?: HeadingLevel
  as?: React.ElementType
  className?: string
  children: React.ReactNode
}

export function Heading({ level = 'h2', as, className, children }: HeadingProps) {
  const Tag = as ?? defaultTag[level]
  return (
    <Tag className={cn('font-display text-text', levelClasses[level], className)}>{children}</Tag>
  )
}
