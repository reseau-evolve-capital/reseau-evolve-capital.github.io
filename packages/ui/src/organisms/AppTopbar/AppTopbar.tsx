'use client'
import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'
import { Avatar } from '../../atoms/Avatar'
import { Icon } from '../../atoms/Icon'
import { Logo } from '../../atoms/Logo'
import { cn } from '../../lib/cn'
import type { AppHeaderUser } from '../AppHeader'

/** Club éligible au sélecteur de club actif (NAV-001). Présentationnel : pas de dépendance data. */
export interface AppTopbarClub {
  /** Identifiant du club (clé remontée par `onClubChange`). */
  id: string
  /** Nom affiché du club. */
  name: string
  /** Ville/sous-titre optionnel affiché à côté du nom. */
  city?: string | null
}

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
  /** Entrée votes du menu. Défaut : « Votes ». */
  votes?: string
  /** Entrée « Changer de club » du menu (NAV-001). Défaut : « Changer de club ». */
  changeClub?: string
  /** Titre du sélecteur de club (Dialog/bottom-sheet). Défaut : « Changer de club ». */
  clubSelectorTitle?: string
  /** Sous-titre du sélecteur de club. Défaut : « Sélectionnez le club à afficher. ». */
  clubSelectorSubtitle?: string
  /** `aria-label` du bouton fermer du sélecteur. Défaut : « Fermer ». */
  clubSelectorClose?: string
  /** Mention « club actif » (badge sur l'option courante + rappel sous l'entrée). Défaut : « Club actif ». */
  activeClub?: string
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
  /**
   * Action de l'entrée « Votes » du menu utilisateur (ex: router.push('/votes')).
   * Si absent, l'entrée n'est pas rendue (non destructif, comme `onAdmin`/`onFeedback`).
   * L'app la fournit dès qu'il y a une activité de vote visible (spec §5/§7).
   */
  onVotes?: () => void
  /**
   * Nombre de votes ouverts non encore votés. > 0 → badge chiffré dans l'entrée Votes
   * ET pastille « non lu » sur l'avatar (indicateur de notification). 0 = aucun.
   */
  pollsToVote?: number
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
  /**
   * Liste des clubs du membre (NAV-001). Si ≥ 2 clubs ET `onClubChange` fourni, une entrée
   * « Changer de club » apparaît dans le menu avatar (desktop ET mobile) ouvrant un sélecteur.
   * Mono-club (< 2) ⇒ aucune entrée (non destructif).
   */
  clubs?: AppTopbarClub[]
  /** `id` du club actif (option surlignée dans le sélecteur + rappelée sous l'entrée du menu). */
  activeClubId?: string
  /** Action déclenchée au choix d'un club dans le sélecteur (l'app pose le cookie + recharge). */
  onClubChange?: (clubId: string) => void
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
  onVotes,
  pollsToVote = 0,
  onFeedback,
  feedbackLabel,
  syncLabel,
  dateLabel,
  themeToggle,
  localeSwitcher,
  clubs,
  activeClubId,
  onClubChange,
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
  const votesLabel = labels?.votes ?? 'Votes'
  const changeClubLabel = labels?.changeClub ?? 'Changer de club'
  const clubSelectorTitle = labels?.clubSelectorTitle ?? 'Changer de club'
  const clubSelectorSubtitle = labels?.clubSelectorSubtitle ?? 'Sélectionnez le club à afficher.'
  const clubSelectorCloseLabel = labels?.clubSelectorClose ?? 'Fermer'
  const activeClubLabel = labels?.activeClub ?? 'Club actif'
  const feedbackText = feedbackLabel ?? 'Retour'

  // Votes : badge chiffré (capé « 9+ ») + pastille « non lu » sur l'avatar.
  const hasUnreadVotes = pollsToVote > 0
  const pollsBadge = hasUnreadVotes ? (pollsToVote > 9 ? '9+' : String(pollsToVote)) : null

  // Changement de club (NAV-001) : entrée + sélecteur visibles uniquement si ≥ 2 clubs
  // ET un handler fourni (non destructif). État local d'ouverture du sélecteur.
  const clubList = clubs ?? []
  const canSwitchClub = clubList.length >= 2 && !!onClubChange
  const [clubSelectorOpen, setClubSelectorOpen] = React.useState(false)
  const activeClub = clubList.find((c) => c.id === activeClubId)

  const handleClubSelect = (clubId: string) => {
    setClubSelectorOpen(false)
    if (clubId !== activeClubId) onClubChange?.(clubId)
  }

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
            aria-label={hasUnreadVotes ? `${userMenuLabel} (${pollsToVote})` : userMenuLabel}
            className={cn(
              'relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full',
              'transition-shadow duration-[150ms]',
              'focus:outline-none focus-visible:shadow-[var(--sh-glow)]'
            )}
          >
            <Avatar name={user.fullName} src={user.avatarUrl ?? undefined} size="md" />
            {/* Pastille « non lu » : signale qu'au moins un vote attend une réponse. Décorative
                (aria-hidden) — le compte est porté par l'aria-label du trigger et l'entrée Votes
                du menu. Anneau couleur surface pour détacher la pastille de l'avatar. */}
            {hasUnreadVotes ? (
              <span
                data-testid="topbar-votes-dot"
                aria-hidden="true"
                className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-yellow ring-2 ring-card"
              />
            ) : null}
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
              {/* Votes (spec §7) : entre Profil et Déconnexion. Rendue seulement si `onVotes`
                  est fourni (l'app le passe dès qu'il y a une activité de vote). Badge chiffré
                  des votes à faire ; le compte est porté dans l'aria-label de l'entrée. */}
              {onVotes ? (
                <DropdownMenu.Item
                  onSelect={() => onVotes?.()}
                  aria-label={pollsBadge ? `${votesLabel} (${pollsToVote})` : undefined}
                  className={cn(
                    'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2',
                    'text-[14px] text-text outline-none',
                    'data-[highlighted]:bg-neutral-100'
                  )}
                >
                  <Icon name="Vote" size={16} aria-hidden="true" />
                  <span className="flex-1">{votesLabel}</span>
                  {pollsBadge ? (
                    <span
                      aria-hidden="true"
                      className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand-yellow px-1 text-[11px] font-bold leading-[18px] text-accent-ink"
                    >
                      {pollsBadge}
                    </span>
                  ) : null}
                </DropdownMenu.Item>
              ) : null}
              {/* Changer de club (NAV-001) : juste avant Déconnexion, uniquement si ≥ 2 clubs.
                  Rappelle le club actif sous le libellé. `onSelect` ferme le menu Radix ; on
                  ouvre le sélecteur au tick suivant pour éviter un conflit de focus-trap. */}
              {canSwitchClub ? (
                <DropdownMenu.Item
                  data-testid="topbar-change-club"
                  onSelect={(event) => {
                    event.preventDefault()
                    // Laisse le DropdownMenu se fermer proprement avant d'ouvrir le Dialog.
                    setTimeout(() => setClubSelectorOpen(true), 0)
                  }}
                  className={cn(
                    'flex cursor-pointer select-none items-start gap-2 rounded-sm px-3 py-2',
                    'text-[14px] text-text outline-none',
                    'data-[highlighted]:bg-neutral-100'
                  )}
                >
                  <Icon name="RefreshCw" size={16} aria-hidden="true" className="mt-0.5" />
                  <span className="flex min-w-0 flex-col">
                    <span>{changeClubLabel}</span>
                    {activeClub ? (
                      <span className="truncate text-[12px] text-text-ter">
                        {activeClubLabel} · {activeClub.name}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenu.Item>
              ) : null}
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

      {/* Sélecteur de club (NAV-001) — Dialog desktop centré / bottom-sheet mobile. Le club
          actif est surligné (token data-positive ; jamais le rouge brand). Monté seulement
          si le switch est possible. */}
      {canSwitchClub ? (
        <ClubSelectorSheet
          open={clubSelectorOpen}
          onOpenChange={setClubSelectorOpen}
          clubs={clubList}
          activeClubId={activeClubId}
          onSelect={handleClubSelect}
          title={clubSelectorTitle}
          subtitle={clubSelectorSubtitle}
          closeLabel={clubSelectorCloseLabel}
          activeLabel={activeClubLabel}
        />
      ) : null}
    </header>
  )
}

/* ── Sélecteur de club ─────────────────────────────────────────────────────── */

interface ClubSelectorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubs: AppTopbarClub[]
  activeClubId?: string
  onSelect: (clubId: string) => void
  title: string
  subtitle: string
  closeLabel: string
  activeLabel: string
}

/**
 * Sélecteur de club actif. Bottom-sheet ancré bas sur mobile, modale centrée 420px sur
 * desktop (Radix Dialog : focus-trap, Escape, Title + Description). Chaque club est un
 * bouton ≥ 44px ; le club actif porte une bordure + check `data-positive`.
 */
function ClubSelectorSheet({
  open,
  onOpenChange,
  clubs,
  activeClubId,
  onSelect,
  title,
  subtitle,
  closeLabel,
  activeLabel,
}: ClubSelectorSheetProps) {
  const descId = React.useId()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={cn(
            'fixed z-50 bg-card shadow-[var(--sh-modal)] focus:outline-none',
            // Mobile : bottom-sheet ancré bas.
            'inset-x-0 bottom-0 w-full rounded-t-[var(--r-lg)] border border-border',
            'px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]',
            // Desktop : modale centrée.
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--r-lg)] sm:p-7',
            'max-h-[92vh] overflow-y-auto',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[220ms]'
          )}
        >
          {/* Grab-handle mobile (décoratif). */}
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong sm:hidden"
            aria-hidden="true"
          />

          <Dialog.Title className="font-display text-[20px] font-extrabold leading-tight text-text">
            {title}
          </Dialog.Title>
          <Dialog.Description id={descId} className="mt-1 text-[13px] text-text-sec">
            {subtitle}
          </Dialog.Description>

          <ul className="mt-5 flex list-none flex-col gap-2 p-0">
            {clubs.map((club) => {
              const isActive = club.id === activeClubId
              return (
                <li key={club.id}>
                  <button
                    type="button"
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => onSelect(club.id)}
                    className={cn(
                      'flex w-full min-h-[52px] items-center gap-3 rounded-[var(--r-md)] px-4 text-left',
                      'border bg-card transition-colors duration-[150ms]',
                      'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
                      isActive
                        ? 'border-2 border-data-positive bg-data-positive-50'
                        : 'border border-border-strong hover:border-data-positive/50'
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-semibold text-text">
                        {club.name}
                      </span>
                      {club.city ? (
                        <span className="truncate text-[12px] text-text-ter">{club.city}</span>
                      ) : null}
                    </span>
                    {isActive ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-data-positive">
                        <span className="sr-only">{activeLabel}</span>
                        <Icon name="Check" size={20} aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>

          <Dialog.Close
            aria-label={closeLabel}
            className={cn(
              'absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center',
              'rounded-md text-text-ter hover:text-text-sec',
              'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none'
            )}
          >
            <Icon name="X" size={20} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
