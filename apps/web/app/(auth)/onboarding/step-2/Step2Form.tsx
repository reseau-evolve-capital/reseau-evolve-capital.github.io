'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OnboardingShell, ProgressHeader, AvatarUpload, FormField, Input, Button } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { resizeAndUploadAvatar } from '@/lib/upload/avatar'

export function Step2Form() {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const store = useOnboardingStore()
  const supabase = useSupabase()

  const [userId, setUserId] = useState<string | null>(null)
  const [phone, setPhone] = useState(store.phone)
  const [address, setAddress] = useState(store.address)
  const [previewUrl, setPreviewUrl] = useState<string | null>(store.avatarUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | undefined>()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [supabase])

  async function handleFileSelected(file: File) {
    if (!userId) return
    setIsUploading(true)
    setUploadError(undefined)
    try {
      const url = await resizeAndUploadAvatar(supabase, userId, file)
      store.patch({ avatarUrl: url })
      setPreviewUrl(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('step2.uploadError'))
    } finally {
      setIsUploading(false)
    }
  }

  function handleContinue() {
    store.patch({ phone: phone.trim(), address: address.trim() })
    router.push('/onboarding/step-3')
  }

  return (
    <OnboardingShell
      header={
        <ProgressHeader
          step={2}
          total={3}
          formatLabel={(s, n) => t('progress', { step: s, total: n })}
        />
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
            previewUrl={previewUrl}
            onFileSelected={handleFileSelected}
            isUploading={isUploading}
            error={uploadError}
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
    </OnboardingShell>
  )
}
