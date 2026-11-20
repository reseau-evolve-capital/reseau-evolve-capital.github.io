import type { ClubDoc, GlobalDoc, Locale, PageDoc } from './content-types'
import { CLUB_POPULATE, GLOBAL_POPULATE, PAGE_POPULATE } from './populate'
import { strapiGet } from './strapi-fetch'
import { locales } from './site'

export class ContentError extends Error {
  name = 'ContentError'
}

type List<T> = { data: T[]; meta?: { pagination?: { total?: number } } }
type One<T> = { data: T | null }

const REPEATABLE_KEYS = new Set([
  'stats', 'benefits', 'testimonials', 'events', 'tags', 'resources', 'members', 'gallery', 'partners',
  'sponsorshipTiers', 'timeline', 'values', 'units', 'educationFeatures', 'investmentPrinciples', 'formFields',
  'options', 'sections', 'navigation', 'footerLinkGroups', 'links', 'performance', 'topHoldings',
  'executiveBoard', 'milestones', 'steps', 'requirements', 'faq',
])
// Sur un club, `members` est un entier (effectif), pas un répétable.
const CLUB_REPEATABLE_KEYS = new Set([...REPEATABLE_KEYS].filter((k) => k !== 'members'))

// Strapi renvoie null pour un répétable jamais rempli : on garantit des tableaux au rendu.
function normalize<T>(value: T, keys: Set<string> = REPEATABLE_KEYS): T {
  if (Array.isArray(value)) return value.map((v) => normalize(v, keys)) as T
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = v === null && keys.has(k) ? [] : normalize(v, keys)
  return out as T
}

// Liste complete exigee au build : au-dela d'une page Strapi, des pages disparaitraient sans erreur.
function complete<T>(res: List<T>, what: string): T[] {
  const total = res.meta?.pagination?.total ?? res.data.length
  if (total > res.data.length) throw new ContentError(`${what} tronques : ${res.data.length} recus sur ${total}`)
  return res.data
}

export async function getGlobal(locale: Locale): Promise<GlobalDoc> {
  const res = await strapiGet<One<GlobalDoc>>('/global', { locale, populate: GLOBAL_POPULATE })
  if (!res.data) throw new ContentError(`Réglages du site absents en ${locale}`)
  return normalize(res.data)
}

export async function getAllPages(locale: Locale): Promise<PageDoc[]> {
  const res = await strapiGet<List<PageDoc>>('/pages', { locale, fields: ['slug', 'title', 'updatedAt'], pagination: { pageSize: 100 } })
  return complete(res, `Pages ${locale}`)
}

export async function getPage(slug: string, locale: Locale): Promise<PageDoc | null> {
  const res = await strapiGet<List<PageDoc>>('/pages', { locale, filters: { slug: { $eq: slug } }, populate: PAGE_POPULATE })
  return res.data[0] ? normalize(res.data[0]) : null
}

export async function getAllClubs(locale: Locale): Promise<ClubDoc[]> {
  const res = await strapiGet<List<ClubDoc>>('/clubs', { locale, filters: { featured: { $eq: true } }, sort: ['order:asc'], populate: CLUB_POPULATE, pagination: { pageSize: 100 } })
  return normalize(complete(res, `Clubs ${locale}`), CLUB_REPEATABLE_KEYS)
}

export async function getClub(slug: string, locale: Locale): Promise<ClubDoc | null> {
  const res = await strapiGet<List<ClubDoc>>('/clubs', { locale, filters: { slug: { $eq: slug }, featured: { $eq: true } }, populate: CLUB_POPULATE })
  return res.data[0] ? normalize(res.data[0], CLUB_REPEATABLE_KEYS) : null
}

export function assertSiteContent({ pages, global }: { pages: Record<Locale, { slug: string }[]>; global: Record<Locale, GlobalDoc | null> }) {
  for (const locale of locales) {
    if (!global[locale]) throw new ContentError(`Réglages du site non publiés en ${locale}`)
    const slugs = pages[locale].map((p) => p.slug)
    if (!slugs.includes('index')) throw new ContentError(`Page d’accueil (slug index) non publiée en ${locale}`)
    const dup = slugs.find((s, i) => slugs.indexOf(s) !== i)
    if (dup) throw new ContentError(`Slug en double en ${locale} : ${dup}`)
  }
}
