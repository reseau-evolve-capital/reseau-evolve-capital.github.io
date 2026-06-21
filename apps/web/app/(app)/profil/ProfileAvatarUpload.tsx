'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { AvatarUpload, AvatarCropModal, useToast } from '@evolve/ui'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { useAvatarCropFlow } from '@/lib/upload/useAvatarCropFlow'

/**
 * Wrapper client autour de AvatarUpload pour la page /profil.
 * Sélection fichier → modale de crop → upload du Blob croppé → MAJ `users.avatar_url`
 * (RLS self-update) → `router.refresh()` pour rafraîchir aussi l'avatar du topbar (layout RSC).
 */
export function ProfileAvatarUpload({
  initialUrl,
  name,
}: {
  initialUrl: string | null
  name: string
}) {
  const t = useTranslations('profile')
  const tCrop = useTranslations('avatarCrop')
  const toast = useToast()
  const supabase = useSupabase()
  const router = useRouter()

  const flow = useAvatarCropFlow({
    initialPreview: initialUrl,
    fallbackErrorLabel: t('avatarError'),
    onUploaded: async (url, userId) => {
      const { error } = await supabase.from('users').update({ avatar_url: url }).eq('id', userId)
      if (error) throw new Error(t('avatarError'))
      toast.success({ title: t('avatarUpdated') })
      // Rafraîchit le layout RSC → l'avatar du topbar reflète la nouvelle photo.
      router.refresh()
    },
  })

  return (
    <>
      <AvatarUpload
        previewUrl={flow.previewUrl}
        onFileSelected={flow.handleFileSelected}
        isUploading={flow.isUploading}
        error={flow.error}
        uploadAriaLabel={t('avatarUploadAria', { name })}
        emptyLabel={t('avatarEmpty')}
        uploadingLabel={t('avatarUploading')}
        uploadingAriaLabel={t('avatarUploadingAria')}
      />
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
    </>
  )
}
