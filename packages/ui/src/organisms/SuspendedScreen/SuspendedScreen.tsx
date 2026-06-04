// SuspendedScreen (ADM-007) — écran public « accès suspendu » (route /acces-suspendu).
//
// Vue affichée à un membre dont le trésorier a bloqué l'accès. TOUJOURS SOMBRE :
// le composant force son propre thème sombre (`data-theme="dark"`) quel que soit le
// thème de l'app, puis consomme les tokens sémantiques (bg/card/text…) — donc zéro hex.
//
// Centré, max-width ~480px, cadenas ouvert avec halo jaune subtil, wordmark
// « € EVOLVE CAPITAL », CTA jaune (mailto trésorier) + lien discret « Me déconnecter ».
// Responsive 1440 ↔ 375. Titre h1 (contraste AAA sur fond sombre).
//
// Présentationnel : actions par props (mailto/href/onSignOut). Réf : AuthCard, CLAUDE.md.

import * as React from 'react'

import { cn } from '../../lib/cn'

export interface SuspendedScreenLabels {
  title?: string
  description?: string
  contactCta?: string
  signOut?: string
}

const DEFAULT_LABELS: Required<SuspendedScreenLabels> = {
  title: 'Votre accès a été suspendu.',
  description:
    "Votre trésorier a temporairement suspendu votre accès à l'espace membre. Cela peut être dû à une cotisation en attente ou à un autre motif. Contactez-le pour en savoir plus et rétablir votre accès.",
  contactCta: 'Contacter mon trésorier',
  signOut: 'Me déconnecter',
}

export interface SuspendedScreenProps {
  /** Lien `mailto:` vers le trésorier. Si absent, le CTA est masqué. */
  treasurerMailto?: string
  /** href du lien de déconnexion. Défaut « # ». */
  signOutHref?: string
  /** Callback de déconnexion (ex: Server Action). Appelé en plus de la navigation. */
  onSignOut?: () => void
  /** Wordmark/logo personnalisé. Par défaut « € EVOLVE CAPITAL ». */
  logo?: React.ReactNode
  /** Libellés (i18n). Chaque clé absente retombe sur son défaut FR. */
  labels?: SuspendedScreenLabels
  className?: string
}

/** Wordmark par défaut : pastille « € » + EVOLVE (gras) + CAPITAL (léger). */
function DefaultWordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-display" aria-label="Evolve Capital">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-brand-yellow text-[15px] font-bold text-accent-ink"
        aria-hidden="true"
      >
        €
      </span>
      <span className="text-[15px] uppercase tracking-wide text-text">
        <span className="font-bold">Evolve</span>{' '}
        <span className="font-medium text-text-sec">Capital</span>
      </span>
    </span>
  )
}

/** Cadenas ouvert dans une pastille avec halo jaune (tokens uniquement, currentColor). */
function OpenPadlock() {
  return (
    <span
      className="relative inline-flex h-28 w-28 items-center justify-center"
      role="img"
      aria-hidden="true"
    >
      {/* Halo radial jaune subtil */}
      <span
        className="absolute inset-0 rounded-full bg-brand-yellow opacity-[0.12] blur-2xl"
        aria-hidden="true"
      />
      <span className="absolute inset-2 rounded-full border border-border" aria-hidden="true" />
      {/* Cadenas ouvert — anse jaune, corps jaune, trou de serrure */}
      <svg viewBox="0 0 64 64" className="relative h-14 w-14 text-brand-yellow" fill="none">
        {/* Anse ouverte (à gauche, relevée) */}
        <path
          d="M22 30v-8a10 10 0 0 1 19.5-3"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Corps du cadenas */}
        <rect x="18" y="30" width="28" height="22" rx="4" stroke="currentColor" strokeWidth="3.5" />
        {/* Trou de serrure */}
        <circle cx="32" cy="39" r="3" fill="currentColor" />
        <path d="M32 42v5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

/**
 * Écran « accès suspendu ». Toujours sombre. Présentationnel.
 * Le conteneur racine porte `data-theme="dark"` pour forcer les tokens sombres
 * indépendamment du thème de l'app.
 */
export function SuspendedScreen({
  treasurerMailto,
  signOutHref = '#',
  onSignOut,
  logo,
  labels,
  className,
}: SuspendedScreenProps) {
  const t = { ...DEFAULT_LABELS, ...labels }

  return (
    <div
      data-theme="dark"
      className={cn(
        'flex min-h-screen w-full flex-col items-center justify-center bg-bg px-4 py-12 text-text',
        className
      )}
    >
      <div className="flex w-full max-w-[480px] flex-col items-center text-center">
        <div className="mb-10">{logo ?? <DefaultWordmark />}</div>

        <OpenPadlock />

        <h1 className="mt-8 font-display text-[28px] font-bold leading-tight text-text">
          {t.title}
        </h1>

        <p className="mt-4 text-[15px] leading-relaxed text-text-sec">{t.description}</p>

        {treasurerMailto ? (
          <a
            href={treasurerMailto}
            className={cn(
              'mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-6',
              'bg-brand-yellow text-[15px] font-semibold text-accent-ink',
              'transition-all duration-[150ms] hover:opacity-90',
              'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
            )}
          >
            {t.contactCta}
            <span aria-hidden="true">→</span>
          </a>
        ) : null}

        <a
          href={signOutHref}
          onClick={onSignOut}
          className={cn(
            'mt-5 inline-flex min-h-[44px] items-center text-[13px] font-medium text-text-ter underline underline-offset-4',
            'transition-colors duration-[150ms] hover:text-text-sec',
            'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] rounded'
          )}
        >
          {t.signOut}
        </a>
      </div>
    </div>
  )
}
