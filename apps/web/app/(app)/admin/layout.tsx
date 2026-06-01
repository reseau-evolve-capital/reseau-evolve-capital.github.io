import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { resolveAdminContext } from '@/lib/data/admin'
import { Forbidden } from './Forbidden'

export const metadata: Metadata = { title: 'Admin — Evolve Capital' }

// Garde par-club en défense (le middleware garde déjà la session + user_is_staff).
// Si l'utilisateur n'est trésorier+ dans aucun club → 403 propre, sans fuite d'info.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <Forbidden />

  const ctx = await resolveAdminContext(supabase, user.id)
  if (!ctx) return <Forbidden />

  return <>{children}</>
}
