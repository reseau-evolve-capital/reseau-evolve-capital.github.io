import Script from 'next/script'

/**
 * Google Analytics 4 (flux VITRINE) + Consent Mode v2 - export statique.
 *
 * IMPORTANT (export statique + React 19) : le bootstrap DOIT passer par next/script.
 * Un `<script dangerouslySetInnerHTML>` brut n'est PAS emis comme tag executable dans le HTML
 * exporte - il n'apparait que serialise dans le payload RSC (self.__next_f) -> ne s'execute
 * jamais -> `window.gtag` reste indefini, gtag.js charge mais rien n'est configure -> zero event.
 *
 * Les deux scripts sont `afterInteractive` : le bootstrap (consent DEFAULT denied + config) est
 * declare en premier, donc traite avant gtag.js. Le bandeau (ConsentBanner) pousse ensuite
 * `consent update {analytics_storage}` selon le choix. ID via NEXT_PUBLIC_GA_ID_VITRINE (public).
 * Absent -> no-op (aucun tag).
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID_VITRINE
  if (!id) return null

  return (
    <>
      <Script id="ga-bootstrap" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:['FR','BE','LU','EU']});gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}
      </Script>
      <Script
        id="ga-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
    </>
  )
}
