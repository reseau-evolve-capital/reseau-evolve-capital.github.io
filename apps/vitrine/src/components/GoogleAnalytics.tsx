import Script from 'next/script'

/**
 * Google Analytics 4 (flux VITRINE) + Consent Mode v2 — export statique.
 * Script inline BRUT (pas `beforeInteractive` — déconseillé hors _document) : consent DEFAULT
 * denied + config, exécuté au parse AVANT le gtag.js différé. Le bandeau (ConsentBanner) pousse
 * ensuite `consent update {analytics_storage}` au choix.
 * Measurement ID via NEXT_PUBLIC_GA_ID_VITRINE (public). Absent → no-op (aucun tag).
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID_VITRINE
  if (!id) return null

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:['FR','BE','LU','EU']});gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`,
        }}
      />
      <Script
        id="ga-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
    </>
  )
}
