'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingShell, ProgressHeader, FormField, Input, Button } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'

export function Step1Form() {
  const router = useRouter()
  const store = useOnboardingStore()

  const [firstname, setFirstname] = useState(store.firstname)
  const [lastname, setLastname] = useState(store.lastname)

  const isValid = firstname.trim().length > 0 && lastname.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    store.patch({ firstname: firstname.trim(), lastname: lastname.trim() })
    router.push('/onboarding/step-2')
  }

  return (
    <OnboardingShell
      header={<ProgressHeader step={1} total={3} />}
      footer={
        <Button
          type="submit"
          form="step1"
          variant="primary"
          size="lg"
          disabled={!isValid}
          className="w-full"
        >
          Continuer
        </Button>
      }
    >
      <form id="step1" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormField label="Prénom" required>
          {({ id, ...ariaProps }) => (
            <Input
              id={id}
              {...ariaProps}
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              autoComplete="given-name"
              placeholder="Votre prénom"
            />
          )}
        </FormField>

        <FormField label="Nom" required>
          {({ id, ...ariaProps }) => (
            <Input
              id={id}
              {...ariaProps}
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              autoComplete="family-name"
              placeholder="Votre nom de famille"
            />
          )}
        </FormField>
      </form>
    </OnboardingShell>
  )
}
