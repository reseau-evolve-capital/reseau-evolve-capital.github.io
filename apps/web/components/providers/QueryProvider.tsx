'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

// Expose le queryClient sur window.__queryClient en dev/test pour permettre aux tests
// E2E Playwright de déclencher invalidateQueries sans dépendre du pull-to-refresh.
declare global {
  interface Window {
    __queryClient?: QueryClient
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: true } },
      })
  )

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      window.__queryClient = queryClient
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
