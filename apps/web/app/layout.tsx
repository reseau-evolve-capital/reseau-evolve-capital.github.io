import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import { Analytics } from '@/components/Analytics'
import './globals.css'

export const metadata: Metadata = {
  title: 'Evolve Capital',
  description: "Plateforme d'investissement participatif",
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
      </head>
      <body>
        {/* NextIntlClientProvider hérite locale + messages de la config de requête
            (rendu dans un Server Component) → dispo pour les composants client. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {/* Cloudflare Web Analytics (OPS-002) — beacon client, pageviews + SPA.
            Rend null si le token est absent (dev/CI). Cf. docs/analytics.md. */}
        <Analytics />
      </body>
    </html>
  )
}
