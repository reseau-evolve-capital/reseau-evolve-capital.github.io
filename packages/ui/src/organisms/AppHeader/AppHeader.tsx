'use client'
import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Avatar } from '../../atoms/Avatar'
import { Icon } from '../../atoms/Icon'
import { Logo } from '../../atoms/Logo'
import { cn } from '../../lib/cn'
import type { NavItem } from '../BottomNav'

export interface AppHeaderUser {
  fullName: string
  avatarUrl?: string | null
}

export interface AppHeaderProps {
  items: NavItem[]
  activeHref: string
  user: AppHeaderUser
  /** Composant lien injecté par l'app (ex: Next `<Link>`). Par défaut `<a>`. */
  linkComponent?: React.ElementType
  onProfile?: () => void
  onLogout?: () => void
  /** Affiche l'entrée « Espace trésorier » dans le menu (rôle ≥ trésorier). */
  canAccessAdmin?: boolean
  /** Action déclenchée par l'entrée admin (ex: router.push('/admin')). */
  onAdmin?: () => void
  className?: string
}

/**
 * En-tête d'application : logo, navigation desktop (`hidden md:flex`) et
 * menu utilisateur (Avatar + dropdown Radix : Profil / Déconnexion).
 * Présentationnel : aucune dépendance à `next/*`. La navigation passe par
 * `linkComponent` ; les actions du menu remontent via `onProfile`/`onLogout`.
 */
export function AppHeader({
  items,
  activeHref,
  user,
  linkComponent: Link = 'a',
  onProfile,
  onLogout,
  canAccessAdmin = false,
  onAdmin,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-16',
        'bg-card border-b border-border',
        'flex items-center justify-between px-4 md:px-6',
        className
      )}
    >
      <Logo variant="full" />

      <nav aria-label="Navigation principale" className="hidden md:flex gap-6">
        {items.map((item) => {
          const active = item.href === activeHref
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'text-[14px] font-semibold transition-colors duration-[150ms]',
                'focus:outline-none focus-visible:shadow-[var(--sh-glow)] rounded',
                active ? 'text-brand-yellow' : 'text-text-sec'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label="Menu utilisateur"
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full',
            'transition-shadow duration-[150ms]',
            'focus:outline-none focus-visible:shadow-[var(--sh-glow)]'
          )}
        >
          <Avatar name={user.fullName} src={user.avatarUrl ?? undefined} size="md" />
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className={cn(
              'z-50 min-w-[12rem] overflow-hidden rounded-[10px] p-1',
              'bg-card border border-border shadow-[var(--sh-pop)]'
            )}
          >
            {canAccessAdmin ? (
              <DropdownMenu.Item
                onSelect={() => onAdmin?.()}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2',
                  'text-[14px] text-text outline-none',
                  'data-[highlighted]:bg-neutral-100'
                )}
              >
                <Icon name="ShieldCheck" size={16} />
                <span>Espace trésorier</span>
              </DropdownMenu.Item>
            ) : null}
            <DropdownMenu.Item
              onSelect={() => onProfile?.()}
              className={cn(
                'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2',
                'text-[14px] text-text outline-none',
                'data-[highlighted]:bg-neutral-100'
              )}
            >
              <Icon name="User" size={16} />
              <span>Profil</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => onLogout?.()}
              className={cn(
                'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2',
                'text-[14px] text-text outline-none',
                'data-[highlighted]:bg-neutral-100'
              )}
            >
              <Icon name="LogOut" size={16} />
              <span>Déconnexion</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  )
}
