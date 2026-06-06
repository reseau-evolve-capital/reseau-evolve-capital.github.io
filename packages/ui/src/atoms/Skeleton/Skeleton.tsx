import * as React from 'react'
import { cn } from '../../lib/cn'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  className?: string
}

export function Skeleton({ width, height, radius = '10px', className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-neutral-200 animate-pulse motion-reduce:animate-none', className)}
      style={{ width: width ?? '100%', height: height ?? '1rem', borderRadius: radius }}
    />
  )
}
