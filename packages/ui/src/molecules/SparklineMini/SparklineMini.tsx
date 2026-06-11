'use client'
import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { cn } from '../../lib/cn'

export interface SparklineMiniProps {
  data: number[]
  /** Couleur de trait — token CSS uniquement (défaut data-positive, dataviz V2). */
  color?: string
  height?: number
  className?: string
}

/** Sparkline 30j sans axes ni tooltip. <2 points → rien (caller gère l'empty). */
export function SparklineMini({
  data,
  color = 'var(--color-data-positive)',
  height = 40,
  className,
}: SparklineMiniProps) {
  const gradientId = React.useId()

  if (!Array.isArray(data) || data.length < 2) return null

  const chartData = data.map((value, i) => ({ i, value }))
  const reduced =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)

  return (
    <div className={cn('w-full', className)} style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={!reduced}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
