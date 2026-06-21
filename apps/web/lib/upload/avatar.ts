/**
 * Upload avatar — pipeline en 2 temps :
 *   1. (UI) crop interactif → produit un Blob carré (cf. AvatarCropModal).
 *   2. (ici) compression WebP 200×200 → upload Storage → purge des anciennes images.
 *
 * CACHE-BUST par construction : chaque upload utilise une CLÉ UNIQUE
 * (`{userId}/{uuid}.webp`) au lieu d'un nom fixe. L'URL publique change donc à
 * chaque changement de photo → le navigateur (et tout cache CDN) ne sert plus
 * jamais l'ancienne image. Les fichiers précédents de l'utilisateur sont ensuite
 * supprimés (RLS « avatars: self delete ») pour ne pas accumuler d'orphelins.
 */
import type { createBrowserClient } from '@evolve/data/supabase/client'

type SupabaseBrowser = ReturnType<typeof createBrowserClient>

const BUCKET = 'avatars'
const OUTPUT_SIZE = 200

// Garde-fou mémoire uniquement : la fonction RECOMPRESSE de toute façon en 200×200 WebP
// (sortie ~quelques Ko), donc inutile de rejeter une photo iPhone de 3–12 Mo — on la
// redimensionne côté client. La limite haute évite juste de charger un fichier absurde.
// (QA 2026-06-07 : « image trop lourde (max 2 Mo) » cassait l'UX pour des photos normales.)
const MAX_BYTES = 25 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Type d'image accepté en entrée du flux avatar. Pur (testable). */
export function isAcceptedAvatarType(type: string): boolean {
  return ACCEPTED_TYPES.includes(type)
}

/** Valide taille + type d'un fichier avatar. Lève une erreur explicite (FR). Pur. */
export function assertAvatarFile(file: File): void {
  if (file.size > MAX_BYTES) throw new Error('Image trop lourde (max 25 Mo).')
  if (!isAcceptedAvatarType(file.type)) throw new Error('Format non supporté (JPG, PNG, WebP).')
}

/** Clé objet Storage UNIQUE par upload : `{userId}/{id}.webp`. Pur (testable). */
export function avatarObjectPath(userId: string, id: string): string {
  return `${userId}/${id}.webp`
}

/**
 * Parmi les fichiers listés du dossier d'un utilisateur, ceux à supprimer :
 * tous les `.webp` SAUF celui qu'on vient d'uploader (`keepName`). Pur (testable).
 * Ignore le placeholder de dossier vide et tout fichier non-webp.
 */
export function staleAvatarObjectNames(
  files: ReadonlyArray<{ name: string }>,
  keepName: string
): string[] {
  return files.map((f) => f.name).filter((name) => name.endsWith('.webp') && name !== keepName)
}

/**
 * Redimensionne un Blob en WebP carré (cover-fill) de `size`×`size`. DOM/canvas requis.
 * Le crop modal produit déjà un Blob ~1:1 ; on garantit ici la sortie Storage canonique.
 */
export async function resizeToWebpSquare(blob: Blob, size = OUTPUT_SIZE): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponible.')

    // Cover-fill : on scale pour remplir size×size et on centre.
    const ratio = Math.max(size / bitmap.width, size / bitmap.height)
    const w = bitmap.width * ratio
    const h = bitmap.height * ratio
    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Conversion image échouée.'))),
        'image/webp',
        0.9
      )
    )
  } finally {
    bitmap.close()
  }
}

/**
 * Supprime les anciennes images avatar de l'utilisateur (best-effort : un échec ne
 * remet jamais en cause l'upload réussi). RLS « avatars: self delete ».
 */
export async function deleteStaleAvatars(
  supabase: SupabaseBrowser,
  userId: string,
  keepName: string
): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(userId)
  if (error || !data) return
  const stale = staleAvatarObjectNames(data, keepName).map((name) => `${userId}/${name}`)
  if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale)
}

/** Résultat d'un upload avatar. `fileName` sert à purger les anciennes images APRÈS persistance. */
export interface UploadedAvatar {
  /** URL publique cache-bustée (clé unique → URL neuve à chaque upload). */
  url: string
  /** Nom du fichier conservé (`{uuid}.webp`) — à passer à `deleteStaleAvatars`. */
  fileName: string
}

/**
 * Upload d'un Blob avatar (déjà croppé en amont) :
 * resize WebP 200×200 → clé UNIQUE → URL publique (cache-bustée).
 *
 * NE supprime PAS les anciennes images ici : la purge doit avoir lieu APRÈS que le
 * nouveau pointeur (`users.avatar_url` / store) est persisté, sinon un échec de
 * persistance laisserait `avatar_url` pointer vers un fichier déjà supprimé. Le flux
 * appelle `deleteStaleAvatars(..., fileName)` une fois la persistance réussie.
 */
export async function uploadAvatarBlob(
  supabase: SupabaseBrowser,
  userId: string,
  blob: Blob
): Promise<UploadedAvatar> {
  const webp = await resizeToWebpSquare(blob)
  const id = crypto.randomUUID()
  const fileName = `${id}.webp`
  const path = avatarObjectPath(userId, id)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, webp, { upsert: false, contentType: 'image/webp' })
  if (error) throw new Error("Échec de l'upload de la photo.")

  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, fileName }
}
