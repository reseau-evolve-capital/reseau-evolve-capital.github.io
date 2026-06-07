import fs from 'node:fs'
import path from 'node:path'
import type { Core } from '@strapi/strapi'

/**
 * Seed idempotent de l'édition 01 « La Quote-Part » (EDI-002).
 *
 * Déclenché par le bootstrap UNIQUEMENT si `process.env.SEED_EDITION_01 === '1'`.
 * Crée l'article (brouillon) à partir du fixture partagé
 * `docs/editorial/fixtures/edition-01.json` et génère des images placeholder
 * (sharp) pour les médias requis (featuredImage + le-chiffre clair/sombre), faute
 * d'assets réels. L'owner remplace ensuite ces visuels dans l'admin.
 *
 * Idempotent : si un article de slug `evitons-l-empressement` existe déjà, on ne fait rien.
 * Aucune donnée membre réelle (cf. CLAUDE.md).
 */

type MediaRef = { url: string; alternativeText?: string | null }

// Couleurs placeholder (tokens marque) — fond clair baked pour rester lisible partout.
const PLACEHOLDERS: Record<
  string,
  { w: number; h: number; bg: { r: number; g: number; b: number } }
> = {
  '/uploads/quote_part_01_cover.png': { w: 1200, h: 630, bg: { r: 35, g: 31, b: 32 } },
  '/uploads/le_chiffre_01_clair.png': { w: 1104, h: 736, bg: { r: 250, g: 250, b: 249 } },
  '/uploads/le_chiffre_01_sombre.png': { w: 1104, h: 736, bg: { r: 24, g: 24, b: 27 } },
}

async function makePlaceholderPng(w: number, h: number, bg: { r: number; g: number; b: number }) {
  // sharp est une dépendance Strapi (traitement d'images) → disponible côté serveur.
  const sharp = (await import('sharp')).default
  return sharp({
    create: { width: w, height: h, channels: 3, background: bg },
  })
    .png()
    .toBuffer()
}

async function uploadPlaceholder(strapi: Core.Strapi, ref: MediaRef): Promise<number | null> {
  const spec = PLACEHOLDERS[ref.url]
  if (!spec) return null
  const name = path.basename(ref.url)
  const buffer = await makePlaceholderPng(spec.w, spec.h, spec.bg)
  const tmp = path.join(strapi.dirs.app.root, '.tmp', name)
  fs.mkdirSync(path.dirname(tmp), { recursive: true })
  fs.writeFileSync(tmp, buffer)

  const uploaded = await strapi
    .plugin('upload')
    .service('upload')
    .upload({
      data: { fileInfo: { name, alternativeText: ref.alternativeText ?? name } },
      files: {
        filepath: tmp,
        originalFilename: name,
        mimetype: 'image/png',
        size: buffer.length,
      },
    })
  fs.rmSync(tmp, { force: true })
  const file = Array.isArray(uploaded) ? uploaded[0] : uploaded
  return file?.id ?? null
}

export async function seedEdition01(strapi: Core.Strapi): Promise<void> {
  const slug = 'evitons-l-empressement'
  const existing = await strapi.documents('api::article.article').findMany({
    filters: { slug },
    status: 'draft',
  })
  if (existing.length > 0) {
    strapi.log.info('[seed] édition 01 déjà présente — rien à faire.')
    return
  }

  // apps/cms/../../docs = racine du monorepo + docs (robuste, indépendant de dist/src).
  const fixturePath = path.resolve(
    strapi.dirs.app.root,
    '../../docs/editorial/fixtures/edition-01.json'
  )
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

  // Upload des médias requis et remplacement des refs par les IDs Strapi.
  const coverId = await uploadPlaceholder(strapi, fixture.featuredImage)

  const corps = await Promise.all(
    fixture.corps.map(async (bloc: Record<string, unknown>) => {
      if (bloc.__component === 'blocs.le-chiffre') {
        const claireId = await uploadPlaceholder(strapi, bloc.imageClaire as MediaRef)
        const sombreId = bloc.imageSombre
          ? await uploadPlaceholder(strapi, bloc.imageSombre as MediaRef)
          : null
        return { ...bloc, imageClaire: claireId, imageSombre: sombreId }
      }
      return bloc
    })
  )

  await strapi.documents('api::article.article').create({
    data: {
      title: fixture.title,
      slug: fixture.slug,
      excerpt: fixture.excerpt,
      type: fixture.type,
      numeroEdition: fixture.numeroEdition,
      datePublication: fixture.datePublication,
      auteurNom: fixture.auteurNom,
      auteurRole: fixture.auteurRole,
      featuredImage: coverId,
      corps,
    },
    locale: 'fr',
    status: 'draft',
  })

  strapi.log.info("[seed] édition 01 « Évitons l'empressement. » créée (brouillon).")
}
