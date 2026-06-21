/**
 * Helpers de recadrage avatar — convertit la zone de crop (react-easy-crop) en Blob carré.
 * DOM/canvas requis : testé via QA manuelle + Storybook (pas en jsdom).
 */

/** Zone de crop en pixels de l'image source (compatible `Area` de react-easy-crop). */
export interface CropAreaPixels {
  x: number
  y: number
  width: number
  height: number
}

/** Charge une image depuis une URL (blob/data URL). */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', () => reject(new Error("Chargement de l'image échoué.")))
    img.src = src
  })
}

/**
 * Recadre `imageSrc` selon `area` (pixels source) et produit un Blob carré JPEG
 * de `outputSize`×`outputSize`. La compression WebP 200×200 finale reste côté app
 * (`lib/upload/avatar.ts`) — ici on sort une source de bonne qualité.
 */
export async function getCroppedBlob(
  imageSrc: string,
  area: CropAreaPixels,
  outputSize = 512
): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible.')

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputSize, outputSize)

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Conversion image échouée.'))),
      'image/jpeg',
      0.92
    )
  )
}
