'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { OnboardingShell, ProgressHeader, ConsentRow, Button, Heading } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'
import { submitOnboardingProfile } from '@/lib/api/onboarding'

export function Step3Form() {
  const router = useRouter()
  const store = useOnboardingStore()

  const [rgpd, setRgpd] = useState(store.rgpdConsented)
  const [directory, setDirectory] = useState(store.directoryOptIn)

  // Garde : si firstname/lastname vides (deep link), retour à step-1
  useEffect(() => {
    if (!store.firstname || !store.lastname) {
      router.replace('/onboarding/step-1')
    }
  }, [store.firstname, store.lastname, router])

  const mutation = useMutation({
    mutationFn: () =>
      submitOnboardingProfile({
        firstname: store.firstname,
        lastname: store.lastname,
        phone: store.phone || null,
        address: store.address || null,
        avatar_url: store.avatarUrl,
        rgpd_consented: true,
        directory_opt_in: directory,
      }),
    onSuccess: () => {
      store.patch({ rgpdConsented: true, directoryOptIn: directory })
      router.push('/onboarding/tour')
    },
  })

  return (
    <OnboardingShell
      header={<ProgressHeader step={3} total={3} />}
      footer={
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={!rgpd}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="w-full"
          >
            Rejoindre le club
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => router.push('/onboarding/step-2')}
            className="w-full"
          >
            Retour
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Heading level="h2">Quelques accords avant de commencer.</Heading>

        <div className="flex flex-col gap-2">
          <ConsentRow
            checked={rgpd}
            onCheckedChange={setRgpd}
            label="J'accepte la charte de confidentialité et le traitement de mes données personnelles."
            linkHref="/legal/charter"
            linkLabel="lire"
            required
          />

          <ConsentRow
            checked={directory}
            onCheckedChange={setDirectory}
            label="J'accepte d'apparaître dans l'annuaire des membres du club."
            linkLabel="en savoir plus"
          />
        </div>

        {mutation.isError && (
          <p
            role="alert"
            className="rounded-md bg-data-negative/10 px-3 py-2 text-[14px] text-data-negative"
          >
            {mutation.error instanceof Error
              ? mutation.error.message
              : 'Une erreur est survenue. Réessaie.'}
          </p>
        )}
      </div>
    </OnboardingShell>
  )
}
