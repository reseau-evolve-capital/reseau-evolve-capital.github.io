'use client'
import * as React from 'react'
import { Icon } from '../../atoms/Icon'
import { Logo } from '../../atoms/Logo'
import { cn } from '../../lib/cn'
import type { NavItem } from '../BottomNav'

export interface SidebarClub {
  name: string
  meta?: string
}

export interface SidebarProps {
  items: NavItem[]
  activeHref: string
  /** Composant lien injecté par l'app (ex: Next `<Link>`). Par défaut `<a>`. */
  linkComponent?: React.ElementType
  /** Carte « Club actif » affichée en bas de la sidebar (optionnel). */
  clubActif?: SidebarClub
  /** URL du logo de marque (l'app injecte `/logo.jpg`). Fallback SVG si absent. */
  logoSrc?: string
  className?: string
}

/**
 * Sidebar de navigation desktop (`hidden md:flex`). Présentationnel : aucune
 * dépendance à `next/*`. La navigation passe par `linkComponent` (l'app injecte
 * le `<Link>` Next) ou un `<a href>` par défaut.
 *
 * Chaque `NavItem` peut porter une pastille `notif` et un état `disabled`
 * (fonctionnalité V1 à venir, rendue en `<span>` non cliquable).
 */
export function Sidebar({
  items,
  activeHref,
  linkComponent: Link = 'a',
  clubActif,
  logoSrc,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden md:flex md:flex-col',
        'w-64 h-screen sticky top-0',
        'bg-card border-r border-border',
        'px-3 py-4 gap-4',
        className
      )}
    >
      <div className="px-2">
        <Logo variant="full" src={logoSrc} />
      </div>

      <p className="px-3 mt-2 font-mono uppercase tracking-wider text-[11px] text-text-ter">
        Espace membre
      </p>

      <nav aria-label="Navigation principale" className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.href === activeHref

          const content = (
            <>
              <Icon name={item.icon} size={20} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.notif ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-data-negative" aria-hidden="true" />
                  <span className="sr-only">notification</span>
                </>
              ) : null}
            </>
          )

          const baseItem =
            'flex items-center gap-3 px-3 rounded-[10px] min-h-[44px] text-[14px] font-semibold'

          if (item.disabled) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className={cn(baseItem, 'opacity-60 cursor-not-allowed text-text-ter')}
              >
                <Icon name={item.icon} size={20} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <span className="font-mono uppercase tracking-wider text-[10px] text-text-ter">
                  Bientôt
                </span>
              </span>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                baseItem,
                'transition-colors duration-[150ms]',
                'focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
                active
                  ? 'bg-brand-yellow text-accent-ink'
                  : 'text-text-sec hover:bg-neutral-100 hover:text-text'
              )}
            >
              {content}
            </Link>
          )
        })}
      </nav>

      {clubActif ? (
        <div className="mt-auto border border-border rounded-[10px] p-3">
          <p className="font-mono uppercase tracking-wider text-[11px] text-text-ter">Club actif</p>
          <p className="mt-1 font-semibold text-text text-[14px]">{clubActif.name}</p>
          {clubActif.meta ? <p className="text-text-sec text-[12px]">{clubActif.meta}</p> : null}
        </div>
      ) : null}
    </aside>
  )
}
