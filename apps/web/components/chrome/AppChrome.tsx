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
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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

/** Nav latérale desktop — libellés alignés sur la réf. */
const SIDEBAR_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille du club', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Mes cotisations', href: '/contributions', icon: 'Calendar' },
  { label: 'Réseau des clubs', href: '#', icon: 'Waypoints', disabled: true },
]

/** BottomNav mobile — 3 onglets (décision V0), libellés courts. */
const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Tableau', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar' },
]

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
  const pathname = usePathname()
  const items: NavItem[] = isStaff
    ? [...SIDEBAR_ITEMS, { label: 'Espace trésorier', href: '/admin', icon: 'ShieldCheck' }]
    : SIDEBAR_ITEMS
  return (
    <Sidebar
      items={items}
      activeHref={resolveActiveHref(pathname, items)}
      linkComponent={Link}
      clubActif={clubActif}
    />
  )
}

export function AppChromeTopbar({
  user,
  isStaff,
  syncLabel,
  dateLabel,
}: {
  user: AppHeaderUser
  isStaff: boolean
  syncLabel?: string
  dateLabel?: string
}) {
  const router = useRouter()
  const supabase = useSupabase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AppTopbar
      user={user}
      linkComponent={Link}
      canAccessAdmin={isStaff}
      onAdmin={() => router.push('/admin')}
      onProfile={() => router.push('/onboarding')}
      onLogout={() => {
        void handleLogout()
      }}
      syncLabel={syncLabel}
      dateLabel={dateLabel}
      themeToggle={<ThemeToggle />}
    />
  )
}

export function AppChromeBottom() {
  const pathname = usePathname()
  return (
    <BottomNav
      items={BOTTOM_ITEMS}
      activeHref={resolveActiveHref(pathname, BOTTOM_ITEMS)}
      linkComponent={Link}
    />
  )
}
