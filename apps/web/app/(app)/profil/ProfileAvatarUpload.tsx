'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { AvatarUpload, useToast } from '@evolve/ui'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { resizeAndUploadAvatar } from '@/lib/upload/avatar'

/**
 * Wrapper client autour de AvatarUpload pour la page /profil.
 * Upload dans le bucket `avatars`, puis MAJ de `users.avatar_url` (RLS self-update).
 */
export function ProfileAvatarUpload({
  initialUrl,
  name,
}: {
  initialUrl: string | null
  name: string
}) {
  const t = useTranslations('profile')
  const toast = useToast()
  const supabase = useSupabase()

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | undefined>()
  const localPreviewRef = useRef<string | null>(null)

  async function handleFileSelected(file: File) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Aperçu optimiste local avant l'upload.
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    const localUrl = URL.createObjectURL(file)
    localPreviewRef.current = localUrl
    setPreviewUrl(localUrl)

    setIsUploading(true)
    setUploadError(undefined)
    try {
      const url = await resizeAndUploadAvatar(supabase, user.id, file)
      // MAJ directe via RLS « users: self update » (auth.uid() = user.id).
      const { error } = await supabase.from('users').update({ avatar_url: url }).eq('id', user.id)
      if (error) throw new Error(t('avatarError'))
      setPreviewUrl(url)
      toast.success({ title: t('avatarUpdated') })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('avatarError'))
      setPreviewUrl(initialUrl)
    } finally {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current)
        localPreviewRef.current = null
      }
      setIsUploading(false)
    }
  }

  return (
    <AvatarUpload
      previewUrl={previewUrl}
      onFileSelected={handleFileSelected}
      isUploading={isUploading}
      error={uploadError}
      uploadAriaLabel={t('avatarUploadAria', { name })}
      emptyLabel={t('avatarEmpty')}
      uploadingLabel={t('avatarUploading')}
      uploadingAriaLabel={t('avatarUploadingAria')}
    />
  )
}
