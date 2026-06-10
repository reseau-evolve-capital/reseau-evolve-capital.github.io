import Script from 'next/script'

/**
 * Google Analytics 4 (flux APP) + Consent Mode v2.
 *
 * Ordre garanti :
 *   1. `ga-consent-default` (beforeInteractive) — dataLayer + stub gtag + consent DEFAULT denied,
 *      AVANT le chargement de gtag.js. Avant tout choix : aucun cookie, seulement des pings
 *      modélisés (cookieless). `ad_*` restent denied (pas de pub, Google Signals OFF).
 *   2. gtag.js (afterInteractive).
 *   3. `ga-config` — config du flux app. IP anonymisée. Le bandeau (ConsentMount) pousse ensuite
 *      `consent update {analytics_storage:'granted'|'denied'}` selon le choix.
 *
 * Measurement ID via NEXT_PUBLIC_GA_ID_APP. Absent (dev/CI sans ID) → on ne rend RIEN (no-op).
 * Mesure d'audience UNIQUEMENT : jamais de PII ni de montant exact (cf. docs/analytics/).
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID_APP
  if (!id) return null

  return (
    <>
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500,region:['FR','BE','LU','EU']});`}
      </Script>
      <Script
        id="ga-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-config" strategy="afterInteractive">
        {`gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`}
      </Script>
    </>
  )
}
