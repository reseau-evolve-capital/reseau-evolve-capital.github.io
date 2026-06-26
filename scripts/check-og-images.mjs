#!/usr/bin/env node
// Vérifie l'og:image de CHAQUE article du blog (RT-07).
//
// Pourquoi : WhatsApp (crawler strict) rejette une og:image > ~300 KB ou sans
// balises de dimensions → aucune preview. Ce script garde-fou s'exécute APRÈS
// le build statique (`make export` → `out/`) et échoue
// (exit 1) si un article émet une og:image hors budget. Il lit le HTML
// réellement généré (= ce que voit le crawler), pas le code source.
//
// Usage :
//   node scripts/check-og-images.mjs            # crawl out/
//   OG_DIR=out node scripts/check-og-images.mjs # dossier custom
//   OG_MAX_BYTES=300000 OG_MAX_WIDTH=1600 node ...           # budgets custom
//   OG_SKIP_HEAD=1 node ...                                  # sans requête réseau (dimensions/type seulement)
//
// À câbler dans le flux de deploy vitrine (manuel ou `deploy-vitrine.yml`) :
//   make export && node scripts/check-og-images.mjs && pnpm run deploy

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const OG_DIR = resolve(process.env.OG_DIR ?? 'out')
const MAX_BYTES = Number(process.env.OG_MAX_BYTES ?? 300_000)
const MAX_WIDTH = Number(process.env.OG_MAX_WIDTH ?? 1600)
const SKIP_HEAD = process.env.OG_SKIP_HEAD === '1'

/** Extrait une balise `<meta property="og:..." content="...">` du HTML (ordre des attributs indifférent). */
export function readMeta(html, property) {
  // property="og:image" ... content="..."  OU  content="..." ... property="og:image"
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const a = new RegExp(`<meta[^>]+property=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i')
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']${esc}["']`, 'i')
  return html.match(a)?.[1] ?? html.match(b)?.[1] ?? null
}

/**
 * Vrai uniquement pour une page d'ARTICLE `…/blog/<slug>/index.html`.
 * Exclut la liste `…/blog/index.html` et les catégories `…/blog/category/<id>/index.html`,
 * qui partagent l'og PAR DÉFAUT du site (concern de branding distinct, hors RT-07).
 */
function isArticlePath(p) {
  const i = p.lastIndexOf(`${'/blog/'}`)
  if (i === -1) return false
  const segs = p.slice(i + '/blog/'.length).split('/')
  return segs.length === 2 && segs[0] !== 'category' && segs[1] === 'index.html'
}

/** Liste récursivement les pages d'ARTICLE de blog (cf. isArticlePath). */
async function findBlogHtml(dir) {
  const out = []
  async function walk(d) {
    let entries
    try {
      entries = await readdir(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const p = join(d, e.name)
      if (e.isDirectory()) await walk(p)
      else if (e.isFile() && e.name === 'index.html' && isArticlePath(p)) out.push(p)
    }
  }
  await walk(dir)
  return out
}

async function checkOne(file) {
  const html = await readFile(file, 'utf8')
  const ogImage = readMeta(html, 'og:image') ?? readMeta(html, 'og:image:url')
  // Article sans og:image (ne devrait pas arriver : resolveBlogOgImage pose toujours un fallback) → on ignore.
  if (!ogImage) return { file, skipped: true }

  const errors = []
  const width = Number(readMeta(html, 'og:image:width') ?? '0')
  const height = Number(readMeta(html, 'og:image:height') ?? '0')
  const type = readMeta(html, 'og:image:type') ?? ''

  if (!width) errors.push('og:image:width manquante')
  else if (width > MAX_WIDTH) errors.push(`largeur ${width}px > ${MAX_WIDTH}px (image brute non redimensionnée ?)`)
  if (!height) errors.push('og:image:height manquante')
  if (!/^image\//.test(type)) errors.push(`og:image:type "${type}" invalide`)

  // Vérif du POIDS. Pour un asset AUTO-HÉBERGÉ (présent dans le build out/, ex. le fallback
  // /og-blog-fallback.png) on mesure le FICHIER du build — surtout PAS un HEAD sur l'URL live,
  // qui renverrait l'image ACTUELLEMENT en ligne, pas celle qu'on s'apprête à déployer
  // (faux échec poule/œuf). Pour une image EXTERNE (CDN Strapi, déjà en ligne) on garde le HEAD.
  let localBytes = null
  try {
    const pathname = new URL(ogImage).pathname
    const st = await stat(join(OG_DIR, decodeURIComponent(pathname))).catch(() => null)
    if (st?.isFile()) localBytes = st.size
  } catch {
    // og:image relative (improbable : metadataBase rend l'URL absolue) → on tentera le HEAD
  }

  if (localBytes != null) {
    if (localBytes >= MAX_BYTES)
      errors.push(
        `${Math.round(localBytes / 1024)} KB >= ${Math.round(MAX_BYTES / 1024)} KB (asset local du build, rejet WhatsApp)`
      )
  } else if (!SKIP_HEAD) {
    try {
      const res = await fetch(ogImage, { method: 'HEAD' })
      if (!res.ok) errors.push(`HEAD ${res.status} sur ${ogImage}`)
      const ct = res.headers.get('content-type') ?? ''
      if (!/^image\//.test(ct)) errors.push(`content-type "${ct}" non-image`)
      const len = Number(res.headers.get('content-length') ?? '0')
      if (len > 0 && len >= MAX_BYTES)
        errors.push(`${Math.round(len / 1024)} KB >= ${Math.round(MAX_BYTES / 1024)} KB (rejet WhatsApp)`)
    } catch (e) {
      errors.push(`HEAD échoué : ${e.message}`)
    }
  }
  return { file, ogImage, width, height, type, errors }
}

const files = await findBlogHtml(OG_DIR)
if (files.length === 0) {
  console.error(`❌ Aucun index.html sous "${OG_DIR}". Lance d'abord \`make export\` (Strapi up).`)
  process.exit(1)
}

const results = await Promise.all(files.map(checkOne))
const checked = results.filter((r) => !r.skipped)
const failed = checked.filter((r) => r.errors.length > 0)

for (const r of checked) {
  if (r.errors.length) console.error(`❌ ${r.file}\n   ${r.errors.join('\n   ')}`)
  else console.log(`✅ ${r.file} — ${r.width}×${r.height} ${r.type}`)
}
console.log(`\n${checked.length} article(s) avec og:image · ${failed.length} en échec · ${results.length - checked.length} page(s) sans og:image ignorée(s)`)
process.exit(failed.length > 0 ? 1 : 0)
