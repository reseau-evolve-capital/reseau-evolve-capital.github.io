'use client'

// Sous-navigation de l'espace RÉSEAU (NET-005). 4 onglets : Vue d'ensemble · Clubs · Annuaire ·
// Bureau. En NET-A, seul « Clubs » est branché → les 3 autres sont des teasers DÉSACTIVÉS
// (« Bientôt »), comme l'item « Réseau » de la nav globale (cf. AppChrome). aria-current sur
// l'onglet actif ; cibles ≥ 44px ; cursor géré globalement (`disabled` → not-allowed).
//
// DESKTOP : barre d'onglets horizontaux (md+), calquée sur AdminTabs (≠ scrollables mobiles).
// MOBILE  : bouton « Réseau ▾ » + DRAWER off-canvas (Radix Dialog) — PAS d'onglets scrollables
//           horizontaux (friction connue à ne pas reproduire, cf. spec PRD §Écran 1).
//
// Réf : AdminTabs (modèle desktop), FeedbackSheet (modèle Radix Dialog/drawer), spec E-NET.

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'
import { Icon, type IconName } from '@evolve/ui'

type TabKey = 'overview' | 'clubs' | 'directory' | 'board' | 'feedback'

interface Tab {
  key: TabKey
  /** Route cible. Les onglets désactivés ne sont pas des liens. */
  href: string
  icon: IconName
  /** true = teaser « Bientôt » (non cliquable) en NET-A. */
  disabled: boolean
}

const TABS: Tab[] = [
  { key: 'overview', href: '/reseau', icon: 'LayoutDashboard', disabled: true },
  { key: 'clubs', href: '/reseau/clubs', icon: 'Building2', disabled: false },
  { key: 'directory', href: '/reseau/annuaire', icon: 'Users', disabled: true },
  { key: 'board', href: '/reseau/bureau', icon: 'Crown', disabled: true },
  // « Retours » : console feedbacks réseau (NET-019) — branchée dans cette vague.
  { key: 'feedback', href: '/reseau/retours', icon: 'MessageSquare', disabled: false },
]

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

const BASE_TAB =
  'inline-flex min-h-[44px] items-center gap-2 border-b-2 px-3 py-3 text-[14px] font-medium transition-colors'

/** Onglet desktop : lien actif/inactif, ou teaser « Bientôt » désactivé. */
function DesktopTab({
  tab,
  active,
  label,
  soon,
}: {
  tab: Tab
  active: boolean
  label: string
  soon: string
}) {
  if (tab.disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${BASE_TAB} border-transparent text-text-ter`}
        title={soon}
      >
        <Icon name={tab.icon} size={16} aria-hidden="true" />
        {label}
        <span className="rounded-full bg-card-sub px-1.5 py-0.5 text-[10px] font-semibold text-text-ter">
          {soon}
        </span>
      </span>
    )
  }
  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={`${BASE_TAB} ${
        active
          ? 'border-brand-yellow text-text'
          : 'border-transparent text-text-sec hover:text-text'
      }`}
    >
      <Icon name={tab.icon} size={16} aria-hidden="true" />
      {label}
    </Link>
  )
}

export function ReseauTabs() {
  const t = useTranslations('reseau.tabs')
  const pathname = usePathname() ?? ''
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeTab = TABS.find((tab) => !tab.disabled && isActive(pathname, tab.href))
  const activeLabel = activeTab ? t(activeTab.key) : t('clubs')

  return (
    <>
      {/* DESKTOP — barre d'onglets horizontaux (md+). */}
      <nav aria-label={t('navLabel')} className="hidden border-b border-border md:block">
        <ul className="flex gap-1">
          {TABS.map((tab) => (
            <li key={tab.key}>
              <DesktopTab
                tab={tab}
                active={Boolean(activeTab && activeTab.key === tab.key)}
                label={t(tab.key)}
                soon={t('soon')}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* MOBILE — déclencheur du drawer off-canvas (< md). */}
      <div className="md:hidden">
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              className="inline-flex min-h-[44px] w-full items-center justify-between rounded-[10px] border border-border bg-card px-4 py-2 text-[14px] font-semibold text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                {activeTab && (
                  <Icon name={activeTab.icon} size={16} aria-hidden="true" className="shrink-0" />
                )}
                <span className="truncate">{activeLabel}</span>
              </span>
              <Icon
                name="ChevronDown"
                size={16}
                aria-hidden="true"
                className="shrink-0 text-text-ter"
              />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in" />
            <Dialog.Content
              aria-label={t('navLabel')}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[16px] border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] motion-safe:animate-in motion-safe:slide-in-from-bottom"
            >
              <Dialog.Title className="px-1 pb-2 font-display text-[16px] font-extrabold text-text">
                {t('drawerTitle')}
              </Dialog.Title>
              <Dialog.Description className="sr-only">{t('drawerDescription')}</Dialog.Description>
              <ul className="flex flex-col">
                {TABS.map((tab) => {
                  if (tab.disabled) {
                    return (
                      <li key={tab.key}>
                        <span
                          aria-disabled="true"
                          className="flex min-h-[44px] items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[15px] text-text-ter"
                        >
                          <span className="inline-flex min-w-0 items-center gap-3">
                            <Icon
                              name={tab.icon}
                              size={20}
                              aria-hidden="true"
                              className="shrink-0"
                            />
                            <span className="truncate">{t(tab.key)}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-card-sub px-2 py-0.5 text-[11px] font-semibold text-text-ter">
                            {t('soon')}
                          </span>
                        </span>
                      </li>
                    )
                  }
                  const active = Boolean(activeTab && activeTab.key === tab.key)
                  return (
                    <li key={tab.key}>
                      <Link
                        href={tab.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex min-h-[44px] min-w-0 items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] font-medium focus:outline-none focus-visible:shadow-[var(--sh-glow)] ${
                          active ? 'bg-brand-yellow/15 text-text' : 'text-text-sec hover:text-text'
                        }`}
                      >
                        <Icon name={tab.icon} size={20} aria-hidden="true" className="shrink-0" />
                        <span className="truncate">{t(tab.key)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-[10px] border border-border px-4 py-2 text-[14px] font-semibold text-text-sec focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
                >
                  {t('drawerClose')}
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  )
}
