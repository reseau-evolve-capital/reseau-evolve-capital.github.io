import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { Analytics } from '@/components/Analytics'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { ConsentMount } from '@/components/consent/ConsentMount'
import { PwaServiceWorkerRegistrar } from '@/components/pwa/PwaServiceWorkerRegistrar'
import { PWA_STARTUP_IMAGES } from '@/lib/pwa/startup-images'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.reseauevolvecapital.com'

const OG_LOCALE: Record<string, string> = { fr: 'fr_FR', en: 'en_GB' }

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return {
    metadataBase: new URL(APP_URL),
    title: t('title'),
    description: t('description'),
    applicationName: 'Evolve Capital',
    // App membre privée — pas d'indexation, mais les scrapers OG (LinkedIn, X…) lisent quand même les balises.
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: 'Evolve Capital',
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: APP_URL,
      locale: OG_LOCALE[locale] ?? 'fr_FR',
      images: [
        {
          url: '/og-app-evolve-capital.png',
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('twitterDescription'),
      images: ['/og-app-evolve-capital.png'],
    },
    // PWA-001 : le manifest est généré par app/manifest.ts (route /manifest.webmanifest).
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      // 'default' : texte de status bar lisible (noir) sur le splash crème —
      // 'black-translucent' rendait le texte blanc, invisible sur fond clair.
      statusBarStyle: 'default',
      title: 'Evolve',
      // Splash screens iOS (sinon écran noir ~3 s au cold start de la PWA).
      // Générés par scripts/generate-pwa-splash.mjs (fond crème #F4F4F2).
      startupImage: [...PWA_STARTUP_IMAGES],
    },
    icons: {
      apple: '/icons/apple-touch-icon-180.png',
    },
  }
}

// theme-color suit le thème : crème (--n-100) en light, --bg-page dark sinon.
// Cohérent avec le manifest (fond crème) + la barre de statut en standalone.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F4F2' },
    { media: '(prefers-color-scheme: dark)', color: '#07070A' },
  ],
}

// Applique le thème (clair/sombre) AVANT la peinture pour éviter tout flash.
// Source de vérité : localStorage 'ec-theme' ; clair = pas d'attribut, sombre = data-theme="dark".
// (cf. ThemeToggle dans @evolve/ui et tokens.css :root / [data-theme="dark"])
const THEME_NO_FLASH = `try{var t=localStorage.getItem('ec-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.removeAttribute('data-theme');}}catch(e){}`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Locale active (cookie NEXT_LOCALE, défaut fr) — pilote <html lang> et le provider i18n.
  const locale = await getLocale()
  return (
    <html lang={locale} className="ec-scope" suppressHydrationWarning>
      <head>
        {/* Polices de marque : Plus Jakarta Sans (corps) + IBM Plex Mono (labels/chiffres techniques).
            Tommy Soft (display) reste en fallback — .otf exclus du repo par licence. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* App Router : ce <link> dans le <head> du root layout charge globalement
            (pas « par page ») — la prémisse de la règle no-page-custom-font ne s'applique
            pas. <link> conservé (résilient hors-ligne) plutôt que next/font. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH }} />
        {/* GA4 (flux app) + Consent Mode v2 (default denied avant gtag.js). No-op sans ID. */}
        <GoogleAnalytics />
      </head>
      <body>
        {/* NextIntlClientProvider hérite locale + messages de la config de requête
            (rendu dans un Server Component) → dispo pour les composants client. */}
        <NextIntlClientProvider>
          {children}
          {/* Bandeau de consentement RGPD (Consent Mode v2). DANS le provider i18n
              (useTranslations). S'affiche sur toutes les pages tant que le choix n'est
              pas tranché ; priorité sur la bannière PWA (cf. useConsentResolved). */}
          <ConsentMount />
        </NextIntlClientProvider>
        {/* PWA-001 : enregistre le service worker (prod/https) + capture beforeinstallprompt. */}
        <PwaServiceWorkerRegistrar />
        {/* Cloudflare Web Analytics (OPS-002) — beacon client, pageviews + SPA.
            Rend null si le token est absent (dev/CI). Cf. docs/analytics.md. */}
        <Analytics />
      </body>
    </html>
  )
}
