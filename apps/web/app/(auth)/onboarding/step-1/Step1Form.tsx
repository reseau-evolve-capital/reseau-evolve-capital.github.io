'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { OnboardingShell, ProgressHeader, FormField, Input, Button } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'

// Téléphone facultatif (F8) : accepté vide ; si rempli, format souple international.
// Regex permissive : chiffres, espaces, +, parenthèses, point, tiret — 6 à 20 caractères.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9 ().-]{6,20}$/, 'Format de téléphone invalide.')
  .optional()
  .or(z.literal(''))

export function Step1Form() {
  const router = useRouter()
  const store = useOnboardingStore()

  const [firstname, setFirstname] = useState(store.firstname)
  const [lastname, setLastname] = useState(store.lastname)
  const [phone, setPhone] = useState(store.phone)
  const [phoneError, setPhoneError] = useState<string | undefined>()

  // Le téléphone est facultatif : le CTA reste actif tant que prénom/nom sont remplis.
  const isValid = firstname.trim().length > 0 && lastname.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const trimmedPhone = phone.trim()
    // Validation souple uniquement si un numéro a été saisi (vide = accepté).
    const result = phoneSchema.safeParse(trimmedPhone)
    if (!result.success) {
      setPhoneError(result.error.issues[0]?.message ?? 'Format de téléphone invalide.')
      return
    }
    setPhoneError(undefined)

    store.patch({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      phone: trimmedPhone,
    })
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

        <FormField label="Téléphone (facultatif)" error={phoneError}>
          {({ id, ...ariaProps }) => (
            <Input
              id={id}
              {...ariaProps}
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (phoneError) setPhoneError(undefined)
              }}
              autoComplete="tel"
              placeholder="+33 6 00 00 00 00"
            />
          )}
        </FormField>
      </form>
    </OnboardingShell>
  )
}
