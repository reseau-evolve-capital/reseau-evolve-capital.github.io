/**
 * Client API — onboarding profil
 * Appelle POST /api/onboarding/profile à l'étape 3 du flux d'onboarding.
 */

export interface OnboardingProfilePayload {
  firstname: string
  lastname: string
  phone: string | null
  address: string | null
  avatar_url: string | null
  rgpd_consented: true
  directory_opt_in: boolean
}

/**
 * Soumet le profil d'onboarding.
 * Lève une `Error` avec le message FR de l'API en cas d'échec.
 */
export async function submitOnboardingProfile(payload: OnboardingProfilePayload): Promise<void> {
  const res = await fetch('/api/onboarding/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? "Échec de l'enregistrement.")
  }
}
