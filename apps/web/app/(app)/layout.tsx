import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { getTranslations, getLocale } from 'next-intl/server'
import { createServerClient } from '@evolve/data'
import { formatDateLong, formatRelativeTime } from '@evolve/utils'
import type { SidebarClub } from '@evolve/ui'
import { ToastProvider } from '@evolve/ui'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { AppChromeSidebar, AppChromeTopbar, AppChromeBottom } from '@/components/chrome/AppChrome'

// Les pages app/* nécessitent l'auth Supabase — pas de prérendu statique
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Chargement de l'utilisateur côté serveur (session via cookies — RLS appliquée).
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const t = await getTranslations('nav.shell')
  const locale = await getLocale()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let profile: { full_name: string | null; avatar_url: string | null } | null = null
  let isStaff = false
  let clubActif: SidebarClub | undefined
  let syncLabel: string | undefined

  if (authUser) {
    const { data } = await supabase
      .from('users')
      .select('full_name, avatar_url')
      .eq('id', authUser.id)
      .single()
    profile = data
    const { data: staffData } = await supabase.rpc('user_is_staff')
    isStaff = staffData ?? false

    // Club actif = dernière adhésion active ; alimente la carte « CLUB ACTIF » + le statut sync.
    const { data: membership } = await supabase
      .from('memberships')
      .select('club_id, clubs(name, city, synced_at)')
      .eq('user_id', authUser.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle<{
        club_id: string
        clubs: { name: string; city: string | null; synced_at: string | null } | null
      }>()

    const club = membership?.clubs
    if (club) {
      // Nombre de membres actifs (RLS : silencieux/ignoré si non autorisé).
      const { count } = await supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', membership!.club_id)
        .eq('is_active', true)

      const meta = [count && count > 0 ? t('clubMembers', { count }) : null, club.city]
        .filter(Boolean)
        .join(' · ')

      clubActif = { name: club.name, meta: meta || undefined }
      if (club.synced_at)
        syncLabel = t('syncedAt', { time: formatRelativeTime(club.synced_at, undefined, locale) })
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
            <AppChromeSidebar isStaff={isStaff} clubActif={clubActif} />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppChromeTopbar
                user={user}
                isStaff={isStaff}
                syncLabel={syncLabel}
                dateLabel={dateLabel}
                clubActif={clubActif}
              />
              <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">
                <div className="mx-auto w-full max-w-[1280px]">{children}</div>
              </main>
            </div>
          </div>
          <AppChromeBottom />
        </ToastProvider>
      </SupabaseProvider>
    </QueryProvider>
  )
}
