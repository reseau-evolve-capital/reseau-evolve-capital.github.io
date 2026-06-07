'use client'

// Sous-navigation de l'espace trésorier (ADM-007). L'app réutilise la sidebar membre + un lien
// « Espace trésorier » ; on ajoute ici une barre d'onglets en tête des pages /admin
// (Tableau de bord / Membres / Cotisations / Invitations). Comble aussi l'absence de nav entre
// les sous-pages admin (orphelines avant ADM-007). aria-current sur l'onglet actif ; tap ≥44px.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Icon, type IconName } from '@evolve/ui'

interface Tab {
  key: 'dashboard' | 'members' | 'cotisations' | 'invitations' | 'newsletter' | 'settings'
  href: string
  icon: IconName
}

const TABS: Tab[] = [
  { key: 'dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { key: 'members', href: '/admin/members', icon: 'Users' },
  { key: 'cotisations', href: '/admin/cotisations', icon: 'Calendar' },
  { key: 'invitations', href: '/admin/invitations', icon: 'Mail' },
  { key: 'newsletter', href: '/admin/newsletter', icon: 'Newspaper' },
  { key: 'settings', href: '/admin/settings', icon: 'Settings' },
]

// /admin est préfixe de /admin/members → match exact pour le dashboard, préfixe pour le reste.
function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

export function AdminTabs() {
  const t = useTranslations('admin.tabs')
  const pathname = usePathname()

  return (
    <nav aria-label={t('navLabel')} className="border-b border-border">
      <ul className="flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href)
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center gap-2 border-b-2 px-3 py-3 text-[14px] font-medium transition-colors ${
                  active
                    ? 'border-brand-yellow text-text'
                    : 'border-transparent text-text-sec hover:text-text'
                }`}
              >
                <Icon name={tab.icon} size={16} aria-hidden="true" />
                {t(tab.key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
