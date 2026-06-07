// Client Strapi éditorial SERVER-ONLY (apps/web, EDI-006).
//
// L'app membre lit les newsletters publiées (type=newsletter) depuis le CMS Strapi
// pour les prévisualiser et les envoyer (pipeline Brevo). On ne sert JAMAIS un brouillon :
// l'API publique Strapi (draftAndPublish) ne renvoie que le publié.
//
// `NEXT_PUBLIC_STRAPI_API_URL` inclut `/api` (ex. https://cms…/api). Le mapper email exige
// un `mediaBase` = ORIGINE du serveur (sans `/api`) pour absolutiser les `/uploads/…`.
// Réf : block-contract.md §populate, mappers/article-to-email.ts.

import type { EditorialArticle } from '@evolve/types'
import { mapArticleToEmail } from '@evolve/data/emails'

/** Base API Strapi (avec `/api`), sans slash final. Vide si non configurée. */
function strapiApiBase(): string {
  return (process.env.NEXT_PUBLIC_STRAPI_API_URL ?? '').trim().replace(/\/+$/, '')
}

/** Origine du serveur Strapi (sans `/api`) — base d'absolutisation des médias. */
export function strapiMediaBase(): string {
  const api = strapiApiBase()
  return api.replace(/\/api$/, '')
}

/** Token optionnel (lecture). Server-only ; jamais exposé au client. */
function authHeaders(): Record<string, string> {
  const token = (process.env.NEXT_PUBLIC_STRAPI_API_TOKEN ?? '').trim()
  return token !== '' ? { Authorization: `Bearer ${token}` } : {}
}

/** Deep-populate : médias DANS chaque bloc + featuredImage + auteur (cf. block-contract.md). */
const POPULATE = 'populate[corps][populate]=*&populate[featuredImage]=true&populate[author]=true'

async function fetchArticles(query: string): Promise<Record<string, unknown>[]> {
  const base = strapiApiBase()
  if (base === '') throw new Error('NEXT_PUBLIC_STRAPI_API_URL non configurée.')
  const res = await fetch(`${base}/articles?${query}`, {
    headers: { accept: 'application/json', ...authHeaders() },
    // Données éditoriales : pas de cache agressif côté app membre (preview/envoi).
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Strapi /articles → ${res.status}`)
  const json = (await res.json()) as { data?: unknown }
  return Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : []
}

/** Résumé léger d'une édition (liste UI admin). */
export interface NewsletterSummary {
  slug: string
  title: string
  numeroEdition: number | null
  datePublication: string | null
  excerpt: string | null
}

/** Liste des newsletters PUBLIÉES (type=newsletter), triées par n° d'édition décroissant. */
export async function listNewsletters(): Promise<NewsletterSummary[]> {
  const query = [
    'filters[type][$eq]=newsletter',
    'locale=fr',
    'sort=numeroEdition:desc',
    'fields[0]=slug',
    'fields[1]=title',
    'fields[2]=numeroEdition',
    'fields[3]=datePublication',
    'fields[4]=excerpt',
    'pagination[pageSize]=100',
  ].join('&')
  const rows = await fetchArticles(query)
  return rows.map((r) => ({
    slug: typeof r.slug === 'string' ? r.slug : '',
    title: typeof r.title === 'string' ? r.title : '',
    numeroEdition: typeof r.numeroEdition === 'number' ? r.numeroEdition : null,
    datePublication: typeof r.datePublication === 'string' ? r.datePublication : null,
    excerpt: typeof r.excerpt === 'string' ? r.excerpt : null,
  }))
}

/** Newsletter publiée par slug, mappée pour le rendu email (médias absolutisés). `null` si absente. */
export async function getNewsletterBySlug(slug: string): Promise<EditorialArticle | null> {
  const query = [
    `filters[slug][$eq]=${encodeURIComponent(slug)}`,
    'filters[type][$eq]=newsletter',
    'locale=fr',
    POPULATE,
  ].join('&')
  const rows = await fetchArticles(query)
  const raw = rows[0]
  if (!raw) return null
  return mapArticleToEmail(raw, { mediaBase: strapiMediaBase() })
}
