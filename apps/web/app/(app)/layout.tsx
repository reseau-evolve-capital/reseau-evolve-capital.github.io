import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { AppChromeHeader, AppChromeBottom } from '@/components/chrome/AppChrome'

// Les pages app/* nécessitent l'auth Supabase — pas de prérendu statique
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Chargement de l'utilisateur côté serveur (session via cookies — RLS appliquée).
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let profile: { full_name: string | null; avatar_url: string | null } | null = null
  let isStaff = false
  if (authUser) {
    const { data } = await supabase
      .from('users')
      .select('full_name, avatar_url')
      .eq('id', authUser.id)
      .single()
    profile = data
    const { data: staffData } = await supabase.rpc('user_is_staff')
    isStaff = staffData ?? false
  }

  const user = {
    fullName: profile?.full_name ?? authUser?.email ?? 'Membre',
    avatarUrl: profile?.avatar_url ?? null,
  }

  return (
    <QueryProvider>
      <SupabaseProvider>
        <AppChromeHeader user={user} isStaff={isStaff} />
        <main className="pb-24 md:pb-8">{children}</main>
        <AppChromeBottom />
      </SupabaseProvider>
    </QueryProvider>
  )
}
