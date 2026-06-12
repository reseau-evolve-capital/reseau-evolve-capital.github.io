// apps/web/scripts/generate-pwa-splash.mjs
// Génère les splash screens iOS (apple-touch-startup-image) — portrait uniquement.
// iOS ignore background_color du manifest : sans ces images, la PWA affiche un
// écran noir ~3 s au cold start. Usage : pnpm --filter @evolve/web generate:splash
//
// Deux modes :
//  - si apps/web/assets/brand/splash-master.png existe (visuel designé par l'owner),
//    il est utilisé en cover-crop centré ;
//  - sinon (cas actuel) : composition fond crème + logo centré (~28 % de la largeur).
//
// Le script écrit aussi apps/web/lib/pwa/startup-images.ts (constante consommée par
// metadata.appleWebApp.startupImage dans app/layout.tsx) — ne pas l'éditer à la main.
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const BG = { r: 244, g: 244, b: 242, alpha: 1 } // #F4F4F2 — token light --n-100
const LOGO = fileURLToPath(new URL('../assets/brand/icone-evolve.png', import.meta.url))
const MASTER = fileURLToPath(new URL('../assets/brand/splash-master.png', import.meta.url))
const OUT = new URL('../public/splash/', import.meta.url)
await mkdir(OUT, { recursive: true })

// Couples width(pt) × height(pt) @ devicePixelRatio des devices iOS courants.
// iOS matche le splash via media query exacte (device-width/height en points).
const DEVICES = [
  // iPhone
  { w: 375, h: 667, r: 2 }, // SE 2/3, 6/7/8
  { w: 375, h: 812, r: 3 }, // X/XS/11 Pro/12-13 mini
  { w: 390, h: 844, r: 3 }, // 12/13/14
  { w: 393, h: 852, r: 3 }, // 14 Pro/15/16
  { w: 402, h: 874, r: 3 }, // 16 Pro
  { w: 414, h: 896, r: 2 }, // XR/11
  { w: 414, h: 896, r: 3 }, // XS Max/11 Pro Max
  { w: 428, h: 926, r: 3 }, // 12-13 Pro Max/14 Plus
  { w: 430, h: 932, r: 3 }, // 14 Pro Max/15 Plus·Pro Max/16 Plus
  { w: 440, h: 956, r: 3 }, // 16 Pro Max
  // iPad
  { w: 744, h: 1133, r: 2 }, // mini 6
  { w: 768, h: 1024, r: 2 }, // mini 5, 9.7"
  { w: 810, h: 1080, r: 2 }, // 10.2"
  { w: 820, h: 1180, r: 2 }, // 10.9" / Air 11
  { w: 834, h: 1194, r: 2 }, // Pro 11 / Air 10.9
  { w: 1024, h: 1366, r: 2 }, // Pro 12.9
]

const useMaster = existsSync(MASTER)
// Sans master : artwork trimé une fois (marges transparentes irrégulières du PNG source).
const artwork = useMaster ? null : await sharp(LOGO).trim().toBuffer()

async function makeSplash({ w, h, r }, name) {
  const W = w * r
  const H = h * r
  if (useMaster) {
    // Visuel designé : cover-crop centré aux dimensions exactes du device.
    await sharp(MASTER)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .flatten({ background: BG })
      .png()
      .toFile(fileURLToPath(new URL(name, OUT)))
    return
  }
  // Fallback : fond crème, logo centré ≈ 28 % de la largeur du device.
  const inner = Math.round(W * 0.28)
  const logo = await sharp(artwork)
    .resize(inner, inner, { fit: 'contain', background: { ...BG, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .flatten({ background: BG })
    .png()
    .toFile(fileURLToPath(new URL(name, OUT)))
}

const entries = []
for (const d of DEVICES) {
  const name = `splash-${d.w}x${d.h}@${d.r}.png`
  await makeSplash(d, name)
  entries.push({
    url: `/splash/${name}`,
    media: `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.r}) and (orientation: portrait)`,
  })
}

// Constante consommée par metadata.appleWebApp.startupImage (app/layout.tsx).
const ts = `// apps/web/lib/pwa/startup-images.ts
// ⚠ FICHIER GÉNÉRÉ par scripts/generate-pwa-splash.mjs — ne pas éditer à la main.
// Régénérer : pnpm --filter @evolve/web generate:splash

/** Splash screens iOS (apple-touch-startup-image), portrait uniquement. */
export const PWA_STARTUP_IMAGES = ${JSON.stringify(entries, null, 2)} as const
`
await writeFile(fileURLToPath(new URL('../lib/pwa/startup-images.ts', import.meta.url)), ts)

console.log(
  `splash generated: ${entries.length} images (${useMaster ? 'splash-master cover-crop' : 'fallback logo crème'}) + lib/pwa/startup-images.ts`,
)
