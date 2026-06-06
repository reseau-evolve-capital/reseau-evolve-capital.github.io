'use client'
import * as React from 'react'
import { cn } from '../../lib/cn'

export type AvatarSize = 'sm' | 'md' | 'lg'
const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-12 w-12 text-[16px]',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export interface AvatarProps {
  name: string
  src?: string
  size?: AvatarSize
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  // Repli sur les initiales si l'image échoue à charger (URL absolue env-dépendante,
  // fichier supprimé, hors-ligne…) — jamais d'image cassée à l'écran (BUG 4).
  const [failed, setFailed] = React.useState(false)

  // Réinitialise l'état d'erreur quand la source change (sinon une URL valide resterait masquée).
  React.useEffect(() => {
    setFailed(false)
  }, [src])

  const showImage = Boolean(src) && !failed

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full border border-border',
        'bg-neutral-900 text-brand-yellow',
        '[html[data-theme=dark]_&]:bg-brand-yellow [html[data-theme=dark]_&]:text-neutral-900',
        'font-display font-black tracking-wide',
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
