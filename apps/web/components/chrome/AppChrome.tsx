'use client'
// Chrome applicatif câblé pour les écrans (app) : branche le `<Link>` Next, calcule
// l'onglet actif depuis `usePathname()` et gère la déconnexion via Supabase.
//
// Deux composants client distincts (et NON un objet de JSX renvoyé à un composant
// serveur) pour respecter la frontière RSC : `AppChromeHeader` (en-tête + menu)
// et `AppChromeBottom` (barre mobile).
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AppHeader, BottomNav, type AppHeaderUser, type NavItem } from '@evolve/ui'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Portefeuille', href: '/portfolio', icon: 'ChartPie' },
  { label: 'Cotisations', href: '/contributions', icon: 'Calendar' },
]

/** Détermine l'onglet actif : préfixe du pathname courant. */
function resolveActiveHref(pathname: string | null): string {
  if (!pathname) return NAV_ITEMS[0]!.href
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
  return match?.href ?? NAV_ITEMS[0]!.href
}

export function AppChromeHeader({ user, isStaff }: { user: AppHeaderUser; isStaff: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AppHeader
      items={NAV_ITEMS}
      activeHref={resolveActiveHref(pathname)}
      user={user}
      linkComponent={Link}
      canAccessAdmin={isStaff}
      onAdmin={() => router.push('/admin')}
      onProfile={() => router.push('/onboarding')}
      onLogout={() => {
        void handleLogout()
      }}
    />
  )
}

export function AppChromeBottom() {
  const pathname = usePathname()
  return (
    <BottomNav items={NAV_ITEMS} activeHref={resolveActiveHref(pathname)} linkComponent={Link} />
  )
}
