import { create } from 'zustand'
import type { Database } from '@evolve/data'

type User = Database['public']['Tables']['users']['Row']
type Club = Database['public']['Tables']['clubs']['Row']

interface SessionStore {
  user: User | null
  club: Club | null
  setUser: (user: User | null) => void
  setClub: (club: Club | null) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  club: null,
  setUser: (user) => set({ user }),
  setClub: (club) => set({ club }),
}))
