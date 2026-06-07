/**
 * Contrat de blocs éditoriaux — `Article.corps` (dynamic zone Strapi).
 *
 * Source de vérité partagée pour le rendu email (`packages/data`). Le rendu web
 * (`apps/vitrine`) en garde un miroir local (la vitrine reste autonome, sans dépendance
 * `@evolve/*`). Toute évolution se reflète ici, dans `docs/editorial/block-contract.md`,
 * et dans les deux renderers. Cf. EDI-001.
 */

/** Média Strapi 5 peuplé (forme aplatie). `url` peut être relatif → à préfixer. */
export interface StrapiMediaRef {
  url: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
  formats?: Record<string, { url: string; width: number; height: number }> | null
}

/** Bloc de texte riche Strapi (champ `blocks`). Structure opaque côté contrat. */
export type StrapiBlocksContent = ReadonlyArray<{
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
  contenu: StrapiBlocksContent
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

/** Vue éditoriale d'un Article (champs utiles aux rendus newsletter/blog). */
export interface EditorialArticle {
  id: number
  documentId?: string
  title: string
  slug: string
  excerpt?: string | null
  type: ArticleType
  numeroEdition?: number | null
  datePublication?: string | null
  auteurNom?: string | null
  auteurRole?: string | null
  featuredImage?: StrapiMediaRef | null
  corps: EditorialBloc[]
  locale?: string
}
