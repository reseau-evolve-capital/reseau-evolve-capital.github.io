import { type Metadata } from 'next'
import '@/app/globals.css'

import { Navigation } from '@/components/navigation'
import type { Locale } from '@/lib/content-types'
import { getStrapiMediaUrl } from '@/lib/api'
import { resolveLinks } from '@/lib/links'
import { copy } from '@/lib/copy'
import { SITE_URL, SEO_KEYWORDS, locales } from '@/lib/site'
import { loadSiteContent } from '@/lib/site-content'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { ConsentBanner } from '@/components/ConsentBanner'
import { BuildInfo } from '@/components/BuildInfo'
import { Footer, type FooterGlobal } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/ui/ScrollToTop'
import { NewsletterProvider } from '@/components/newsletter'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
type Props = {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const { global } = await loadSiteContent()
  const { siteName, siteDescription, defaultSeo } = global[locale]
  const description = siteDescription ?? undefined
  return {
    metadataBase: new URL(SITE_URL),
    keywords: SEO_KEYWORDS,
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    // Traçabilité déploiement : date de build (= date de deploy) + commit.
    // Check sans devtools : `curl -s https://reseauevolvecapital.com/ | grep build-date`
    other: {
      'build-date': process.env.NEXT_PUBLIC_BUILD_TIME ?? 'dev',
      ...(process.env.NEXT_PUBLIC_BUILD_COMMIT
        ? { 'build-commit': process.env.NEXT_PUBLIC_BUILD_COMMIT }
        : {}),
    },
    openGraph: {
      url: `/${locale}/`,
      siteName,
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      title: siteName,
      description,
      type: 'website',
      images: [
        {
          // Original Strapi, pas un dérivé redimensionné ; dimensions du média (le repli fait 1200x630).
          url: getStrapiMediaUrl(defaultSeo?.ogImage) || '/brand/opengraph.jpg',
          type: 'image/jpeg',
          width: defaultSeo?.ogImage ? defaultSeo.ogImage.width ?? undefined : 1200,
          height: defaultSeo?.ogImage ? defaultSeo.ogImage.height ?? undefined : 630,
        },
      ],
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!locales.includes(locale)) {
    notFound()
  }
  const { global, pages } = await loadSiteContent()
  const site = global[locale]
  const slugs = pages[locale].map((p) => p.slug)
  const { linkedin, twitter, facebook, instagram, newsletterTitle, newsletterDescription, copyright, socialTitle } = site
  const footerGlobal: FooterGlobal = { linkedin, twitter, facebook, instagram, newsletterTitle, newsletterDescription, copyright, socialTitle }
  const linkGroups = site.footerLinkGroups.map((g) => ({ ...g, links: resolveLinks(g.links, slugs) })).filter((g) => g.links.length > 0)

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Suspense>
          <NewsletterProvider
            locale={locale}
            newsletter={{ placeholder: site.newsletterPlaceholder || copy[locale].newsletterPlaceholder, button: site.newsletterButton || copy[locale].newsletterButton }}
          >
            <div className="relative flex min-h-screen flex-col">
              <Navigation siteName={site.siteName} navigation={resolveLinks(site.navigation, slugs)} />
              <main className="flex-1">{children}</main>
              <Footer locale={locale} global={footerGlobal} linkGroups={linkGroups} slugs={slugs} />
              <ScrollToTop />
            </div>
            {/* GA4 (flux vitrine) + Consent Mode v2 (default denied). No-op sans ID. */}
            <GoogleAnalytics />
            {/* Bandeau de consentement RGPD — s'affiche tant que le choix n'est pas tranché. */}
            <ConsentBanner locale={locale} />
            <BuildInfo />
          </NewsletterProvider>
        </Suspense>
      </body>
    </html>
  )
}
