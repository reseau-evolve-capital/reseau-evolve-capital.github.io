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
  Icon,
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

// Logo de marque servi par l'app (source unique : @/lib/brand → tuile crème
// icon-192.png, fond #F4F4F2, artwork centré) pour la topbar et la sidebar web.
const LOGO_SRC = BRAND_LOGO_SRC

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
  hasPollActivity = false,
  pollsToVote = 0,
}: {
  user: AppHeaderUser
  isStaff: boolean
  syncLabel?: string
  dateLabel?: string
  clubActif?: SidebarClub
  /** Vrai si ≥ 1 vote open|closed visible du club (spec §5 — entrée « Votes » conditionnelle). */
  hasPollActivity?: boolean
  /** Nombre de votes ouverts non encore votés (badge sur l'entrée Votes). 0 = pas de badge. */
  pollsToVote?: number
}) {
  // NB (arbitrage) : l'entrée « Votes » du dropdown avatar (spec §7) NÉCESSITE un point
  // d'extension sur AppTopbar (@evolve/ui) — non disponible dans la version livrée, et
  // packages/ui est hors périmètre de ce ticket. En attendant ce follow-up @evolve/ui
  // (ajout d'une entrée de menu paramétrable), on rend ici une ENTRÉE « Votes » dédiée et
  // CONDITIONNELLE (hasPollActivity) dans la topbar, avec badge du nombre de votes à faire,
  // qui navigue vers /votes. Visuellement intégrée, focus visible, cible ≥ 44px.
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

  const pollsBadge = pollsToVote > 0 ? (pollsToVote > 9 ? '9+' : String(pollsToVote)) : null

  return (
    <>
      {/* Entrée « Votes » conditionnelle (spec §5/§7). Rendue à gauche du cluster avatar de la
          topbar via un conteneur relatif (en attendant le point d'extension @evolve/ui). */}
      <div className="relative">
        {hasPollActivity ? (
          <Link
            href="/votes"
            aria-label={pollsBadge ? `${t('topbar.votes')} (${pollsToVote})` : t('topbar.votes')}
            className="absolute right-16 top-1/2 z-50 inline-flex min-h-[44px] -translate-y-1/2 items-center gap-1.5 rounded-[var(--r-md)] px-2 text-text-sec outline-none transition-colors hover:text-text focus-visible:shadow-[var(--sh-glow)] md:right-20"
          >
            <span className="relative inline-flex">
              <Icon name="Vote" size={20} aria-hidden="true" />
              {pollsBadge ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-brand-yellow px-1 text-[10px] font-bold leading-[16px] text-accent-ink"
                >
                  {pollsBadge}
                </span>
              ) : null}
            </span>
            <span className="hidden text-[13px] font-semibold lg:inline">{t('topbar.votes')}</span>
          </Link>
        ) : null}
      </div>
      <AppTopbar
        user={user}
        linkComponent={Link}
        canAccessAdmin={isStaff}
        onAdmin={() => router.push('/admin')}
        onProfile={() => router.push('/profil')}
        onLogout={() => {
          void handleLogout()
        }}
        onFeedback={() => setFeedbackOpen(true)}
        feedbackLabel={t('topbar.feedback')}
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
