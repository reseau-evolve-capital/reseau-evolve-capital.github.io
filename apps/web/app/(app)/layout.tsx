import type { ReactNode } from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'

// Les pages app/* nécessitent l'auth Supabase — pas de prérendu statique
export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SupabaseProvider>{children}</SupabaseProvider>
    </QueryProvider>
  )
}
