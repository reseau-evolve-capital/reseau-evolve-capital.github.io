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
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Sidebar,
  AppTopbar,
  BottomNav,
  ThemeToggle,
  type AppHeaderUser,
  type NavItem,
  type SidebarClub,
} from '@evolve/ui'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { LocaleSwitcherClient } from '@/components/i18n/LocaleSwitcherClient'
import { clearPwaDataCaches } from '@/lib/pwa/register-sw'

/** Logo de marque servi par l'app (apps/web/public/logo.jpg). */
const LOGO_SRC = '/logo.jpg'

/**
 * Type des libellés de nav traduits, indexé par fonction `t` du namespace `nav`.
 * Les `href`/`icon`/`disabled` restent figés ; seuls les `label` sont injectés.
 */
type NavT = ReturnType<typeof useTranslations<'nav'>>

/** Nav latérale desktop — libellés alignés sur la réf, traduits via `nav.sidebar`. */
function sidebarItems(t: NavT): NavItem[] {
  return [
    { label: t('sidebar.dashboard'), href: '/dashboard', icon: 'LayoutDashboard' },
    { label: t('sidebar.portfolio'), href: '/portfolio', icon: 'ChartPie' },
    { label: t('sidebar.contributions'), href: '/contributions', icon: 'Calendar' },
    { label: t('sidebar.network'), href: '#', icon: 'Waypoints', disabled: true },
  ]
}

/** BottomNav mobile — 3 onglets (décision V0), libellés courts via `nav.bottom`. */
function bottomItems(t: NavT): NavItem[] {
  return [
    { label: t('bottom.dashboard'), href: '/dashboard', icon: 'LayoutDashboard' },
    { label: t('bottom.portfolio'), href: '/portfolio', icon: 'ChartPie' },
    { label: t('bottom.contributions'), href: '/contributions', icon: 'Calendar' },
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
  clubActif,
}: {
  isStaff: boolean
  clubActif?: SidebarClub
}) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const base = sidebarItems(t)
  const items: NavItem[] = isStaff
    ? [...base, { label: t('sidebar.admin'), href: '/admin', icon: 'ShieldCheck' }]
    : base
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
    />
  )
}

export function AppChromeTopbar({
  user,
  isStaff,
  syncLabel,
  dateLabel,
  clubActif,
}: {
  user: AppHeaderUser
  isStaff: boolean
  syncLabel?: string
  dateLabel?: string
  clubActif?: SidebarClub
}) {
  const t = useTranslations('nav')
  const router = useRouter()
  const supabase = useSupabase()

  // Ticket C : les entrées « Profil »/« Admin » du menu utilisateur naviguent via
  // `router.push` (callbacks AppTopbar de @evolve/ui) — contrairement à <Link>, push ne
  // préfetch RIEN → payload RSC demandé au tap = skeleton garanti. On préfetch au mount
  // pour que le Router Cache (staleTimes.dynamic) soit déjà chaud au moment du clic.
  // (Changer l'API AppTopbar vers linkComponent = chantier packages/ui, non indispensable.)
  useEffect(() => {
    router.prefetch('/profil')
    if (isStaff) router.prefetch('/admin')
  }, [router, isStaff])

  const handleLogout = async () => {
    // PWA-001 : purge le cache de données du SW pour ne pas laisser de données financières
    // en cache sur l'appareil après déconnexion.
    clearPwaDataCaches()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AppTopbar
      user={user}
      linkComponent={Link}
      canAccessAdmin={isStaff}
      onAdmin={() => router.push('/admin')}
      onProfile={() => router.push('/profil')}
      onLogout={() => {
        void handleLogout()
      }}
      syncLabel={syncLabel}
      dateLabel={dateLabel}
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
      }}
    />
  )
}

export function AppChromeBottom() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const items = bottomItems(t)
  return (
    <BottomNav
      items={items}
      activeHref={resolveActiveHref(pathname, items)}
      linkComponent={Link}
      navLabel={t('bottom.navLabel')}
    />
  )
}
