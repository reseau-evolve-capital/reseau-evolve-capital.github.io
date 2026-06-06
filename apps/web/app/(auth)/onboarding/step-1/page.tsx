import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getOnboardingDefaults, type OnboardingDefaults } from '@/lib/data/profile'
import { Step1Form } from './Step1Form'

// ?invited=1 → première connexion via une invitation (ADM-007) : accueil « Vous avez été invité ».
export default async function OnboardingStep1Page({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string }>
}) {
  const { invited } = await searchParams

  // Pré-remplissage (BUG 1) : on lit le profil synchronisé (prénom/nom/tél/adresse/avatar)
  // via la session (RLS « users: self read »). Self-read, pas de service-role.
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let defaults: OnboardingDefaults | undefined
  if (user) {
    defaults = await getOnboardingDefaults(supabase, user.id)
  }

  return <Step1Form invited={invited === '1'} defaults={defaults} />
}
