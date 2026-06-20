import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { createHash } from 'crypto'
import { cookies } from 'next/headers'
import { getTranslations, getLocale } from 'next-intl/server'
import { createServerClient } from '@evolve/data'
import { AnalyticsIdentify } from '@/components/analytics/AnalyticsIdentify'
import { formatDateLong, formatRelativeTime } from '@evolve/utils'
import type { SidebarClub } from '@evolve/ui'
import { ToastProvider } from '@evolve/ui'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { hasVoted } from '@evolve/data'
import { AppChromeSidebar, AppChromeTopbar, AppChromeBottom } from '@/components/chrome/AppChrome'
import { InstallBannerMount } from '@/components/pwa/InstallBannerMount'
import { PushOptInMount } from '@/components/push/PushOptInMount'
import {
  getSessionUser,
  getActiveClubMembership,
  getUserClubMemberships,
  getNetworkContext,
  type ClubMembershipSummary,
} from '@/lib/data/request'
import { isStaffRole } from '@/lib/data/admin'
import { getOpenPolls, hasPollActivity as checkPollActivity } from '@/lib/data/polls'

// Les pages app/* nécessitent l'auth Supabase — pas de prérendu statique
export const dynamic = 'force-dynamic'

// Pages authentifiées : jamais indexées (contenu privé membre).
// Les scrapers OG lisent quand même les balises Open Graph malgré noindex.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Chargement de l'utilisateur côté serveur (session via cookies — RLS appliquée).
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const t = await getTranslations('nav.shell')
  const locale = await getLocale()

  // Identité via getClaims() (vérif locale du JWT, mémoïsée par requête) : le middleware
  // AUT-005 a déjà revalidé la session par getUser() réseau — cf. lib/data/request.ts.
  const authUser = await getSessionUser()

  let profile: { full_name: string | null; avatar_url: string | null } | null = null
  let isStaff = false
  // Membre de l'équipe RÉSEAU (NET-002) : pilote l'item « Réseau » role-aware (nav).
  let isNetworkMember = false
  let clubActif: SidebarClub | undefined
  let syncLabel: string | undefined
  // Analytics (Phase 2) : identité pseudonyme. user_id = SHA-256(salt + UUID Supabase) —
  // jamais l'UUID brut ni d'email. Posé côté client UNIQUEMENT si consentement accordé.
  let userIdHash: string | null = null
  let clubCount = 0
  // Entrée « Votes » du menu (spec §5/§7) : visible si ≥ 1 vote open|closed du club.
  let pollActivity = false
  // Badge : nombre de votes ouverts non encore votés. Best-effort (jamais bloquant).
  let pollsToVote = 0
  // ClubSwitcher : liste de toutes les adhésions actives (non null si multi-club).
  let allClubMemberships: ClubMembershipSummary[] = []
  let activeClubId: string | undefined

  if (authUser) {
    const salt = process.env.ANALYTICS_USER_ID_SALT ?? 'evolve-uba'
    userIdHash = createHash('sha256').update(`${salt}:${authUser.id}`).digest('hex').slice(0, 32)

    // 5 lectures indépendantes → parallélisées (fix latence par-navigation, ticket C).
    // Club actif = adhésion du club sélectionné (cookie) sinon la plus récente (helper mémoïsé,
    // PARTAGÉ avec les pages) ; alimente la carte « CLUB ACTIF » + le statut sync.
    // getUserClubMemberships : liste toutes les adhésions (ClubSwitcher). Contexte réseau
    // (NET-002) mémoïsé, PARTAGÉ avec le layout /reseau : null = non-membre → item « Réseau » teaser.
    const [{ count }, { data: profileData }, membership, allMemberships, networkCtx] =
      await Promise.all([
        supabase
          .from('memberships')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('is_active', true),
        supabase.from('users').select('full_name, avatar_url').eq('id', authUser.id).single(),
        getActiveClubMembership(authUser.id),
        getUserClubMemberships(authUser.id),
        getNetworkContext(authUser.id),
      ])
    clubCount = count ?? 0
    profile = profileData
    // isStaff suit le CLUB ACTIF (pas un rôle global) : trésorier/président/network_admin DANS
    // le club sélectionné. Sur un club où l'user est simple membre → false → pas d'entrée Admin.
    isStaff = isStaffRole(membership?.role ?? null)
    // Accès RÉSEAU = appartenance à l'équipe réseau (org-level, indépendant du club actif).
    isNetworkMember = networkCtx !== null
    allClubMemberships = allMemberships
    activeClubId = membership?.club_id

    const club = membership?.clubs
    if (club) {
      // Nombre de membres actifs (RLS : silencieux/ignoré si non autorisé).
      const { count: memberCount } = await supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', membership!.club_id)
        .eq('is_active', true)

      const meta = [
        memberCount && memberCount > 0 ? t('clubMembers', { count: memberCount }) : null,
        club.city,
      ]
        .filter(Boolean)
        .join(' · ')

      clubActif = { name: club.name, meta: meta || undefined }
      if (club.synced_at)
        syncLabel = t('syncedAt', { time: formatRelativeTime(club.synced_at, undefined, locale) })
    }

    // Activité de votes (entrée menu) + nombre de votes à faire (badge). Non bloquant :
    // toute erreur laisse l'entrée masquée et le badge à 0 (jamais de crash du chrome).
    try {
      pollActivity = await checkPollActivity(supabase)
      if (pollActivity) {
        const openPolls = await getOpenPolls(supabase)
        const votedFlags = await Promise.all(openPolls.map((p) => hasVoted(supabase, p.id)))
        pollsToVote = votedFlags.filter((v) => !v).length
      }
    } catch (error) {
      console.error('[layout] activité de votes — ignorée :', error)
    }
  }

  const user = {
    fullName: profile?.full_name ?? authUser?.email ?? t('userFallback'),
    avatarUrl: profile?.avatar_url ?? null,
  }
  const dateLabel = formatDateLong(new Date())

  return (
    <QueryProvider>
      <SupabaseProvider>
        {/* ToastProvider (NTF-006) : feedback in-app éphémère, région aria-live rendue
            par-dessus tout le chrome. useToast() est dispo dans tout l'espace membre. */}
        <ToastProvider>
          <div className="md:flex md:min-h-screen">
            <AppChromeSidebar
              isStaff={isStaff}
              isNetworkMember={isNetworkMember}
              clubActif={clubActif}
              allClubs={allClubMemberships}
              activeClubId={activeClubId}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppChromeTopbar
                user={user}
                isStaff={isStaff}
                syncLabel={syncLabel}
                dateLabel={dateLabel}
                clubActif={clubActif}
                hasPollActivity={pollActivity}
                pollsToVote={pollsToVote}
              />
              <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
                <div className="mx-auto w-full max-w-[1280px]">{children}</div>
              </main>
            </div>
          </div>
          <AppChromeBottom isNetworkMember={isNetworkMember} />
          {/* PWA-001 : bannière d'installation. Montée ici (persiste entre onglets) mais
              ne s'affiche que sur /dashboard. Enrobée d'un ErrorBoundary interne. */}
          <InstallBannerMount />
          {/* PUSH-001 : pre-prompt d'opt-in Web Push. Même mount-pattern que la bannière PWA
              (ne s'affiche que sur /dashboard, gating capacité + cooldown + consentement). */}
          <PushOptInMount />
          {/* Analytics GA4 (Phase 2) : user_id pseudonyme + user properties (consent-gated)
              + login_completed une fois par session. Aucune PII. */}
          <AnalyticsIdentify
            userIdHash={userIdHash}
            userProps={{
              user_type: isStaff ? 'staff' : 'member',
              club_count: clubCount,
              onboarding_complete: true,
              locale,
            }}
          />
        </ToastProvider>
      </SupabaseProvider>
    </QueryProvider>
  )
}
