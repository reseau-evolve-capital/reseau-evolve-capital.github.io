import type { ReactNode } from 'react'
import { OnboardingChrome } from '@/components/chrome/OnboardingChrome'

// Habille tout le parcours d'onboarding (step-1/2/3 + tour) avec le chrome Evolve :
// top bar (logo · « ONBOARDING · ÉTAPE X / 3 » · aide + bascule de thème) +
// progression segmentée dérivée du pathname. Plein écran, thémé (sombre par
// défaut, toggle clair/sombre réel). Cf. components/chrome/OnboardingChrome.tsx
// pour la gestion du centrage parent (auth) sans casser login/verify.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingChrome>{children}</OnboardingChrome>
}
