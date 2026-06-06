import * as React from 'react'
import { cn } from '../../lib/cn'

export type TextVariant = 'body-lg' | 'body' | 'caption' | 'mono'
export type TextColor = 'text' | 'text-sec' | 'text-ter'

const variantClasses: Record<TextVariant, string> = {
  'body-lg': 'text-[16px] leading-relaxed',
  body: 'text-[14px] leading-relaxed',
  caption: 'text-[12px] leading-normal uppercase tracking-[0.06em] font-semibold text-text-ter',
  mono: 'text-[12px] font-mono tracking-[0.10em] uppercase [font-feature-settings:"tnum"]',
}

const colorClasses: Record<TextColor, string> = {
  text: 'text-text',
  'text-sec': 'text-text-sec',
  'text-ter': 'text-text-ter',
}

export interface TextProps {
  variant?: TextVariant
  color?: TextColor
  as?: React.ElementType
  className?: string
  children: React.ReactNode
}

export function Text({
  variant = 'body',
  color = 'text',
  as: Tag = 'span',
  className,
  children,
}: TextProps) {
  return (
    <Tag className={cn('font-body', variantClasses[variant], colorClasses[color], className)}>
      {children}
    </Tag>
  )
}
