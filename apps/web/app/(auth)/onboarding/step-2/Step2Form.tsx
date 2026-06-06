'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OnboardingShell, AvatarUpload, FormField, Input, Button } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { resizeAndUploadAvatar } from '@/lib/upload/avatar'
import type { OnboardingDefaults } from '@/lib/data/profile'

export function Step2Form({ defaults }: { defaults?: OnboardingDefaults }) {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const store = useOnboardingStore()
  const supabase = useSupabase()

  // Pré-remplissage (BUG 1) : le store prime (saisie en cours / retour arrière), `defaults`
  // (valeurs synchronisées lues côté serveur) ne sert que de repli quand le store est vide.
  // On ne clobber donc jamais une saisie en cours.
  const [userId, setUserId] = useState<string | null>(null)
  const [phone, setPhone] = useState(() => store.phone || defaults?.phone || '')
  const [address, setAddress] = useState(() => store.address || defaults?.address || '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    () => store.avatarUrl ?? defaults?.avatarUrl ?? null
  )
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | undefined>()

  // Object URL de l'aperçu optimiste local (BUG 2) — révoqué après succès et au démontage.
  const localPreviewRef = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [supabase])

  // Libère tout object URL local encore vivant au démontage (évite les fuites mémoire).
  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    }
  }, [])

  async function handleFileSelected(file: File) {
    if (!userId) return

    // Aperçu OPTIMISTE (BUG 2) : on affiche l'image choisie immédiatement, avant l'upload,
    // pour un retour visuel instantané. On révoque tout aperçu local précédent au passage.
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    const localUrl = URL.createObjectURL(file)
    localPreviewRef.current = localUrl
    setPreviewUrl(localUrl)

    setIsUploading(true)
    setUploadError(undefined)
    try {
      const url = await resizeAndUploadAvatar(supabase, userId, file)
      store.patch({ avatarUrl: url })
      setPreviewUrl(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('step2.uploadError'))
      // En cas d'échec, on retombe sur l'avatar précédent (synchronisé) plutôt que l'aperçu local.
      setPreviewUrl(store.avatarUrl)
    } finally {
      // L'aperçu local a joué son rôle (remplacé par l'URL publique ou réverti) : on le libère.
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current)
        localPreviewRef.current = null
      }
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
