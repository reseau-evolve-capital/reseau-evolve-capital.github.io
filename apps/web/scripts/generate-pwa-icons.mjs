// apps/web/scripts/generate-pwa-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const BG = { r: 14, g: 12, b: 13, alpha: 1 } // #0E0C0D
const SRC = fileURLToPath(new URL('../public/logo.jpg', import.meta.url))
const OUT = new URL('../public/icons/', import.meta.url)
await mkdir(OUT, { recursive: true })
async function make(size, scale, name) {
  const inner = Math.round(size * scale)
  const logo = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: BG }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(fileURLToPath(new URL(name, OUT)))
}
await make(192, 0.82, 'icon-192.png')
await make(512, 0.82, 'icon-512.png')
await make(512, 0.6, 'icon-maskable-512.png') // safe-zone padding
await make(180, 0.82, 'apple-touch-icon-180.png')
console.log('icons generated')
