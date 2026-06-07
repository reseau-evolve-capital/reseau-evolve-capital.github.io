/**
 * Upload avatar — redimensionne à 200×200 puis pousse dans le bucket `avatars`.
 * Retourne l'URL publique du fichier uploadé.
 */
import type { createBrowserClient } from '@evolve/data/supabase/client'

type SupabaseBrowser = ReturnType<typeof createBrowserClient>

// Garde-fou mémoire uniquement : la fonction RECOMPRESSE de toute façon en 200×200 WebP
// (sortie ~quelques Ko), donc inutile de rejeter une photo iPhone de 3–12 Mo — on la
// redimensionne côté client. La limite haute évite juste de charger un fichier absurde.
// (QA 2026-06-07 : « image trop lourde (max 2 Mo) » cassait l'UX pour des photos normales.)
const MAX_BYTES = 25 * 1024 * 1024

export async function resizeAndUploadAvatar(
  supabase: SupabaseBrowser,
  userId: string,
  file: File
): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('Image trop lourde (max 25 Mo).')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Format non supporté (JPG, PNG, WebP).')

  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible.')

  // Cover-fill : on scale pour remplir 200×200 et on centre
  const ratio = Math.max(200 / bitmap.width, 200 / bitmap.height)
  const w = bitmap.width * ratio
  const h = bitmap.height * ratio
  ctx.drawImage(bitmap, (200 - w) / 2, (200 - h) / 2, w, h)

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Conversion image échouée.'))),
      'image/webp',
      0.9
    )
  )

  const path = `${userId}/avatar.webp`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/webp' })
  if (error) throw new Error("Échec de l'upload de la photo.")

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}
