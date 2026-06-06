import { cookies } from 'next/headers'
import { createServerClient } from '@evolve/data'
import { getOnboardingDefaults, type OnboardingDefaults } from '@/lib/data/profile'
import { Step2Form } from './Step2Form'

export default async function OnboardingStep2Page() {
  // Pré-remplissage robuste (BUG 1) : on relit les valeurs synchronisées côté serveur pour que
  // le téléphone, l'adresse et l'avatar soient pré-remplis même si on arrive directement sur
  // l'étape 2 (rechargement / lien direct), sans dépendre du store en mémoire.
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let defaults: OnboardingDefaults | undefined
  if (user) {
    defaults = await getOnboardingDefaults(supabase, user.id)
  }

  return <Step2Form defaults={defaults} />
}
