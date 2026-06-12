// apps/web/scripts/generate-pwa-icons.mjs
// Génère les icônes PWA depuis l'asset de marque (PNG transparent, fond crème).
// Usage : pnpm --filter @evolve/web generate:icons
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Fond CRÈME = token light --n-100 (#F4F4F2), bg-page clair du design-system.
// Décision owner 2026-06 : la tuile noire (#0E0C0D) était illisible sur l'écran
// d'accueil iPhone — toutes les icônes passent sur fond clair.
const BG = { r: 244, g: 244, b: 242, alpha: 1 } // #F4F4F2
const SRC = fileURLToPath(new URL('../assets/brand/icone-evolve.png', import.meta.url))
const OUT = new URL('../public/icons/', import.meta.url)
await mkdir(OUT, { recursive: true })

// Le PNG source (4724×4724) a des marges transparentes irrégulières : on trim
// l'artwork une fois pour appliquer ensuite un padding homogène et maîtrisé.
const artwork = await sharp(SRC).trim().toBuffer()

/** Compose l'artwork centré sur un carré opaque crème. scale = part du côté occupée. */
async function make(size, scale, name) {
  const inner = Math.round(size * scale)
  const logo = await sharp(artwork)
    .resize(inner, inner, { fit: 'contain', background: { ...BG, alpha: 0 } })
    .toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .flatten({ background: BG }) // garantit l'opacité (pas de pixel transparent)
    .png()
    .toFile(fileURLToPath(new URL(name, OUT)))
}

// purpose "any" : padding ~13 % par côté. Apple touch : opaque, coins carrés
// (iOS arrondit lui-même), padding ~15 %. Maskable : artwork dans la safe-zone 60 %.
await make(192, 0.74, 'icon-192.png')
await make(512, 0.74, 'icon-512.png')
await make(512, 0.6, 'icon-maskable-512.png')
await make(180, 0.7, 'apple-touch-icon-180.png')

// favicon.ico (app/favicon.ico) : conteneur ICO avec entrées PNG (supporté par
// tous les navigateurs modernes) — sharp ne sait pas écrire d'ICO nativement.
async function makeIcoPng(size) {
  const inner = Math.round(size * 0.86) // padding réduit : lisibilité aux petites tailles
  const logo = await sharp(artwork)
    .resize(inner, inner, { fit: 'contain', background: { ...BG, alpha: 0 } })
    .toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .flatten({ background: BG })
    .png()
    .toBuffer()
}
function buildIco(entries) {
  // ICONDIR (6 o) + N × ICONDIRENTRY (16 o) + données PNG concaténées.
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // réservé
  header.writeUInt16LE(1, 2) // type = icône
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = 6 + dir.length
  entries.forEach(({ size, buf }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o) // largeur (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1) // hauteur
    dir.writeUInt8(0, o + 2) // palette
    dir.writeUInt8(0, o + 3) // réservé
    dir.writeUInt16LE(1, o + 4) // plans de couleur
    dir.writeUInt16LE(32, o + 6) // bits/pixel
    dir.writeUInt32LE(buf.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += buf.length
  })
  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)])
}
const icoSizes = [16, 32, 48]
const icoEntries = await Promise.all(
  icoSizes.map(async (size) => ({ size, buf: await makeIcoPng(size) })),
)
await writeFile(
  fileURLToPath(new URL('../app/favicon.ico', import.meta.url)),
  buildIco(icoEntries),
)

console.log('icons generated (192, 512, maskable-512, apple-touch-180, favicon.ico)')
