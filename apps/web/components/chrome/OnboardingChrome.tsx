'use client'
// Chrome de l'onboarding — habillage commun aux 4 écrans (step-1/2/3 + tour),
// fidèle à la réf « Login & Onboarding - Desktop ».
//
// Pourquoi un chrome dédié plutôt que d'enrichir chaque page :
//  - la TOP BAR (logo · « ONBOARDING · ÉTAPE X / 3 » · « Besoin d'aide ? » +
//    bascule de thème) et la PROGRESSION SEGMENTÉE sont communes → un seul shell
//    évite la duplication et garantit la cohérence inter-étapes ;
//  - l'étape courante est dérivée du `usePathname()` (composant client), donc
//    pas besoin de prop par page ;
//  - corrige le défaut rapporté : avant, l'onboarding était un composant nu
//    centré sur fond vide, sans chrome Evolve ni toggle clair/sombre.
//
// Centrage parent : `(auth)/layout.tsx` centre ses enfants (`flex … p-4`). Ce
// chrome s'en échappe via `fixed inset-0` (même technique que `LoginScreen`,
// éprouvée en prod) → il remplit l'écran SANS modifier `(auth)/layout.tsx`,
// donc login et /login/verify restent intacts.
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Logo, ThemeToggle, SegmentedProgress } from '@evolve/ui'
import { LocaleSwitcherClient } from '@/components/i18n/LocaleSwitcherClient'
import { BRAND_LOGO_SRC } from '@/lib/brand'

/** Logo de marque servi par l'app (source unique : @/lib/brand → tuile crème). */
const LOGO_SRC = BRAND_LOGO_SRC
/** Lien d'aide → site vitrine public (aligné sur LoginScreen). */
const HELP_URL = 'https://reseauevolvecapital.com'

const TOTAL_STEPS = 3

// Sombre par défaut côté visuel (réf onboarding) MAIS non destructif : on n'impose
// le sombre que si l'utilisateur n'a JAMAIS exprimé de préférence (aucune clé
// `ec-theme`). S'il a déjà choisi un thème (ex. login en clair), on le respecte.
//
// Appliqué via un <script> inline SYNCHRONE (et non un useEffect) pour garantir
// que `data-theme` est posé sur <html> AVANT que le ThemeToggle ne lise le DOM
// à son montage → pas de désync (sinon le bouton serait inversé d'un cran).
const ONBOARDING_DARK_DEFAULT = `try{if(!localStorage.getItem('ec-theme')){document.documentElement.setAttribute('data-theme','dark');}}catch(e){document.documentElement.setAttribute('data-theme','dark');}`

/** Étapes du parcours → numéro d'indicateur (1/2/3). Le tour est la fin de l'étape 3. */
function deriveStep(pathname: string | null): number {
  if (!pathname) return 1
  if (pathname.includes('/onboarding/step-2')) return 2
  if (pathname.includes('/onboarding/step-3') || pathname.includes('/onboarding/tour')) return 3
  return 1
}

/** Clé i18n du libellé de section affiché à droite de la progression. */
function deriveSectionKey(pathname: string | null): 'profile' | 'consents' | 'tour' {
  if (!pathname) return 'profile'
  if (pathname.includes('/onboarding/tour')) return 'tour'
  if (pathname.includes('/onboarding/step-3')) return 'consents'
  if (pathname.includes('/onboarding/step-2')) return 'profile'
  return 'profile'
}

export function OnboardingChrome({ children }: { children: ReactNode }) {
  const t = useTranslations('onboarding')
  const pathname = usePathname()

  const step = deriveStep(pathname)
  const sectionKey = deriveSectionKey(pathname)

  const stepLabel = t('progress', { step, total: TOTAL_STEPS })
  // « ÉTAPE 0X / 03 » — numéros zéro-paddés, fidèles à la réf.
  const stepCounter = t('stepCounter', {
    step: String(step).padStart(2, '0'),
    total: String(TOTAL_STEPS).padStart(2, '0'),
  })

  return (
    // fixed inset-0 : neutralise le centrage du layout (auth) parent sans le modifier.
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-bg-page text-text">
      {/* Défaut sombre non destructif, appliqué avant le montage du ThemeToggle. */}
      <script dangerouslySetInnerHTML={{ __html: ONBOARDING_DARK_DEFAULT }} />
      {/* TOP BAR commune — landmark de navigation. */}
      <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur supports-backdrop-filter:bg-bg/80">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo variant="full" src={LOGO_SRC} className="text-text" />

          {/* Libellé central « ONBOARDING · ÉTAPE X / 3 » — masqué sur très petit
              écran (l'indicateur segmenté juste dessous porte déjà l'info). */}
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-text-ter sm:block">
            {t('chromeTitle', { step, total: TOTAL_STEPS })}
          </p>

          <nav aria-label={t('chromeNavAria')} className="flex items-center gap-1.5 sm:gap-2">
            <LocaleSwitcherClient />
            <ThemeToggle
              toggleLabel={t('themeToggle.toggle')}
              switchToLightLabel={t('themeToggle.switchToLight')}
              switchToDarkLabel={t('themeToggle.switchToDark')}
            />
            <a
              href={HELP_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded px-2 py-1 text-[13px] text-text-sec transition-colors hover:text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)] sm:inline-flex"
            >
              {t('help.link')}
            </a>
          </nav>
        </div>

        {/* PROGRESSION segmentée + libellés (« ÉTAPE 0X / 03 » · section). */}
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-3 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-ter">
              {stepCounter}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-ter">
              {t(`sections.${sectionKey}`)}
            </span>
          </div>
          <SegmentedProgress step={step} total={TOTAL_STEPS} label={stepLabel} />
        </div>
      </header>

      {/* CONTENU de l'étape — la page fournit son propre layout (1 ou 3 colonnes). */}
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  )
}
