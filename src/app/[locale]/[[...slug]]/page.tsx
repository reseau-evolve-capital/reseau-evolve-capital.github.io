import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStrapiMediaUrl } from '@/lib/api'
import { getPage } from '@/lib/content'
import type { Locale } from '@/lib/content-types'
import { getStaticPageParams, loadSiteContent, pageExistsIn } from '@/lib/site-content'
import { SectionRenderer, anchorIdOf, renderableSections } from '@/components/sections/SectionRenderer'
import { SectionNavigation } from '@/components/ui/SectionNavigation'

type Props = { params: Promise<{ locale: Locale; slug?: string[] }> }

export const dynamicParams = false

export async function generateStaticParams() {
  const { pages } = await loadSiteContent()
  return getStaticPageParams(pages)
}

const toSlug = (slug?: string[]) => (slug && slug.length ? slug.join('/') : 'index')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const key = toSlug(slug)
  const [{ pages, global }, page] = await Promise.all([loadSiteContent(), getPage(key, locale)])
  if (!page) return {}
  // Page editeur sans SEO : son titre, pas le titre par defaut du site.
  const seo = page.seo ?? (key === 'index' ? global[locale].defaultSeo : null)
  const path = key === 'index' ? '' : `${key}/`
  // L'image OG par defaut est posee par le layout ; on ne remplace openGraph que si la page a la sienne
  // (Next remplace l'objet openGraph entier). Original Strapi, pas un derive redimensionne.
  const ogImage = page.seo?.ogImage
  const og = getStrapiMediaUrl(ogImage)
  return {
    title: key === 'index' ? { absolute: seo?.metaTitle ?? global[locale].siteName } : seo?.metaTitle ?? page.title,
    description: seo?.metaDescription ?? global[locale].siteDescription ?? undefined,
    alternates: { languages: Object.fromEntries(pageExistsIn(pages, key).map((l) => [l, `/${l}/${path}`])) },
    // Cle absente (pas `undefined`) sinon Next efface l'openGraph du layout.
    ...(og ? { openGraph: { images: [{ url: og, type: 'image/jpeg', width: ogImage?.width ?? undefined, height: ogImage?.height ?? undefined }] } } : {}),
  }
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params
  const key = toSlug(slug)
  const [{ global, clubs }, page] = await Promise.all([loadSiteContent(), getPage(key, locale)])
  if (!page) notFound()
  const isHome = key === 'index'
  const items = renderableSections({ sections: page.sections, locale, global: global[locale], clubs: clubs[locale] })
  const sections = <SectionRenderer items={items} locale={locale} />
  return isHome ? (
    <div className="flex flex-col min-h-screen">
      <SectionNavigation locale={locale} anchorIds={items.flatMap(({ section }) => anchorIdOf(section) ?? [])} />
      {sections}
    </div>
  ) : (
    <div className="min-h-screen">{sections}</div>
  )
}
