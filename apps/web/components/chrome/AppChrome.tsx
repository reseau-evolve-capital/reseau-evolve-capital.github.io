'use client'
// Chrome applicatif câblé pour les écrans (app).
//
// Shell desktop fidèle à la réf : SIDEBAR gauche (nav + carte CLUB ACTIF) +
// TOPBAR (sync + date + toggle thème + menu utilisateur). Sur mobile : la sidebar
// et la topbar sync/date se masquent, la TOPBAR montre logo + menu, et la BottomNav
// (3 onglets, décision V0) prend le relais de la navigation.
//
// Composants client distincts pour respecter la frontière RSC : la sidebar et la
// topbar reçoivent leurs données (user, club, sync, date) depuis le layout serveur.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMessages, useTranslations } from 'next-intl'
import {
  Sidebar,
  AppTopbar,
  BottomNav,
  FeedbackSheet,
  ThemeToggle,
  type AppHeaderUser,
  type FeedbackLabels,
  type FeedbackSubmission,
  type NavItem,
  type SidebarClub,
} from '@evolve/ui'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { LocaleSwitcherClient } from '@/components/i18n/LocaleSwitcherClient'
import { submitFeedbackAction } from '@/lib/feedback/actions'
import { clearPwaDataCaches } from '@/lib/pwa/register-sw'
import { BRAND_LOGO_SRC } from '@/lib/brand'
import { ClubSwitcher, type ClubSwitcherClub } from '@/components/chrome/ClubSwitcher'
import { SKIP_PUSH_PROMPT_ONCE_KEY } from '@/lib/push/skip-prompt'
import { setActiveClub } from '@/app/(app)/actions'

// Logo de marque servi par l'app (source unique : @/lib/brand → tuile crème
// icon-192.png, fond #F4F4F2, artwork centré) pour la topbar et la sidebar web.
const LOGO_SRC = BRAND_LOGO_SRC

/**
 * Type des libellés de nav traduits, indexé par fonction `t` du namespace `nav`.
 * Les `href`/`icon`/`disabled` restent figés ; seuls les `label` sont injectés.
 */
type NavT = ReturnType<typeof useTranslations<'nav'>>

/** Nav latérale desktop — libellés alignés sur la réf, traduits via `nav.sidebar`.
 *  L'item « Réseau » est role-aware (NET-002) : lien actif vers /reseau pour un membre
 *  réseau, sinon teaser désactivé (« Bientôt »). */
function sidebarItems(t: NavT, isNetworkMember: boolean): NavItem[] {
  return [
    { label: t('sidebar.dashboard'), href: '/dashboard', icon: 'LayoutDashboard' },
    { label: t('sidebar.portfolio'), href: '/portfolio', icon: 'ChartPie' },
    { label: t('sidebar.contributions'), href: '/contributions', icon: 'Calendar' },
    isNetworkMember
      ? { label: t('sidebar.network'), href: '/reseau', icon: 'Waypoints' }
      : { label: t('sidebar.network'), href: '#', icon: 'Waypoints', disabled: true },
  ]
}

/** BottomNav mobile — 4 onglets (NET-002), libellés courts via `nav.bottom`. L'onglet
 *  « Réseau » est role-aware : lien actif vers /reseau pour un membre réseau, sinon teaser
 *  désactivé (rendu en `<span>` non cliquable par BottomNav). */
function bottomItems(t: NavT, isNetworkMember: boolean): NavItem[] {
  return [
    { label: t('bottom.dashboard'), href: '/dashboard', icon: 'LayoutDashboard' },
    { label: t('bottom.portfolio'), href: '/portfolio', icon: 'ChartPie' },
    { label: t('bottom.contributions'), href: '/contributions', icon: 'Calendar' },
    isNetworkMember
      ? { label: t('bottom.network'), href: '/reseau', icon: 'Waypoints' }
      : { label: t('bottom.network'), href: '#', icon: 'Waypoints', disabled: true },
  ]
}

/** Onglet actif : correspondance exacte ou préfixe du pathname courant. */
function resolveActiveHref(pathname: string | null, items: NavItem[]): string {
  const fallback = items[0]?.href ?? '/dashboard'
  if (!pathname) return fallback
  const match = items.find(
    (item) => !item.disabled && (pathname === item.href || pathname.startsWith(`${item.href}/`))
  )
  return match?.href ?? fallback
}

export function AppChromeSidebar({
  isStaff,
  isNetworkMember = false,
  clubActif,
  allClubs,
  activeClubId,
}: {
  isStaff: boolean
  /** Membre de l'équipe RÉSEAU (NET-002) : active l'item « Réseau » (sinon teaser « Bientôt »). */
  isNetworkMember?: boolean
  clubActif?: SidebarClub
  /** Liste de toutes les adhésions actives du membre (pour le ClubSwitcher). */
  allClubs?: ClubSwitcherClub[]
  /** club_id du club actif (pour pré-sélectionner le ClubSwitcher). */
  activeClubId?: string
}) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const base = sidebarItems(t, isNetworkMember)
  const items: NavItem[] = isStaff
    ? [...base, { label: t('sidebar.admin'), href: '/admin', icon: 'ShieldCheck' }]
    : base

  // ClubSwitcher : affiché uniquement si l'utilisateur a ≥ 2 clubs ET qu'on a un club actif.
  const clubSwitcher =
    allClubs && allClubs.length >= 2 && activeClubId ? (
      <ClubSwitcher
        clubs={allClubs}
        activeClubId={activeClubId}
        ariaLabel={t('sidebar.clubTitle')}
      />
    ) : undefined

  return (
    <Sidebar
      items={items}
      activeHref={resolveActiveHref(pathname, items)}
      linkComponent={Link}
      clubActif={clubActif}
      logoSrc={LOGO_SRC}
      labels={{
        section: t('sidebar.section'),
        navLabel: t('sidebar.navLabel'),
        notification: t('sidebar.notification'),
        soon: t('sidebar.soon'),
        clubTitle: t('sidebar.clubTitle'),
      }}
      footer={clubSwitcher}
    />
  )
}

export function AppChromeTopbar({
  user,
  isStaff,
  syncLabel,
  dateLabel,
  clubActif,
  allClubs,
  activeClubId,
  hasPollActivity = false,
  pollsToVote = 0,
}: {
  user: AppHeaderUser
  isStaff: boolean
  syncLabel?: string
  dateLabel?: string
  clubActif?: SidebarClub
  /** Liste de toutes les adhésions actives (NAV-001) : entrée « Changer de club » si ≥ 2. */
  allClubs?: ClubSwitcherClub[]
  /** club_id du club actif (option surlignée dans le sélecteur du menu avatar). */
  activeClubId?: string
  /** Vrai si ≥ 1 vote open|closed visible du club (spec §5 — entrée « Votes » conditionnelle). */
  hasPollActivity?: boolean
  /** Nombre de votes ouverts non encore votés (badge entrée Votes + pastille avatar). 0 = rien. */
  pollsToVote?: number
}) {
  // Entrée « Votes » (spec §7) : portée par le point d'extension d'AppTopbar (@evolve/ui) —
  // `onVotes` + `pollsToVote` rendent l'entrée DANS le menu avatar (entre Profil et
  // Déconnexion) et la pastille « non lu » sur l'avatar. Conditionnelle à `hasPollActivity`
  // (on ne passe `onVotes` que dans ce cas).
  const t = useTranslations('nav')
  const messages = useMessages()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()

  // Feedback Widget (LOT D) : état d'ouverture local + sheet monté à côté de la topbar
  // (résout R1 : pas de <AppChrome> racine). L'icône déclencheuse vit dans AppTopbar.
  // L'utilisateur joint lui-même jusqu'à 3 images dans le sheet (plus de capture auto).
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // Objet de labels i18n : `useMessages()` renvoie l'arbre complet typé (typeof fr via
  // global.d.ts), donc `messages.feedback` EST le sous-objet de labels — on évite `t('feedback')`
  // qui ne renverrait qu'une string. La forme correspond à l'interface FeedbackLabels.
  const feedbackLabels = messages.feedback as FeedbackLabels

  // Submit → Server Action. Le FeedbackSheet attend une promesse qui REJETTE en cas d'échec
  // (→ état error, type+message+images conservés) et résout sinon (→ état success).
  // `data.imageDataUrls` (≤3) est transmis tel quel : la Server Action gère le multi-upload.
  const handleFeedbackSubmit = useCallback(async (data: FeedbackSubmission) => {
    const res = await submitFeedbackAction(data)
    if (!res.ok) throw new Error(res.error)
  }, [])

  // Ticket C : les entrées « Profil »/« Admin » du menu utilisateur naviguent via
  // `router.push` (callbacks AppTopbar de @evolve/ui) — contrairement à <Link>, push ne
  // préfetch RIEN → payload RSC demandé au tap = skeleton garanti. On préfetch au mount
  // pour que le Router Cache (staleTimes.dynamic) soit déjà chaud au moment du clic.
  // (Changer l'API AppTopbar vers linkComponent = chantier packages/ui, non indispensable.)
  useEffect(() => {
    router.prefetch('/profil')
    if (isStaff) router.prefetch('/admin')
    if (hasPollActivity) router.prefetch('/votes')
  }, [router, isStaff, hasPollActivity])

  const handleLogout = async () => {
    // PWA-001 : purge le cache de données du SW pour ne pas laisser de données financières
    // en cache sur l'appareil après déconnexion.
    clearPwaDataCaches()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // NAV-001 : changement de club actif depuis le menu avatar (mobile ET desktop). Réutilise
  // la MÊME mécanique que le ClubSwitcher de la sidebar (Server Action `setActiveClub` →
  // cookie de préférence, puis reload COMPLET). Le reload recharge le club actif partout
  // (RSC + état client) en une fois — un simple router.refresh laissait des caches par écran.
  // Drapeau one-shot avant reload : ne pas rouvrir le pre-prompt push à cause de ce reload.
  const handleClubChange = useCallback((clubId: string) => {
    void setActiveClub(clubId).then((result) => {
      if (!result.ok) return
      try {
        sessionStorage.setItem(SKIP_PUSH_PROMPT_ONCE_KEY, '1')
      } catch {
        /* sessionStorage indispo (mode privé strict) : sans gravité, le cooldown 7j gère. */
      }
      window.location.reload()
    })
  }, [])

  return (
    <>
      {/* Entrée « Votes » (spec §5/§7) : dans le menu avatar d'AppTopbar, entre Profil et
          Déconnexion (desktop ET mobile), avec pastille « non lu » sur l'avatar quand un vote
          attend une réponse. Conditionnelle à `hasPollActivity` (on ne passe `onVotes` que dans
          ce cas → entrée masquée sinon, non destructif). */}
      <AppTopbar
        user={user}
        linkComponent={Link}
        canAccessAdmin={isStaff}
        onAdmin={() => router.push('/admin')}
        onProfile={() => router.push('/profil')}
        onVotes={hasPollActivity ? () => router.push('/votes') : undefined}
        pollsToVote={pollsToVote}
        onLogout={() => {
          void handleLogout()
        }}
        onFeedback={() => setFeedbackOpen(true)}
        feedbackLabel={t('topbar.feedback')}
        syncLabel={syncLabel}
        dateLabel={dateLabel}
        clubs={allClubs?.map((c) => ({ id: c.club_id, name: c.name, city: c.city }))}
        activeClubId={activeClubId}
        onClubChange={handleClubChange}
        localeSwitcher={<LocaleSwitcherClient />}
        themeToggle={
          <ThemeToggle
            toggleLabel={t('themeToggle.toggle')}
            switchToLightLabel={t('themeToggle.switchToLight')}
            switchToDarkLabel={t('themeToggle.switchToDark')}
          />
        }
        logoSrc={LOGO_SRC}
        clubName={clubActif?.name}
        labels={{
          userMenu: t('topbar.userMenu'),
          admin: t('topbar.admin'),
          profile: t('topbar.profile'),
          logout: t('topbar.logout'),
          votes: t('topbar.votes'),
          changeClub: t('topbar.changeClub'),
          clubSelectorTitle: t('topbar.clubSelectorTitle'),
          clubSelectorSubtitle: t('topbar.clubSelectorSubtitle'),
          clubSelectorClose: t('topbar.clubSelectorClose'),
          activeClub: t('topbar.activeClub'),
        }}
      />
      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        currentRoute={pathname ?? '/'}
        onSubmit={handleFeedbackSubmit}
        labels={feedbackLabels}
      />
    </>
  )
}

export function AppChromeBottom({ isNetworkMember = false }: { isNetworkMember?: boolean }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const items = bottomItems(t, isNetworkMember)
  return (
    <BottomNav
      items={items}
      activeHref={resolveActiveHref(pathname, items)}
      linkComponent={Link}
      navLabel={t('bottom.navLabel')}
    />
  )
}
