import { assertSiteContent, getAllClubs, getAllPages, getGlobal } from './content'
import type { ClubDoc, GlobalDoc, Locale, PageDoc } from './content-types'
import { locales } from './site'

type SiteContent = { pages: Record<Locale, PageDoc[]>; global: Record<Locale, GlobalDoc>; clubs: Record<Locale, ClubDoc[]> }

let cache: Promise<SiteContent> | null = null

export function loadSiteContent(): Promise<SiteContent> {
  cache ??= (async () => {
    const [pagesFr, pagesEn, globalFr, globalEn, clubsFr, clubsEn] = await Promise.all([
      getAllPages('fr'), getAllPages('en'), getGlobal('fr'), getGlobal('en'), getAllClubs('fr'), getAllClubs('en'),
    ])
    const content = { pages: { fr: pagesFr, en: pagesEn }, global: { fr: globalFr, en: globalEn }, clubs: { fr: clubsFr, en: clubsEn } }
    assertSiteContent(content)
    return content
  })()
  return cache
}

export function getStaticPageParams(pages: Record<Locale, { slug: string }[]>) {
  return locales.flatMap((locale) => pages[locale].map((p) => ({ locale, slug: p.slug === 'index' ? [] : p.slug.split('/') })))
}

export function pageExistsIn(pages: Record<Locale, { slug: string }[]>, slug: string): Locale[] {
  return locales.filter((l) => pages[l].some((p) => p.slug === slug))
}
