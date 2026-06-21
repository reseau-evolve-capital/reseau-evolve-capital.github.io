'use client'

// useAvatarCropFlow — flux partagé profil + onboarding : sélection fichier → crop
// interactif (AvatarCropModal) → upload Blob croppé → persistance (DB ou store) →
// purge des anciennes images. DRY entre /profil et /onboarding/step-2.
//
// La purge des anciennes images a lieu APRÈS la persistance du nouveau pointeur
// (fire-and-forget, best-effort) pour ne jamais laisser un avatar_url cassé.

import { useCallback, useEffect, useRef, useState } from 'react'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { assertAvatarFile, deleteStaleAvatars, uploadAvatarBlob } from './avatar'

interface UseAvatarCropFlowOptions {
  /** Aperçu initial (avatar synchronisé). */
  initialPreview: string | null
  /** Persistance du nouvel avatar (UPDATE users.avatar_url ou store.patch). Reçoit l'userId résolu. */
  onUploaded: (url: string, userId: string) => void | Promise<void>
  /** Message d'erreur de repli (i18n) si l'upload/persistance échoue. */
  fallbackErrorLabel: string
}

export function useAvatarCropFlow({
  initialPreview,
  onUploaded,
  fallbackErrorLabel,
}: UseAvatarCropFlowOptions) {
  const supabase = useSupabase()

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreview)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // Object URL local de l'image en cours de crop — révoqué après usage (fuites iOS).
  const cropSrcRef = useRef<string | null>(null)
  const revokeCropSrc = useCallback(() => {
    if (cropSrcRef.current) {
      URL.revokeObjectURL(cropSrcRef.current)
      cropSrcRef.current = null
    }
  }, [])

  // Libère tout object URL encore vivant au démontage.
  useEffect(() => () => revokeCropSrc(), [revokeCropSrc])

  const handleFileSelected = useCallback(
    (file: File) => {
      setError(undefined)
      try {
        assertAvatarFile(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : fallbackErrorLabel)
        return
      }
      revokeCropSrc()
      const src = URL.createObjectURL(file)
      cropSrcRef.current = src
      setCropSrc(src)
      setCropOpen(true)
    },
    [fallbackErrorLabel, revokeCropSrc]
  )

  const handleCropCancel = useCallback(() => {
    setCropOpen(false)
    revokeCropSrc()
    setCropSrc(null)
  }, [revokeCropSrc])

  const handleCropConfirm = useCallback(
    async (blob: Blob) => {
      setCropOpen(false)
      setIsUploading(true)
      setError(undefined)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error(fallbackErrorLabel)

        const { url, fileName } = await uploadAvatarBlob(supabase, user.id, blob)
        setPreviewUrl(url)
        await onUploaded(url, user.id)

        // Purge des anciennes images APRÈS persistance (best-effort, fire-and-forget).
        void deleteStaleAvatars(supabase, user.id, fileName)
      } catch (err) {
        setError(err instanceof Error ? err.message : fallbackErrorLabel)
      } finally {
        revokeCropSrc()
        setCropSrc(null)
        setIsUploading(false)
      }
    },
    [supabase, onUploaded, fallbackErrorLabel, revokeCropSrc]
  )

  return {
    /** URL d'aperçu courante (ancienne photo jusqu'à confirmation du crop). */
    previewUrl,
    /** Source (blob URL) passée à AvatarCropModal. */
    cropSrc,
    /** État ouvert de la modale de crop. */
    cropOpen,
    /** Pilote l'ouverture/fermeture de la modale (Escape, overlay). */
    setCropOpen,
    /** Upload en cours (après confirmation du crop). */
    isUploading,
    /** Message d'erreur courant. */
    error,
    handleFileSelected,
    handleCropConfirm,
    handleCropCancel,
  }
}
