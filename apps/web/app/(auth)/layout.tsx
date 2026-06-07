import type { ReactNode } from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { PwaCacheCleaner } from '@/components/pwa/PwaCacheCleaner'

// Les pages auth/* ne nécessitent pas de prérendu statique
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SupabaseProvider>
        {/* PWA-001 : purge le cache de données SW à toute fin de session (atterrit sur /login). */}
        <PwaCacheCleaner />
        <div className="flex min-h-screen items-center justify-center bg-bg-page p-4">
          {children}
        </div>
      </SupabaseProvider>
    </QueryProvider>
  )
}
