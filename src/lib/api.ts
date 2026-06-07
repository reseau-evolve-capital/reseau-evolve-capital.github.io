import strapiClient from './strapi'

// Base type for all Strapi documents
export interface StrapiDocumentBase {
  id: number
  documentId?: string
  createdAt: string
  updatedAt: string
  publishedAt: string
}

// This is the actual document structure we get from Strapi client
export type StrapiDocument<T> = T & StrapiDocumentBase

// Strapi block content types from @strapi/blocks-react-renderer
export interface StrapiBlocksContent {
  type: 'root'
  children: unknown[]
  [key: string]: unknown
}

export interface ArticleFields {
  title: string
  slug: string
  excerpt: string
  content: StrapiBlocksContent
  featuredImage: StrapiMedia
  SEOMetaTitle: string
  SEOMetaDescription: string
  category: (CategoryFields & StrapiDocumentBase) | null
  tags: (TagFields & StrapiDocumentBase)[] | null
  author: (AuthorFields & StrapiDocumentBase) | null
  locale: string
  // --- Évolution éditoriale (EDI-001/003) — additif, ne casse pas le legacy ---
  /** Dynamic zone éditoriale. Présente sur les newsletters et nouveaux articles. */
  corps?: EditorialBloc[] | null
  /** Discrimine le type de contenu. `'newsletter'` pour La Quote-Part. */
  type?: ArticleType | null
  /** Numéro d'édition (rempli pour les newsletters). */
  numeroEdition?: number | null
  /** Date de publication éditoriale (ISO). Fallback : `publishedAt`. */
  datePublication?: string | null
  /** Auteur dénormalisé (champ texte éditorial, distinct de la relation `author`). */
  auteurNom?: string | null
  /** Rôle de l'auteur (champ texte éditorial). */
  auteurRole?: string | null
}

// ---------------------------------------------------------------------------
// Types de blocs éditoriaux — MIROIR de packages/types/src/editorial.ts.
// La vitrine reste autonome (pas de dépendance @evolve/*) ; toute évolution se
// reflète ici, dans packages/types/src/editorial.ts et docs/editorial/block-contract.md.
// ---------------------------------------------------------------------------

/** Média Strapi 5 peuplé (forme aplatie). `url` peut être relatif → préfixer via getStrapiMediaUrl. */
export interface StrapiMediaRef {
  url: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
  formats?: Record<string, { url: string; width: number; height: number }> | null
}

/** Bloc de texte riche Strapi (champ `blocks`). Structure opaque côté contrat. */
export type StrapiBlocksContentArray = ReadonlyArray<{
  type: string
  children?: unknown[]
  [key: string]: unknown
}>

export interface LabelRubriqueBloc {
  __component: 'blocs.label-rubrique'
  id: number
  texte: string
}

export interface RichTextBloc {
  __component: 'blocs.rich-text'
  id: number
  contenu: StrapiBlocksContentArray
}

export interface CitationBloc {
  __component: 'blocs.citation'
  id: number
  texte: string
  attribution?: string | null
}

export interface ImageBloc {
  __component: 'blocs.image'
  id: number
  image: StrapiMediaRef
  imageDark?: StrapiMediaRef | null
  legende?: string | null
  alt: string
}

export interface GalerieBloc {
  __component: 'blocs.galerie'
  id: number
  images: StrapiMediaRef[]
  legende?: string | null
  disposition: 'grille' | 'colonne'
}

export interface LeChiffreBloc {
  __component: 'blocs.le-chiffre'
  id: number
  imageClaire: StrapiMediaRef
  imageSombre?: StrapiMediaRef | null
  legende?: string | null
  source?: string | null
  fallbackTexte?: string | null
}

export interface EtagereItem {
  titre: string
  auteur?: string | null
  pourquoi?: string | null
}

export interface EtagereBloc {
  __component: 'blocs.etagere'
  id: number
  items: EtagereItem[]
}

export type UrlInterne = 'quote-part' | 'blog' | 'contact' | 'espace-membre'

export interface CtaBloc {
  __component: 'blocs.cta'
  id: number
  libelle: string
  url?: string | null
  urlInterne?: UrlInterne | null
}

export interface SeparateurBloc {
  __component: 'blocs.separateur'
  id: number
  style: 'filet' | 'espace'
}

/** Union discriminée sur `__component`. */
export type EditorialBloc =
  | LabelRubriqueBloc
  | RichTextBloc
  | CitationBloc
  | ImageBloc
  | GalerieBloc
  | LeChiffreBloc
  | EtagereBloc
  | CtaBloc
  | SeparateurBloc

export type ArticleType = 'newsletter' | 'article'

export type Article = StrapiDocument<ArticleFields>

export interface CategoryFields {
  name: string
  description: string | null
  articles?: (ArticleFields & StrapiDocumentBase)[] | null
  locale: string
}

export type Category = StrapiDocument<CategoryFields>

export interface SocialMediaLink {
  platform: string
  url: string
  icon?: string
}

export interface AuthorFields {
  name: string
  bio: StrapiBlocksContent
  avatar: StrapiMedia
  socialMediaLinks: SocialMediaLink[]
}

export type Author = StrapiDocument<AuthorFields>

export interface TagFields {
  name: string
  articles?: (ArticleFields & StrapiDocumentBase)[] | null
}

export type Tag = StrapiDocument<TagFields>

export interface StrapiMedia {
  id: number

  name: string
  alternativeText: string
  caption: string
  width: number
  height: number
  formats: {
    thumbnail: StrapiMediaFormat
    small: StrapiMediaFormat
    medium: StrapiMediaFormat
    large: StrapiMediaFormat
  }
  hash: string
  ext: string
  mime: string
  size: number
  url: string
  previewUrl: string | null
  provider: string
  provider_metadata: null
  createdAt: string
  updatedAt: string
}

export interface StrapiMediaFormat {
  name: string
  hash: string
  ext: string
  mime: string
  path: string | null
  width: number
  height: number
  size: number
  url: string
}

// API functions to fetch data from Strapi
export async function getAllArticles(locale: string): Promise<Article[]> {
  try {
    const articles = strapiClient.collection('articles')
    const response = await articles.find({
      locale,
      populate: ['featuredImage', 'category', 'author', 'author.avatar', 'tags'],
      sort: ['publishedAt:desc'],
    })

    return response.data as unknown as Article[]
  } catch (error) {
    console.error('Error fetching articles:', error)
    return []
  }
}

export async function getArticleBySlug(slug: string, locale: string): Promise<Article | null> {
  try {
    const articles = strapiClient.collection('articles')
    const response = await articles.find({
      locale,
      filters: {
        slug: {
          $eq: slug,
        },
      },
      // Deep-populate `corps` (peuple les médias DANS chaque bloc via `*`) +
      // l'image de couverture, la catégorie, l'auteur (relation) et les tags.
      // Cf. docs/editorial/block-contract.md §Populate requis.
      populate: {
        corps: { populate: '*' },
        featuredImage: true,
        category: true,
        author: { populate: ['avatar'] },
        tags: true,
      },
    })

    return (response.data[0] as unknown as Article) || null
  } catch (error) {
    console.error(`Error fetching article with slug ${slug}:`, error)
    return null
  }
}

export async function getArticleOfLocaleAndDocumentId(
  documentId: string,
  locale: string
): Promise<Article | null> {
  try {
    const articles = strapiClient.collection('articles')
    const response = await articles.find({
      locale,
      filters: {
        documentId: {
          $eq: documentId,
        },
      },
      populate: ['featuredImage', 'category', 'author', 'author.avatar', 'tags'],
    })

    return response.data?.[0] as unknown as Article
  } catch (error) {
    console.error(`Error fetching articles for documentId ${documentId}:`, error)
    return null
  }
}

export async function getAllCategories(locale: string): Promise<Category[]> {
  try {
    const categories = strapiClient.collection('categories')
    const response = await categories.find({
      locale,
      sort: ['name:asc'],
    })

    return response.data as unknown as Category[]
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

export async function getArticlesByCategory(
  categoryId: number,
  locale: string
): Promise<Article[]> {
  try {
    const articles = strapiClient.collection('articles')
    const response = await articles.find({
      locale,
      filters: {
        category: {
          id: {
            $eq: categoryId,
          },
        },
      },
      populate: ['featuredImage', 'category', 'author', 'author.avatar'],
      sort: ['publishedAt:desc'],
    })

    return response.data as unknown as Article[]
  } catch (error) {
    console.error(`Error fetching articles for category ${categoryId}:`, error)
    return []
  }
}

export async function getAllAuthors(): Promise<Author[]> {
  try {
    const authors = strapiClient.collection('authors')
    const response = await authors.find({
      populate: ['avatar'],
    })

    return response.data as unknown as Author[]
  } catch (error) {
    console.error('Error fetching authors:', error)
    return []
  }
}

// Function to get the absolute URL for Strapi media.
// Accepte le média legacy (StrapiMedia) ET le média aplati des blocs éditoriaux
// (StrapiMediaRef) — seul `url` est requis.
export function getStrapiMediaUrl(media?: StrapiMedia | StrapiMediaRef | null): string {
  if (!media || !media.url) return ''

  const { url } = media
  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'

  // If the URL is already absolute, return it as is
  if (url.startsWith('http')) {
    return url
  }

  // Otherwise, prepend the base URL
  return `${baseUrl}${url}`
}
