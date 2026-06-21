'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  OnboardingShell,
  AvatarUpload,
  AvatarCropModal,
  FormField,
  Input,
  Button,
} from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'
import { useAvatarCropFlow } from '@/lib/upload/useAvatarCropFlow'
import type { OnboardingDefaults } from '@/lib/data/profile'

export function Step2Form({ defaults }: { defaults?: OnboardingDefaults }) {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const tCrop = useTranslations('avatarCrop')
  const store = useOnboardingStore()

  // Pré-remplissage (BUG 1) : le store prime (saisie en cours / retour arrière), `defaults`
  // (valeurs synchronisées lues côté serveur) ne sert que de repli quand le store est vide.
  const [phone, setPhone] = useState(() => store.phone || defaults?.phone || '')
  const [address, setAddress] = useState(() => store.address || defaults?.address || '')

  // Flux crop partagé : sélection → modale crop → upload Blob → store.patch({ avatarUrl }).
  const flow = useAvatarCropFlow({
    initialPreview: store.avatarUrl ?? defaults?.avatarUrl ?? null,
    fallbackErrorLabel: t('step2.uploadError'),
    onUploaded: (url) => {
      store.patch({ avatarUrl: url })
    },
  })

  function handleContinue() {
    store.patch({ phone: phone.trim(), address: address.trim() })
    router.push('/onboarding/step-3')
  }

  return (
    <OnboardingShell
      header={
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-bold leading-tight text-text sm:text-[32px]">
            {t('step2.heading')}
          </h1>
          <p className="text-[15px] leading-relaxed text-text-sec">{t('step2.subtitle')}</p>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleContinue}
            className="w-full"
          >
            {tCommon('continue')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push('/onboarding/step-1')}
            className="w-full"
          >
            {tCommon('back')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <AvatarUpload
            previewUrl={flow.previewUrl}
            onFileSelected={flow.handleFileSelected}
            isUploading={flow.isUploading}
            error={flow.error}
            uploadAriaLabel={t('step2.avatarUploadAria')}
            emptyLabel={t('step2.avatarEmpty')}
            uploadingLabel={t('step2.avatarUploading')}
            uploadingAriaLabel={t('step2.avatarUploadingAria')}
          />
          <p className="text-[12px] text-text-ter">{t('step2.avatarCaption')}</p>
        </div>

        <FormField label={t('step2.phone')}>
          {({ id, ...ariaProps }) => (
            <Input
              id={id}
              {...ariaProps}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
            />
          )}
        </FormField>

        <FormField label={t('step2.address')}>
          {({ id, ...ariaProps }) => (
            <Input
              id={id}
              {...ariaProps}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
              placeholder={t('step2.addressPlaceholder')}
            />
          )}
        </FormField>
      </div>

      <AvatarCropModal
        open={flow.cropOpen}
        onOpenChange={flow.setCropOpen}
        imageSrc={flow.cropSrc}
        onConfirm={flow.handleCropConfirm}
        onCancel={flow.handleCropCancel}
        labels={{
          title: tCrop('title'),
          description: tCrop('description'),
          cancel: tCrop('cancel'),
          confirm: tCrop('confirm'),
          confirming: tCrop('confirming'),
          zoomLabel: tCrop('zoom'),
          close: tCrop('close'),
          error: tCrop('error'),
        }}
      />
    </OnboardingShell>
  )
}
