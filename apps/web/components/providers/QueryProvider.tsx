'use client'
import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { captureClientError } from '@/lib/monitoring/sentry'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Ne pas capturer les 401 — gérés par le middleware auth (redirect vers /login)
            if (error instanceof Error && error.message.includes('401')) return
            captureClientError(error, {
              source: 'react-query',
              queryKey: query.queryKey,
            })
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            captureClientError(error, { source: 'react-query-mutation' })
          },
        }),
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
