'use client'

// Bannière de consentement RGPD — version VITRINE (autonome, light-only, export statique).
// La vitrine n'utilise pas @evolve/ui (Tailwind v3, pas de design-system) → composant
// self-contained : styles via un <style> scopé (focus/hover a11y), couleurs de marque en dur
// (acceptable hors design-system). Mêmes mécaniques que l'app : Consent Mode v2, variantes
// compact/bar par variable d'env, panneau granulaire. Copy {fr,en} via la locale.

import { useCallback, useState, useSyncExternalStore } from 'react'

import {
  applyAnalyticsConsent,
  getServerSnapshot,
  getSnapshot,
  setConsent,
  subscribe,
} from '@/lib/consent'

type Locale = 'fr' | 'en'

const COPY = {
  fr: {
    title: "Nous utilisons des cookies d'analyse",
    description:
      "Google Analytics nous aide à comprendre comment les visiteurs utilisent le site, pour l'améliorer. Rien d'autre — aucun cookie publicitaire.",
    privacyLabel: 'Politique de confidentialité',
    acceptAll: 'Tout accepter',
    rejectAll: 'Refuser',
    rejectAllLong: 'Tout refuser',
    customize: 'Personnaliser',
    customizeChoices: 'Personnaliser mes choix',
    save: 'Enregistrer mes préférences',
    close: 'Fermer',
    back: 'Retour',
    necessaryTitle: 'Cookies nécessaires',
    necessaryDesc: 'Sécurité et préférences. Indispensables au fonctionnement du site.',
    necessaryState: 'Toujours actifs',
    analyticsTitle: "Cookies d'analyse",
    analyticsDesc:
      "Google Analytics — mesure d'audience anonymisée pour comprendre l'usage et améliorer le site.",
    regionLabel: 'Préférences de cookies',
  },
  en: {
    title: 'We use analytics cookies',
    description:
      'Google Analytics helps us understand how visitors use the site, to improve it. Nothing else — no advertising cookies.',
    privacyLabel: 'Privacy policy',
    acceptAll: 'Accept all',
    rejectAll: 'Reject',
    rejectAllLong: 'Reject all',
    customize: 'Customise',
    customizeChoices: 'Customise my choices',
    save: 'Save my preferences',
    close: 'Close',
    back: 'Back',
    necessaryTitle: 'Necessary cookies',
    necessaryDesc: 'Security and preferences. Essential to how the site works.',
    necessaryState: 'Always on',
    analyticsTitle: 'Analytics cookies',
    analyticsDesc:
      'Google Analytics — anonymised audience measurement to understand usage and improve the site.',
    regionLabel: 'Cookie preferences',
  },
} as const

const STYLES = `
.ecb-root{font-family:inherit;color:#231F20;position:fixed;z-index:60}
.ecb-card{background:#fff;border:1px solid #E4E4DF;box-shadow:0 16px 48px rgba(35,31,32,.16)}
.ecb-title{margin:0;font-weight:700;letter-spacing:-.01em;color:#231F20}
.ecb-desc{margin:0;line-height:1.55;color:rgba(35,31,32,.62)}
.ecb-priv{color:#231F20;font-weight:600;text-decoration:underline;text-decoration-color:rgba(253,199,12,.55);text-underline-offset:3px}
.ecb-priv:hover{text-decoration-color:#FDC70C}
.ecb-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;font:600 14px/1 inherit;padding:13px 22px;border-radius:10px;cursor:pointer;transition:all .15s cubic-bezier(.2,0,0,1)}
.ecb-btn:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(253,199,12,.30)}
.ecb-accept{background:#FDC70C;color:#231F20;border:1px solid transparent}
.ecb-accept:hover{opacity:.9}
.ecb-refuse{background:transparent;color:#231F20;border:1px solid #E4E4DF}
.ecb-refuse:hover{background:#FAFAF9}
.ecb-link{appearance:none;background:none;border:0;cursor:pointer;font:600 13.5px/1 inherit;padding:13px 4px;color:rgba(35,31,32,.42);text-decoration:underline;text-decoration-color:rgba(35,31,32,.25);text-underline-offset:3px;transition:color .15s}
.ecb-link:hover{color:#231F20}
.ecb-link:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(253,199,12,.30);border-radius:2px}
.ecb-cat{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border:1px solid #E4E4DF;border-radius:10px;background:#FAFAF9;padding:12px}
.ecb-cat-t{margin:0;font-weight:600;font-size:13.5px;color:#231F20}
.ecb-cat-d{margin:.125rem 0 0;font-size:12.5px;line-height:1.5;color:rgba(35,31,32,.6)}
.ecb-sw{appearance:none;position:relative;width:44px;height:24px;border-radius:9999px;border:2px solid #D4D4CE;background:#fff;cursor:pointer;flex-shrink:0;transition:background .15s,border-color .15s}
.ecb-sw[aria-checked="true"]{background:#FDC70C;border-color:#FDC70C}
.ecb-sw:disabled{cursor:not-allowed}
.ecb-sw:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(253,199,12,.30)}
.ecb-sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:9999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s}
.ecb-sw[aria-checked="true"]::after{transform:translateX(20px)}
/* Compact : carte ancrée bas (gauche/droite) en desktop, sheet pleine largeur en mobile */
.ecb-compact{left:0;right:0;bottom:0;border-radius:20px 20px 0 0;border-top:1px solid #E4E4DF;padding:26px 28px 18px}
@media(min-width:640px){
  .ecb-compact{left:auto;right:auto;bottom:24px;width:440px;border-radius:16px;border:1px solid #E4E4DF;padding:26px 28px 18px}
  .ecb-compact.ecb-gauche{left:24px}
  .ecb-compact.ecb-droite{right:24px}
}
/* Bar : barre basse pleine largeur */
.ecb-bar{left:0;right:0;bottom:0;background:#fff;border-top:1px solid #E4E4DF;box-shadow:0 -8px 32px rgba(35,31,32,.1)}
.ecb-bar-inner{max-width:1080px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:20px}
@media(min-width:640px){.ecb-bar-inner{flex-direction:row;align-items:center;gap:32px;padding:20px 40px}}
.ecb-stack{display:flex;flex-direction:column;gap:10px}
.ecb-row{display:flex;align-items:center;gap:12px}
@media(max-width:639px){.ecb-row{flex-direction:column;align-items:stretch}}
.ecb-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
`

function useConsent() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const acceptAll = useCallback(() => {
    setConsent(true)
    applyAnalyticsConsent(true)
  }, [])
  const rejectAll = useCallback(() => {
    setConsent(false)
    applyAnalyticsConsent(false)
  }, [])
  const save = useCallback((analytics: boolean) => {
    setConsent(analytics)
    applyAnalyticsConsent(analytics)
  }, [])
  return { resolved: state !== null, acceptAll, rejectAll, save }
}

function CookieLockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3.5" y="8.5" width="13" height="9" rx="2.5" stroke="#FDC70C" strokeWidth="1.6" />
      <path d="M6.5 8.5 V6.2 a3.5 3.5 0 0 1 7 0 V8.5" stroke="#FDC70C" strokeWidth="1.6" />
      <circle cx="10" cy="13" r="1.4" fill="#FDC70C" />
    </svg>
  )
}

function variant(): 'compact' | 'bar' {
  return process.env.NEXT_PUBLIC_CONSENT_BANNER_VARIANT === 'bar' ? 'bar' : 'compact'
}
function side(): 'gauche' | 'droite' {
  return process.env.NEXT_PUBLIC_CONSENT_BANNER_SIDE === 'droite' ? 'droite' : 'gauche'
}

export function ConsentBanner({ locale }: { locale: Locale }) {
  const c = COPY[locale] ?? COPY.fr
  const privacyHref = `/${locale}/legal/privacy-policy/`
  const { resolved, acceptAll, rejectAll, save } = useConsent()
  const [expanded, setExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(false)

  if (resolved) return null

  const intro = (
    <div className="ecb-row" style={{ alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <CookieLockIcon size={variant() === 'bar' ? 20 : 18} />
      <h2 className="ecb-title" style={{ fontSize: variant() === 'bar' ? 15.5 : 16 }}>
        {c.title}
      </h2>
    </div>
  )
  const desc = (
    <p className="ecb-desc" style={{ fontSize: 13.5 }}>
      {c.description}{' '}
      <a className="ecb-priv" href={privacyHref}>
        {c.privacyLabel}
      </a>
    </p>
  )
  const categories = (
    <div className="ecb-stack" style={{ gap: 12 }}>
      <div className="ecb-cat">
        <div style={{ minWidth: 0 }}>
          <p className="ecb-cat-t">{c.necessaryTitle}</p>
          <p className="ecb-cat-d">{c.necessaryDesc}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked="true"
          aria-readonly="true"
          aria-label={`${c.necessaryTitle} — ${c.necessaryState}`}
          disabled
          className="ecb-sw"
        />
      </div>
      <div className="ecb-cat">
        <div style={{ minWidth: 0 }}>
          <p className="ecb-cat-t">{c.analyticsTitle}</p>
          <p className="ecb-cat-d">{c.analyticsDesc}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={analytics}
          aria-label={c.analyticsTitle}
          onClick={() => setAnalytics((v) => !v)}
          className="ecb-sw"
        />
      </div>
    </div>
  )

  return (
    <>
      <style>{STYLES}</style>
      {variant() === 'bar' ? (
        <div className="ecb-root ecb-bar" role="dialog" aria-label={c.regionLabel}>
          <div className="ecb-bar-inner">
            <div style={{ flex: 1, minWidth: 0 }}>
              {intro}
              {desc}
              {expanded ? <div style={{ marginTop: 16 }}>{categories}</div> : null}
            </div>
            <div className="ecb-row" style={{ flexShrink: 0 }}>
              {expanded ? (
                <>
                  <button className="ecb-link" onClick={() => setExpanded(false)}>
                    {c.close}
                  </button>
                  <button className="ecb-btn ecb-refuse" onClick={rejectAll}>
                    {c.rejectAllLong}
                  </button>
                  <button className="ecb-btn ecb-accept" onClick={() => save(analytics)}>
                    {c.save}
                  </button>
                </>
              ) : (
                <>
                  <button className="ecb-link" onClick={() => setExpanded(true)}>
                    {c.customize}
                  </button>
                  <button className="ecb-btn ecb-refuse" onClick={rejectAll}>
                    {c.rejectAll}
                  </button>
                  <button className="ecb-btn ecb-accept" onClick={acceptAll}>
                    {c.acceptAll}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`ecb-root ecb-card ecb-compact ecb-${side()}`}
          role="dialog"
          aria-label={c.regionLabel}
        >
          {intro}
          {desc}
          {!expanded ? (
            <div className="ecb-stack" style={{ marginTop: 20 }}>
              <button className="ecb-btn ecb-accept" style={{ width: '100%' }} onClick={acceptAll}>
                {c.acceptAll}
              </button>
              <button className="ecb-btn ecb-refuse" style={{ width: '100%' }} onClick={rejectAll}>
                {c.rejectAll}
              </button>
              <button
                className="ecb-link"
                style={{ display: 'block', textAlign: 'center' }}
                onClick={() => setExpanded(true)}
              >
                {c.customizeChoices}
              </button>
            </div>
          ) : (
            <div className="ecb-stack" style={{ marginTop: 20, gap: 16 }}>
              {categories}
              <button
                className="ecb-btn ecb-accept"
                style={{ width: '100%' }}
                onClick={() => save(analytics)}
              >
                {c.save}
              </button>
              <button
                className="ecb-link"
                style={{ display: 'block', textAlign: 'center' }}
                onClick={() => setExpanded(false)}
              >
                {c.back}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
