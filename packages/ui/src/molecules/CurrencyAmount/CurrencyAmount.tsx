import * as React from 'react'
import { formatEUR } from '@evolve/utils'
import { cn } from '../../lib/cn'

export interface CurrencyAmountProps {
  amount: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSign?: boolean
  className?: string
}

const sizeClass: Record<NonNullable<CurrencyAmountProps['size']>, string> = {
  sm: 'text-[14px]',
  md: 'text-[16px]',
  lg: 'text-[20px] font-semibold',
  // Hero display : réduit sur mobile pour les montants longs (ex. « 133 655,00 € »
  // à 375px) puis 56px dès `sm` — évite tout débordement horizontal.
  xl: 'font-display font-black text-[40px] sm:text-[56px] leading-none tracking-[-0.02em]',
}

/** Montant EUR FR ("1 234,56 €"). showSign → "+"/"−". Négatif → "−" (U+2212). NaN → "—". */
export function CurrencyAmount({
  amount,
  size = 'md',
  showSign = false,
  className,
}: CurrencyAmountProps) {
  const valid = typeof amount === 'number' && isFinite(amount)
  const body = formatEUR(Math.abs(amount))
  const sign = !valid ? '' : amount < 0 ? '−' : showSign && amount > 0 ? '+' : ''
  const text = body === '—' ? '—' : `${sign}${body}`
  return (
    <span
      className={cn('[font-feature-settings:"tnum","lnum"] text-text', sizeClass[size], className)}
      aria-label={text}
    >
      {text}
    </span>
  )
}
