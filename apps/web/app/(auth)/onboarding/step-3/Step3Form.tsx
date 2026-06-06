'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { OnboardingShell, ConsentRow, Button } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'
import { submitOnboardingProfile } from '@/lib/api/onboarding'

export function Step3Form() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
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
      header={
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-[28px] font-bold leading-tight text-text sm:text-[34px]">
            {t('step3.heading')}
          </h1>
          <p className="text-[15px] leading-relaxed text-text-sec">{t('step3.subtitle')}</p>
        </div>
      }
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
            {t('step3.submit')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => router.push('/onboarding/step-2')}
            className="w-full"
          >
            {tCommon('back')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <ConsentRow
            checked={rgpd}
            onCheckedChange={setRgpd}
            label={t('step3.rgpdLabel')}
            linkHref="/legal/charter"
            linkLabel={t('step3.rgpdLinkLabel')}
            required
          />

          <ConsentRow
            checked={directory}
            onCheckedChange={setDirectory}
            label={t('step3.directoryLabel')}
            linkLabel={t('step3.directoryLinkLabel')}
          />
        </div>

        {mutation.isError && (
          <p
            role="alert"
            className="rounded-md bg-data-negative/10 px-3 py-2 text-[14px] text-data-negative"
          >
            {mutation.error instanceof Error ? mutation.error.message : t('step3.submitError')}
          </p>
        )}
      </div>
    </OnboardingShell>
  )
}
