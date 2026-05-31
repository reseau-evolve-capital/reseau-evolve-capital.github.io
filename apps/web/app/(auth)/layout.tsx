import type { ReactNode } from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'

// Les pages auth/* ne nécessitent pas de prérendu statique
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SupabaseProvider>
        <div className="flex min-h-screen items-center justify-center bg-bg-page p-4">
          {children}
        </div>
      </SupabaseProvider>
    </QueryProvider>
  )
}
