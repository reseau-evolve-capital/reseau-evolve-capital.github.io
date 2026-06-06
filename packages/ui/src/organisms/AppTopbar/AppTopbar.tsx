'use client'
import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Avatar } from '../../atoms/Avatar'
import { Icon } from '../../atoms/Icon'
import { Logo } from '../../atoms/Logo'
import { cn } from '../../lib/cn'
import type { AppHeaderUser } from '../AppHeader'

/** Libellés textuels externalisables (i18n). Défauts FR si non fournis. */
export interface AppTopbarLabels {
  /** `aria-label` du trigger du menu. Défaut : « Menu utilisateur ». */
  userMenu?: string
  /** Entrée admin du menu. Défaut : « Espace trésorier ». */
  admin?: string
  /** Entrée profil du menu. Défaut : « Profil ». */
  profile?: string
  /** Entrée déconnexion du menu. Défaut : « Déconnexion ». */
  logout?: string
}

export interface AppTopbarProps {
  user: AppHeaderUser
  /**
   * Composant lien injecté par l'app (ex: Next `<Link>`). Accepté pour
   * cohérence d'API avec les autres organismes du shell ; le menu utilisateur
   * remonte ses actions par callbacks, donc ce composant n'est pas consommé ici.
   */
  linkComponent?: React.ElementType
  onProfile?: () => void
  onLogout?: () => void
  /** Affiche l'entrée « Espace trésorier » dans le menu (rôle ≥ trésorier). */
  canAccessAdmin?: boolean
  /** Action déclenchée par l'entrée admin (ex: router.push('/admin')). */
  onAdmin?: () => void
  /** Statut de synchronisation (ex. « Synchronisé il y a 14 min »), desktop seulement. */
  syncLabel?: string
  /** Pilule date (ex. « Vendredi 24 avril 2026 »), desktop seulement. */
  dateLabel?: string
  /** Slot pour le bouton de bascule de thème (ex. `<ThemeToggle />`). */
  themeToggle?: React.ReactNode
  /** Slot pour le sélecteur de langue (ex. `<LocaleSwitcher />`), avant le thème. */
  localeSwitcher?: React.ReactNode
  /** Affiche le logo sur mobile (la sidebar étant cachée). Défaut true. */
  showLogoOnMobile?: boolean
  /** URL du logo de marque (l'app injecte `/logo.jpg`). Fallback SVG si absent. */
  logoSrc?: string
  /** Libellés textuels (i18n). Chaque clé absente retombe sur son défaut FR. */
  labels?: AppTopbarLabels
  className?: string
}

/**
 * Barre supérieure du shell desktop à sidebar. Présentationnel : aucune
 * dépendance à `next/*`. Réutilise le menu utilisateur Radix d'AppHeader
 * (Profil / Déconnexion / Espace trésorier conditionnel).
 *
 * Sur mobile (sidebar cachée), affiche le logo à gauche. Sur desktop, affiche
 * le statut de synchronisation. À droite : pilule date, slot thème, menu user.
 */
export function AppTopbar({
  user,
  // `linkComponent` est accepté par l'interface mais non consommé (cf. JSDoc).
  onProfile,
  onLogout,
  canAccessAdmin = false,
  onAdmin,
  syncLabel,
  dateLabel,
  themeToggle,
  localeSwitcher,
  showLogoOnMobile = true,
  logoSrc,
  labels,
  className,
}: AppTopbarProps) {
  const userMenuLabel = labels?.userMenu ?? 'Menu utilisateur'
  const adminLabel = labels?.admin ?? 'Espace trésorier'
  const profileLabel = labels?.profile ?? 'Profil'
  const logoutLabel = labels?.logout ?? 'Déconnexion'

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-16',
        'bg-card border-b border-border',
        'flex items-center justify-between px-4 md:px-6',
        className
      )}
    >
      {/* Gauche : logo (mobile) ou statut sync (desktop). */}
      <div className="flex items-center">
        {showLogoOnMobile ? (
          <div className="md:hidden">
            <Logo variant="full" src={logoSrc} />
          </div>
        ) : null}

        {syncLabel ? (
          <span className="hidden md:inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-data-positive" aria-hidden="true" />
            <span className="font-mono uppercase tracking-wide text-[12px] text-text-ter">
              {syncLabel}
            </span>
          </span>
        ) : null}
      </div>

      {/* Droite : date, langue, thème, menu utilisateur. */}
      <div className="flex items-center gap-2 md:gap-3">
        {dateLabel ? (
          <span className="hidden md:inline-flex rounded-full border border-border px-3 py-1 text-[13px] text-text-sec">
            {dateLabel}
          </span>
        ) : null}

        {localeSwitcher}
        {themeToggle}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={userMenuLabel}
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
                  <Icon name="ShieldCheck" size={16} aria-hidden="true" />
                  <span>{adminLabel}</span>
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
                <Icon name="User" size={16} aria-hidden="true" />
                <span>{profileLabel}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => onLogout?.()}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2',
                  'text-[14px] text-text outline-none',
                  'data-[highlighted]:bg-neutral-100'
                )}
              >
                <Icon name="LogOut" size={16} aria-hidden="true" />
                <span>{logoutLabel}</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
