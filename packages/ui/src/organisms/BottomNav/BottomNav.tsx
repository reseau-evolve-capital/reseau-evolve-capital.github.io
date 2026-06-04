'use client'
import * as React from 'react'
import { Icon, type IconName } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

/** Élément de navigation partagé entre AppHeader (desktop), Sidebar (desktop) et BottomNav (mobile). */
export interface NavItem {
  label: string
  href: string
  icon: IconName
  /** Affiche une pastille de notification sur l'entrée (optionnel). */
  notif?: boolean
  /** Entrée non cliquable (fonctionnalité V1 à venir) — rendue désactivée (optionnel). */
  disabled?: boolean
}

export interface BottomNavProps {
  items: NavItem[]
  activeHref: string
  /** Composant lien injecté par l'app (ex: Next `<Link>`). Par défaut `<a>`. */
  linkComponent?: React.ElementType
  /** `aria-label` du `<nav>` (i18n). Défaut FR : « Navigation mobile ». */
  navLabel?: string
  className?: string
}

/**
 * Barre de navigation basse, visible uniquement sur mobile (`md:hidden`).
 * Présentationnel : aucune dépendance à `next/*`. La navigation passe par
 * `linkComponent` (l'app injecte le `<Link>` Next) ou un `<a href>` par défaut.
 */
export function BottomNav({
  items,
  activeHref,
  linkComponent: Link = 'a',
  navLabel = 'Navigation mobile',
  className,
}: BottomNavProps) {
  return (
    <nav
      aria-label={navLabel}
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-40 h-20',
        'bg-card border-t border-border',
        'flex items-stretch justify-around',
        className
      )}
    >
      {items.map((item) => {
        const active = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px]',
              'text-[12px] font-semibold transition-colors duration-[150ms]',
              'focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
              active ? 'text-brand-yellow' : 'text-text-ter'
            )}
          >
            <Icon name={item.icon} size={24} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
