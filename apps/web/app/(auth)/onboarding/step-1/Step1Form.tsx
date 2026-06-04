'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { OnboardingShell, ProgressHeader, FormField, Input, Button, Badge } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'

// Téléphone facultatif (F8) : accepté vide ; si rempli, format souple international.
// Regex permissive : chiffres, espaces, +, parenthèses, point, tiret — 6 à 20 caractères.
// NB : le message d'erreur affiché est résolu via i18n (t('step1.phoneInvalid')) côté handleSubmit ;
// la chaîne ci-dessous n'est jamais montrée à l'utilisateur.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9 ().-]{6,20}$/)
  .optional()
  .or(z.literal(''))

export function Step1Form({ invited = false }: { invited?: boolean }) {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
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
      setPhoneError(t('step1.phoneInvalid'))
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
      header={
        <ProgressHeader
          step={1}
          total={3}
          formatLabel={(s, n) => t('progress', { step: s, total: n })}
        />
      }
      footer={
        <Button
          type="submit"
          form="step1"
          variant="primary"
          size="lg"
          disabled={!isValid}
          className="w-full"
        >
          {tCommon('continue')}
        </Button>
      }
    >
      {invited && (
        <div className="mb-4 flex flex-col gap-1.5 rounded-[10px] border border-border bg-brand-yellow-light p-3">
          <Badge variant="brand">{t('invitedWelcome.badge')}</Badge>
          <p className="font-body text-[13px] text-text-sec">{t('invitedWelcome.text')}</p>
        </div>
      )}
      <form id="step1" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormField label={t('step1.firstname')} required>
          {({ id, ...ariaProps }) => (
            <Input
              id={id}
              {...ariaProps}
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              autoComplete="given-name"
              placeholder={t('step1.firstnamePlaceholder')}
            />
          )}
        </FormField>

        <FormField label={t('step1.lastname')} required>
          {({ id, ...ariaProps }) => (
            <Input
              id={id}
              {...ariaProps}
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              autoComplete="family-name"
              placeholder={t('step1.lastnamePlaceholder')}
            />
          )}
        </FormField>

        <FormField label={t('step1.phone')} error={phoneError}>
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
              placeholder={t('phonePlaceholder')}
            />
          )}
        </FormField>
      </form>
    </OnboardingShell>
  )
}
