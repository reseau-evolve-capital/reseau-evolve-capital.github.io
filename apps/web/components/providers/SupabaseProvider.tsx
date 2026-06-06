'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { createBrowserClient } from '@evolve/data/supabase/client'

type SupabaseClient = ReturnType<typeof createBrowserClient>
const SupabaseContext = createContext<SupabaseClient | null>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createBrowserClient())
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}

export function useSupabase(): SupabaseClient {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useSupabase doit être utilisé dans <SupabaseProvider>')
  return ctx
}
