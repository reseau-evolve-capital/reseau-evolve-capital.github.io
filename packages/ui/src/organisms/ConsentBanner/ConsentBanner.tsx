'use client'

// ConsentBanner — bannière de consentement RGPD (Consent Mode v2).
//
// Port fidèle de la « Variante A » (REC/standalone-exports/Cookie Consent RGPD (standalone).html).
// Deux variantes pilotables par variable d'environnement (cf. apps/web wrapper) :
//   - `compact` (DÉFAUT desktop, ancrée à gauche) : carte étroite, boutons empilés.
//   - `bar` : barre basse pleine largeur, boutons en ligne.
// Chaque variante a un état initial + un panneau granulaire (Personnaliser) avec les catégories
// « Cookies nécessaires » (Switch verrouillé) et « Cookies d'analyse » (Switch → analytics_storage).
// État granulaire : un SEUL CTA jaune (« Enregistrer mes préférences ») + « Tout refuser » (bordé)
// + un lien discret « Fermer/Retour ». Jamais deux boutons jaunes simultanés.
//
// Règles CLAUDE.md : présentationnel (copy via props, zéro i18n/data ici), tokens only (aucun hex
// de marque en dur — les écarts résiduels avec la maquette = one-off de la maquette, on garde les
// tokens canoniques), a11y AA (role=dialog, clavier, focus --sh-glow, cibles ≥ 44px),
// « Refuser » à PROMINENCE ÉGALE de « Tout accepter » (CNIL : seul le fond diffère).

import * as React from 'react'

import { Switch } from '../../atoms/Switch'
import { cn } from '../../lib/cn'

export type ConsentVariant = 'compact' | 'bar'
export type ConsentSide = 'gauche' | 'droite'

/** Décision de consentement remontée au pilote Consent Mode v2. */
export interface ConsentChoice {
  analytics: boolean
}

export interface ConsentBannerCopy {
  title: string
  description: string
  privacyLabel: string
  privacyHref: string
  acceptAll: string
  rejectAll: string
  /** « Tout refuser » dans le panneau granulaire. */
  rejectAllLong: string
  /** Lien « Personnaliser » (variante bar, état initial). */
  customize: string
  /** Lien « Personnaliser mes choix » (variante compact, état initial). */
  customizeChoices: string
  /** CTA jaune d'enregistrement des choix granulaires. */
  save: string
  /** Lien discret pour replier le panneau (bar). */
  close: string
  /** Lien discret pour revenir à l'état initial (compact). */
  back: string
  necessaryTitle: string
  necessaryDesc: string
  /** État verrouillé des cookies nécessaires (aria). */
  necessaryState: string
  analyticsTitle: string
  analyticsDesc: string
  /** aria-label de la région. */
  regionLabel: string
}

const DEFAULT_COPY: ConsentBannerCopy = {
  title: "Nous utilisons des cookies d'analyse",
  description:
    "Google Analytics nous aide à comprendre comment les membres utilisent l'application, pour l'améliorer. Rien d'autre — aucun cookie publicitaire.",
  privacyLabel: 'Politique de confidentialité',
  privacyHref: '/legal/privacy',
  acceptAll: 'Tout accepter',
  rejectAll: 'Refuser',
  rejectAllLong: 'Tout refuser',
  customize: 'Personnaliser',
  customizeChoices: 'Personnaliser mes choix',
  save: 'Enregistrer mes préférences',
  close: 'Fermer',
  back: 'Retour',
  necessaryTitle: 'Cookies nécessaires',
  necessaryDesc:
    "Connexion, sécurité et préférences. Indispensables au fonctionnement de l'application.",
  necessaryState: 'Toujours actifs',
  analyticsTitle: "Cookies d'analyse",
  analyticsDesc:
    "Google Analytics — mesure d'audience anonymisée pour comprendre l'usage et améliorer l'app.",
  regionLabel: 'Préférences de cookies',
}

export interface ConsentBannerProps {
  variant?: ConsentVariant
  /** Côté d'ancrage (variante compact, desktop). */
  side?: ConsentSide
  /** Copy (i18n) — fusionnée avec les défauts FR. */
  copy?: Partial<ConsentBannerCopy>
  /** Affiche d'emblée le panneau granulaire (stories / réouverture « gérer »). */
  defaultExpanded?: boolean
  /** État initial du toggle « Mesure d'audience ». */
  defaultAnalytics?: boolean
  onAcceptAll?: () => void
  onRejectAll?: () => void
  /** Enregistrement d'un choix granulaire. */
  onSave?: (choice: ConsentChoice) => void
  className?: string
}

// ─── Boutons (specs relevées sur la réf : 14px/600, padding 13×22, radius 10, focus glow) ───
const BTN_BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-body font-semibold ' +
  'text-[14px] leading-none px-[22px] py-[13px] transition-all duration-[150ms] cursor-pointer ' +
  'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] active:scale-[0.98] motion-reduce:active:scale-100'
const BTN_ACCEPT = 'bg-brand-yellow text-accent-ink border border-transparent hover:opacity-90'
// Refuser = MÊME taille/poids/padding qu'Accepter ; seul le fond change (CNIL : prominence égale).
const BTN_REFUSE = 'bg-transparent text-text border border-border hover:bg-card-sub'
const BTN_CUSTOMIZE =
  'cursor-pointer border-0 bg-transparent font-body font-semibold text-[13.5px] px-1 py-[13px] ' +
  'text-text/45 underline decoration-text/25 underline-offset-[3px] ' +
  'transition-colors duration-[150ms] hover:text-text focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'

function CookieLockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="text-brand-yellow"
    >
      <rect
        x="3.5"
        y="8.5"
        width="13"
        height="9"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M6.5 8.5 V6.2 a3.5 3.5 0 0 1 7 0 V8.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="13" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function ConsentBanner({
  variant = 'compact',
  side = 'gauche',
  copy,
  defaultExpanded = false,
  defaultAnalytics = false,
  onAcceptAll,
  onRejectAll,
  onSave,
  className,
}: ConsentBannerProps) {
  const c = { ...DEFAULT_COPY, ...copy }
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const [analytics, setAnalytics] = React.useState(defaultAnalytics)
  const titleId = React.useId()
  const descId = React.useId()
  const handleSave = () => onSave?.({ analytics })

  const Title = ({ size }: { size: 'bar' | 'compact' }) => (
    <h2
      id={titleId}
      className={cn(
        'm-0 font-display font-bold tracking-[-0.01em] text-text',
        size === 'compact' ? 'text-[16px]' : 'text-[15.5px]'
      )}
    >
      {c.title}
    </h2>
  )

  const Description = ({ size }: { size: 'bar' | 'compact' }) => (
    <p
      id={descId}
      className={cn(
        'm-0 leading-[1.55] text-text/65',
        size === 'compact' ? 'text-[13.5px]' : 'text-[13px]'
      )}
    >
      {c.description}{' '}
      <a
        href={c.privacyHref}
        className="font-semibold text-text underline decoration-brand-yellow/55 underline-offset-[3px] hover:decoration-brand-yellow"
      >
        {c.privacyLabel}
      </a>
    </p>
  )

  // Panneau granulaire : 2 catégories (Nécessaires = Switch verrouillé jaune + Analyse togglable).
  const Categories = (
    <div className="flex flex-col gap-3">
      <CategoryRow
        title={c.necessaryTitle}
        desc={c.necessaryDesc}
        control={
          <Switch
            checked
            disabled
            aria-readonly="true"
            aria-label={`${c.necessaryTitle} — ${c.necessaryState}`}
            className="shrink-0 cursor-not-allowed disabled:opacity-100"
          />
        }
      />
      <CategoryRow
        title={c.analyticsTitle}
        desc={c.analyticsDesc}
        control={
          <Switch
            checked={analytics}
            onCheckedChange={(v) => setAnalytics(v === true)}
            aria-label={c.analyticsTitle}
            className="shrink-0"
          />
        }
      />
    </div>
  )

  // ─────────────────────────────── Variante BAR ───────────────────────────────
  if (variant === 'bar') {
    return (
      <div
        role="dialog"
        aria-label={c.regionLabel}
        aria-describedby={descId}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card',
          // Ombre vers le haut (neutre, lisible light comme dark — la bordure porte la séparation).
          'shadow-[0_-8px_32px_rgba(0,0,0,0.25)]',
          'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-[220ms]',
          className
        )}
      >
        <div className="mx-auto flex max-w-[1080px] flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:gap-8 sm:px-10">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <span className="shrink-0 pt-0.5">
              <CookieLockIcon size={20} />
            </span>
            <div className="min-w-0">
              <Title size="bar" />
              <div className="mt-[3px]">
                <Description size="bar" />
              </div>
              {expanded ? <div className="mt-4">{Categories}</div> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 max-sm:flex-col max-sm:items-stretch">
            {expanded ? (
              <>
                <button type="button" className={BTN_CUSTOMIZE} onClick={() => setExpanded(false)}>
                  {c.close}
                </button>
                <button type="button" className={cn(BTN_BASE, BTN_REFUSE)} onClick={onRejectAll}>
                  {c.rejectAllLong}
                </button>
                <button type="button" className={cn(BTN_BASE, BTN_ACCEPT)} onClick={handleSave}>
                  {c.save}
                </button>
              </>
            ) : (
              <>
                <button type="button" className={BTN_CUSTOMIZE} onClick={() => setExpanded(true)}>
                  {c.customize}
                </button>
                <button type="button" className={cn(BTN_BASE, BTN_REFUSE)} onClick={onRejectAll}>
                  {c.rejectAll}
                </button>
                <button type="button" className={cn(BTN_BASE, BTN_ACCEPT)} onClick={onAcceptAll}>
                  {c.acceptAll}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────── Variante COMPACT ───────────────────────────────
  return (
    <div
      role="dialog"
      aria-label={c.regionLabel}
      aria-describedby={descId}
      className={cn(
        'fixed z-[60] bg-card shadow-[0_16px_48px_rgba(35,31,32,0.16)]',
        // Mobile : sheet pleine largeur, coins hauts arrondis.
        'inset-x-0 bottom-0 rounded-t-[20px] border-t border-border',
        // Desktop : carte flottante ancrée à un coin bas, tous coins arrondis + bordure complète.
        'sm:inset-x-auto sm:bottom-6 sm:w-[440px] sm:rounded-[16px] sm:border',
        side === 'gauche' ? 'sm:left-6' : 'sm:right-6',
        'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-[220ms]',
        className
      )}
    >
      <div className="px-7 pt-[26px] pb-[18px]">
        <div className="mb-2.5 flex items-center gap-2.5">
          <CookieLockIcon size={18} />
          <Title size="compact" />
        </div>
        <Description size="compact" />

        {!expanded ? (
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              className={cn(BTN_BASE, BTN_ACCEPT, 'w-full')}
              onClick={onAcceptAll}
            >
              {c.acceptAll}
            </button>
            <button
              type="button"
              className={cn(BTN_BASE, BTN_REFUSE, 'w-full')}
              onClick={onRejectAll}
            >
              {c.rejectAll}
            </button>
            <button
              type="button"
              className={cn(BTN_CUSTOMIZE, 'block text-center')}
              onClick={() => setExpanded(true)}
            >
              {c.customizeChoices}
            </button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            {Categories}
            <button
              type="button"
              className={cn(BTN_BASE, BTN_ACCEPT, 'w-full')}
              onClick={handleSave}
            >
              {c.save}
            </button>
            <button
              type="button"
              className={cn(BTN_CUSTOMIZE, 'block text-center')}
              onClick={() => setExpanded(false)}
            >
              {c.back}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryRow({
  title,
  desc,
  control,
}: {
  title: string
  desc: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[10px] border border-border bg-bg p-3">
      <div className="min-w-0">
        <p className="m-0 text-[13.5px] font-semibold text-text">{title}</p>
        <p className="m-0 mt-0.5 text-[12.5px] leading-[1.5] text-text/60">{desc}</p>
      </div>
      <div className="pt-0.5">{control}</div>
    </div>
  )
}
