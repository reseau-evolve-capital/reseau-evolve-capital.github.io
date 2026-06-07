import type {
  EditorialArticle,
  EditorialBloc,
  StrapiBlocksContent,
  StrapiMediaRef,
} from '@evolve/types'

/**
 * Mapper Article Strapi (forme API aplatie, Strapi 5) → `EditorialArticle` canonique
 * prêt pour le rendu email (EDI-005).
 *
 * Responsabilités :
 *   - aplatit les médias single (`{ url, … } | null`) et multiple (`[{ url, … }]`) ;
 *   - PRÉFIXE toutes les URLs média RELATIVES (`/uploads/…`) en ABSOLUES via `mediaBase`
 *     (les clients mail ne résolvent pas les chemins relatifs — cf. block-contract.md) ;
 *   - recopie les blocs de `corps[]` en réécrivant leurs champs média ;
 *   - reste résilient : champ manquant → valeur neutre, jamais de throw.
 *
 * `mediaBase` = origine du serveur Strapi (ex. `https://cms.reseauevolvecapital.com`),
 * sans slash final requis. Les URLs déjà absolues (http/https) sont laissées telles quelles.
 */

type RawArticle = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Préfixe une URL média relative en absolue ; laisse les absolues intactes. */
function absolutize(url: string, mediaBase: string): string {
  const u = url.trim()
  if (u === '') return u
  if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u
  const base = mediaBase.replace(/\/+$/, '')
  const path = u.startsWith('/') ? u : `/${u}`
  return `${base}${path}`
}

/** Mappe un média single Strapi (objet aplati) → `StrapiMediaRef` avec URL absolue. */
function mapMedia(value: unknown, mediaBase: string): StrapiMediaRef | null {
  if (!isRecord(value)) return null
  const url = str(value.url)
  if (url === undefined || url.trim() === '') return null
  const formatsRaw = value.formats
  let formats: StrapiMediaRef['formats'] = null
  if (isRecord(formatsRaw)) {
    formats = {}
    for (const [key, f] of Object.entries(formatsRaw)) {
      if (isRecord(f) && typeof f.url === 'string') {
        formats[key] = {
          url: absolutize(f.url, mediaBase),
          width: num(f.width) ?? 0,
          height: num(f.height) ?? 0,
        }
      }
    }
  }
  return {
    url: absolutize(url, mediaBase),
    alternativeText: str(value.alternativeText) ?? null,
    width: num(value.width),
    height: num(value.height),
    formats,
  }
}

/** Mappe un média multiple Strapi (tableau aplati) → `StrapiMediaRef[]` (vide si absent). */
function mapMediaList(value: unknown, mediaBase: string): StrapiMediaRef[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => mapMedia(item, mediaBase))
    .filter((m): m is StrapiMediaRef => m !== null)
}

/** Réécrit un bloc brut en bloc canonique, en absolutisant ses médias. */
function mapBloc(raw: unknown, mediaBase: string): EditorialBloc | null {
  if (!isRecord(raw)) return null
  const component = str(raw.__component)
  if (component === undefined) return null
  const id = num(raw.id) ?? 0

  switch (component) {
    case 'blocs.label-rubrique':
      return { __component: component, id, texte: str(raw.texte) ?? '' }

    case 'blocs.rich-text': {
      const contenu: StrapiBlocksContent = Array.isArray(raw.contenu)
        ? (raw.contenu.filter(isRecord) as unknown as StrapiBlocksContent)
        : []
      return { __component: component, id, contenu }
    }

    case 'blocs.citation':
      return {
        __component: component,
        id,
        texte: str(raw.texte) ?? '',
        attribution: str(raw.attribution) ?? null,
      }

    case 'blocs.image': {
      const image = mapMedia(raw.image, mediaBase)
      if (!image) return null
      return {
        __component: component,
        id,
        image,
        imageDark: mapMedia(raw.imageDark, mediaBase),
        legende: str(raw.legende) ?? null,
        alt: str(raw.alt) ?? '',
      }
    }

    case 'blocs.galerie': {
      const disposition = raw.disposition === 'grille' ? 'grille' : 'colonne'
      return {
        __component: component,
        id,
        images: mapMediaList(raw.images, mediaBase),
        legende: str(raw.legende) ?? null,
        disposition,
      }
    }

    case 'blocs.le-chiffre': {
      const imageClaire = mapMedia(raw.imageClaire, mediaBase)
      if (!imageClaire) return null
      return {
        __component: component,
        id,
        imageClaire,
        imageSombre: mapMedia(raw.imageSombre, mediaBase),
        legende: str(raw.legende) ?? null,
        source: str(raw.source) ?? null,
        fallbackTexte: str(raw.fallbackTexte) ?? null,
      }
    }

    case 'blocs.etagere': {
      const items = Array.isArray(raw.items)
        ? raw.items.filter(isRecord).map((it) => ({
            titre: str(it.titre) ?? '',
            auteur: str(it.auteur) ?? null,
            pourquoi: str(it.pourquoi) ?? null,
          }))
        : []
      return { __component: component, id, items }
    }

    case 'blocs.cta': {
      const urlInterne = raw.urlInterne
      const validInterne =
        urlInterne === 'quote-part' ||
        urlInterne === 'blog' ||
        urlInterne === 'contact' ||
        urlInterne === 'espace-membre'
          ? urlInterne
          : null
      return {
        __component: component,
        id,
        libelle: str(raw.libelle) ?? '',
        url: str(raw.url) ?? null,
        urlInterne: validInterne,
      }
    }

    case 'blocs.separateur':
      return {
        __component: component,
        id,
        style: raw.style === 'espace' ? 'espace' : 'filet',
      }

    default:
      // Composant inconnu : ignoré (résilience). Le renderer ne le verra jamais.
      return null
  }
}

export interface MapArticleOptions {
  /** Origine du serveur Strapi pour absolutiser les URLs média relatives. */
  mediaBase: string
}

/**
 * Transforme un Article brut Strapi (déjà peuplé, forme aplatie) en `EditorialArticle`.
 * Les médias relatifs sont préfixés par `mediaBase`. Les blocs invalides/inconnus sont écartés.
 */
export function mapArticleToEmail(raw: RawArticle, options: MapArticleOptions): EditorialArticle {
  const { mediaBase } = options
  const corpsRaw = Array.isArray(raw.corps) ? raw.corps : []
  const corps = corpsRaw
    .map((b) => mapBloc(b, mediaBase))
    .filter((b): b is EditorialBloc => b !== null)

  const type = raw.type === 'article' ? 'article' : 'newsletter'

  return {
    id: num(raw.id) ?? 0,
    documentId: str(raw.documentId),
    title: str(raw.title) ?? '',
    slug: str(raw.slug) ?? '',
    excerpt: str(raw.excerpt) ?? null,
    type,
    numeroEdition: num(raw.numeroEdition),
    datePublication: str(raw.datePublication) ?? null,
    auteurNom: str(raw.auteurNom) ?? null,
    auteurRole: str(raw.auteurRole) ?? null,
    featuredImage: mapMedia(raw.featuredImage, mediaBase),
    corps,
    locale: str(raw.locale),
  }
}
