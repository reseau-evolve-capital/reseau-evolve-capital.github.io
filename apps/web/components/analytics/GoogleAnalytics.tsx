import Script from 'next/script'

/**
 * Google Analytics 4 (flux APP) + Consent Mode v2. Monté dans le <head> du root layout.
 *
 * Ordre garanti :
 *   1. Script inline BRUT (pas `beforeInteractive` — App Router : cf. no-before-interactive-script
 *      -outside-document) : dataLayer + stub gtag + consent DEFAULT denied + config. S'exécute
 *      SYNCHRONIQUEMENT au parse du <head>, donc AVANT le chargement différé de gtag.js. Avant
 *      tout choix : aucun cookie, seulement des pings modélisés. `ad_*` denied (pas de pub).
 *   2. gtag.js (afterInteractive) — traite la file dataLayer déjà constituée.
 *
 * Le bandeau (ConsentMount) pousse ensuite `consent update {analytics_storage}` selon le choix.
 * Measurement ID via NEXT_PUBLIC_GA_ID_APP. Absent (dev/CI sans ID) → on ne rend RIEN (no-op).
 * Mesure d'audience UNIQUEMENT : jamais de PII ni de montant exact (cf. docs/analytics/).
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID_APP
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
