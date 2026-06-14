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
  /** Action déclenchée par le bouton de feedback. Si absent, l'icône n'est pas rendue (non destructif). */
  onFeedback?: () => void
  /** Libellé du bouton de feedback (aria-label). Défaut : « Retour ». */
  feedbackLabel?: string
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
  /** Nom du club actif. Sur MOBILE, remplace le logotype de marque (le logo reste) —
   *  tronqué en ellipsis pour les noms longs (QA 2026-06-07). Absent → logotype complet. */
  clubName?: string
  /** URL du logo de marque (l'app injecte `/icons/icon-192.png`). Fallback SVG si absent. */
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
  onFeedback,
  feedbackLabel,
  syncLabel,
  dateLabel,
  themeToggle,
  localeSwitcher,
  showLogoOnMobile = true,
  logoSrc,
  clubName,
  labels,
  className,
}: AppTopbarProps) {
  const userMenuLabel = labels?.userMenu ?? 'Menu utilisateur'
  const adminLabel = labels?.admin ?? 'Espace trésorier'
  const profileLabel = labels?.profile ?? 'Profil'
  const logoutLabel = labels?.logout ?? 'Déconnexion'
  const feedbackText = feedbackLabel ?? 'Retour'

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-16',
        'bg-card border-b border-border',
        'flex items-center justify-between px-4 md:px-6',
        className
      )}
    >
      {/* Gauche : logo + nom de club (mobile) ou statut sync (desktop). min-w-0 pour
          autoriser l'ellipsis du nom de club. */}
      <div className="flex min-w-0 items-center">
        {showLogoOnMobile ? (
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            {clubName ? (
              <>
                <Logo variant="mark" src={logoSrc} />
                <span className="truncate font-display text-[15px] font-bold leading-tight text-text">
                  {clubName}
                </span>
              </>
            ) : (
              <Logo variant="full" src={logoSrc} />
            )}
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

      {/* Droite : date, langue (desktop), thème, menu utilisateur. shrink-0 pour ne pas
          être compressé par le nom de club à gauche. */}
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {dateLabel ? (
          <span className="hidden md:inline-flex rounded-full border border-border px-3 py-1 text-[13px] text-text-sec">
            {dateLabel}
          </span>
        ) : null}

        {/* Langue : dans le header sur desktop ; déplacée dans le menu profil sur mobile
            (aère le header — QA 2026-06-07). */}
        {localeSwitcher ? <span className="hidden md:inline-flex">{localeSwitcher}</span> : null}

        {/* Feedback : visible desktop ET mobile (à côté de l'avatar). Rendu seulement si
            l'action est fournie (non destructif). Hit-target 44×44. */}
        {onFeedback ? (
          <button
            type="button"
            aria-label={feedbackText}
            onClick={onFeedback}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-md)]',
              'bg-transparent text-text-sec',
              'transition-[background-color,color,box-shadow] duration-[150ms]',
              'hover:bg-card-sub hover:text-text',
              'focus:outline-none focus-visible:shadow-[var(--sh-glow)]'
            )}
          >
            <Icon name="MessageCircle" size={20} aria-hidden="true" />
          </button>
        ) : null}

        {/* Thème : dans le header sur desktop ; déplacé dans le menu profil sur mobile
            (miroir de localeSwitcher). */}
        {themeToggle ? <span className="hidden md:inline-flex">{themeToggle}</span> : null}

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
              {/* Langue dans le menu sur mobile uniquement (déplacée hors du header). */}
              {localeSwitcher ? (
                <div className="md:hidden">
                  <div className="flex justify-center px-3 py-2">{localeSwitcher}</div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                </div>
              ) : null}
              {/* Thème dans le menu sur mobile uniquement (miroir de localeSwitcher). */}
              {themeToggle ? (
                <div className="md:hidden">
                  <div className="flex justify-center px-3 py-2">{themeToggle}</div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                </div>
              ) : null}
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
