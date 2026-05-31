'use client'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: true } },
      })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
