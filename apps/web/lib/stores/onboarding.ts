import { create } from 'zustand'

interface OnboardingDraft {
  firstname: string
  lastname: string
  phone: string
  address: string
  avatarUrl: string | null
  rgpdConsented: boolean
  directoryOptIn: boolean
}

interface OnboardingStore extends OnboardingDraft {
  patch: (values: Partial<OnboardingDraft>) => void
  reset: () => void
}

const initial: OnboardingDraft = {
  firstname: '',
  lastname: '',
  phone: '',
  address: '',
  avatarUrl: null,
  rgpdConsented: false,
  directoryOptIn: false,
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initial,
  patch: (values) => set(values),
  reset: () => set(initial),
}))
