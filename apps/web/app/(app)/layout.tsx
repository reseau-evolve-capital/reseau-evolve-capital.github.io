import type { ReactNode } from 'react'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SupabaseProvider>{children}</SupabaseProvider>
    </QueryProvider>
  )
}
