'use client'

// SheetConnectionTest (NET-006) — connexion + dry-run d'une matrice Google Sheets.
//
// Écran le PLUS important de l'assistant « Ajouter un club » (E-NET §Écran 2) :
//   1. Champ « URL ou ID de la feuille Google Sheets » (l'appelant extrait l'ID côté UI).
//   2. Encart d'instruction (`bg-card-sub`) : « Partage d'abord cette feuille en lecture avec : »
//      + email du Service Account + bouton COPIER (clipboard via callback `onCopyEmail`).
//   3. Bouton secondaire « Tester la connexion » → l'appelant invoque l'Edge `sheet-probe`.
//   4. 3 ÉTATS du résultat :
//        - succès  (`data-positive`)  : aperçu « X membres · Y positions · N onglets ».
//        - not_shared (`data-negative`) : « Feuille non partagée — partage-la avec <email SA> ».
//        - structure (`data-warning`)  : onglet(s) bloquant(s) absent(s) (vrais noms : POSITIONS…).
//
// Présentationnel & ZÉRO i18n : tout le copy passe par `labels`. L'appelant pilote `value`,
// `status` (idle | testing | success | not_shared | invalid | structure | error) et le `result`.
// Tokens design-system uniquement (jamais de rouge brand #E93E3A pour un statut → data-negative
// pour l'échec de partage, data-warning pour la structure, data-positive pour le succès).
//
// a11y : champ labellisé (FormField), bloc résultat `role="status"` (succès) / `role="alert"`
// (échec), boutons ≥44px, focus glow. Réf : SyncBanner (tokens statut), InviteForm (form inline),
// sheet-probe (contrat REQUIRED_TABS, not_shared, missing_tabs), CLAUDE.md (a11y, tokens).

import * as React from 'react'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import { Input } from '../../atoms/Input'
import { Spinner } from '../../atoms/Spinner'
import { FormField } from '../FormField'
import { cn } from '../../lib/cn'

/** Aperçu lecture seule renvoyé par sheet-probe (succès). */
export interface SheetProbePreview {
  members: number
  positions: number
  tabsFound: number
}

/** État du test de connexion, piloté par l'appelant (qui invoque l'Edge sheet-probe). */
export type SheetConnectionStatus =
  | 'idle' // aucun test lancé
  | 'testing' // requête sheet-probe en cours
  | 'success' // matrice valide → « Continuer » débloqué
  | 'not_shared' // feuille non partagée avec le Service Account (data-negative)
  | 'structure' // feuille accessible mais onglet(s) bloquant(s) absent(s) (data-warning)
  | 'invalid' // ID / URL invalide ou feuille introuvable (data-negative)
  | 'sa_key_invalid' // clé Service Account absente ou illisible côté infra (data-negative) — contacter un admin
  | 'error' // erreur technique inattendue (data-negative)

export interface SheetConnectionTestLabels {
  fieldLabel: string
  fieldHint: string
  placeholder: string
  /** Phrase de l'encart : « Partage d'abord cette feuille en lecture avec : » */
  shareTitle: string
  shareHint: string
  copyEmail: string
  copied: string
  testConnection: string
  testing: string
  successTitle: string
  /** Reçoit l'aperçu : « 18 membres · 24 positions · 6 onglets ». */
  successPreview: (p: SheetProbePreview) => string
  dryRunBadge: string
  notSharedTitle: string
  /** Reçoit l'email du SA : « Partage-la en lecture avec <email>. » */
  notSharedBody: (saEmail: string | null) => string
  structureTitle: string
  /** Reçoit la liste des onglets manquants (vrais noms). */
  structureBody: (missingTabs: string[]) => string
  invalidTitle: string
  invalidBody: string
  /** Titre du bloc erreur clé SA invalide (statut sa_key_invalid). Par défaut : "Clé Service Account invalide". */
  saKeyInvalidTitle?: string
  /** Corps du bloc erreur clé SA invalide. Par défaut : "Contacte un administrateur." */
  saKeyInvalidBody?: string
  errorTitle: string
  errorBody: string
}

export interface SheetConnectionTestProps {
  /** Valeur du champ URL/ID (contrôlé par l'appelant). */
  value: string
  onChange: (value: string) => void
  /** Email du Service Account à partager (affiché dans l'encart). `null` si indisponible. */
  serviceAccountEmail: string | null
  /** Déclenche la copie du SA dans le presse-papiers (clipboard côté appelant). */
  onCopyEmail: () => void
  /** Vrai brièvement après une copie réussie (bascule le libellé « Copié »). */
  copied?: boolean
  status: SheetConnectionStatus
  /** Onglets manquants (status === 'structure'). Vrais noms (POSITIONS, …). */
  missingTabs?: string[]
  /** Aperçu (status === 'success'). */
  preview?: SheetProbePreview
  /** Message technique brut (status === 'error'), optionnel. */
  errorDetail?: string | null
  /** Lance le test (l'appelant invoque sheet-probe). */
  onTest: () => void
  labels: SheetConnectionTestLabels
  className?: string
}

/** Styles par tonalité d'un bloc résultat (fond *-50 + bordure color-mix + texte du token). */
const TONE = {
  positive: {
    box: 'bg-data-positive-50 border-[color-mix(in_srgb,var(--color-data-positive)_35%,transparent)]',
    title: 'text-data-positive',
    icon: 'CircleCheck' as const,
  },
  warning: {
    box: 'bg-data-warning-50 border-[color-mix(in_srgb,var(--color-data-warning)_35%,transparent)]',
    title: 'text-data-warning-strong',
    icon: 'TriangleAlert' as const,
  },
  negative: {
    box: 'bg-data-negative-50 border-[color-mix(in_srgb,var(--color-data-negative)_35%,transparent)]',
    title: 'text-data-negative',
    icon: 'CircleX' as const,
  },
}

/**
 * Connexion + dry-run d'une matrice. Présentationnel : l'appelant invoque l'Edge `sheet-probe`
 * et reflète le résultat via `status` / `preview` / `missingTabs`.
 */
export function SheetConnectionTest({
  value,
  onChange,
  serviceAccountEmail,
  onCopyEmail,
  copied = false,
  status,
  missingTabs = [],
  preview,
  errorDetail = null,
  onTest,
  labels,
  className,
}: SheetConnectionTestProps) {
  const isTesting = status === 'testing'
  const canTest = value.trim() !== '' && !isTesting

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* 1. Champ URL/ID de la feuille. */}
      <FormField label={labels.fieldLabel} helpText={labels.fieldHint}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={labels.placeholder}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        )}
      </FormField>

      {/* 2. Encart d'instruction de partage (bg-card-sub, bordure douce). */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card-sub px-5 py-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-text">
          <Icon name="ShieldCheck" size={16} className="text-text-sec" aria-hidden="true" />
          {labels.shareTitle}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-border-strong bg-card px-3 py-1.5 font-mono text-[12.5px] text-text">
            {serviceAccountEmail ?? '—'}
          </span>
          <button
            type="button"
            onClick={onCopyEmail}
            disabled={!serviceAccountEmail}
            aria-live="polite"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border-strong bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-text outline-none transition-shadow duration-[150ms] hover:bg-neutral-100 focus-visible:shadow-[var(--sh-glow)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name={copied ? 'Check' : 'Copy'} size={16} aria-hidden="true" />
            {copied ? labels.copied : labels.copyEmail}
          </button>
        </div>
        <p className="text-[12.5px] text-text-ter">{labels.shareHint}</p>
      </div>

      {/* 3. Bouton « Tester la connexion ». Le Button affiche son propre spinner quand isLoading ;
          on garde le libellé « Test en cours… » comme nom accessible pour annoncer l'état. */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onTest}
          disabled={!canTest}
          aria-busy={isTesting || undefined}
          iconLeft={
            isTesting ? (
              <Spinner size={16} aria-label="" />
            ) : (
              <Icon name="RefreshCw" size={16} aria-hidden="true" />
            )
          }
          className="min-h-[44px]"
        >
          {isTesting ? labels.testing : labels.testConnection}
        </Button>
      </div>

      {/* 4. Résultat — 3 tonalités. */}
      {status === 'success' && preview && (
        <ResultBox
          tone="positive"
          title={labels.successTitle}
          body={labels.successPreview(preview)}
          badge={labels.dryRunBadge}
          live="status"
        />
      )}
      {status === 'structure' && (
        <ResultBox
          tone="warning"
          title={labels.structureTitle}
          body={labels.structureBody(missingTabs)}
          missingTabs={missingTabs}
          live="alert"
        />
      )}
      {status === 'not_shared' && (
        <ResultBox
          tone="negative"
          title={labels.notSharedTitle}
          body={labels.notSharedBody(serviceAccountEmail)}
          live="alert"
        />
      )}
      {status === 'invalid' && (
        <ResultBox
          tone="negative"
          title={labels.invalidTitle}
          body={labels.invalidBody}
          live="alert"
        />
      )}
      {status === 'sa_key_invalid' && (
        <ResultBox
          tone="negative"
          title={labels.saKeyInvalidTitle ?? 'Clé Service Account invalide'}
          body={labels.saKeyInvalidBody ?? 'Contacte un administrateur.'}
          live="alert"
        />
      )}
      {status === 'error' && (
        <ResultBox
          tone="negative"
          title={labels.errorTitle}
          body={errorDetail ? `${labels.errorBody} (${errorDetail})` : labels.errorBody}
          live="alert"
        />
      )}
    </div>
  )
}

/** Bloc de résultat (succès / warning / erreur). Tokens *-50 + bordure color-mix. */
function ResultBox({
  tone,
  title,
  body,
  badge,
  missingTabs,
  live,
}: {
  tone: keyof typeof TONE
  title: string
  body: string
  badge?: string
  missingTabs?: string[]
  live: 'status' | 'alert'
}) {
  const t = TONE[tone]
  return (
    <div
      role={live}
      aria-live={live === 'alert' ? 'assertive' : 'polite'}
      className={cn('flex items-start gap-3 rounded-md border px-4 py-4', t.box)}
    >
      <Icon name={t.icon} size={24} className={cn('mt-0.5', t.title)} aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className={cn('font-display text-[14.5px] font-bold', t.title)}>{title}</p>
        <p className="text-[13.5px] text-text-sec">{body}</p>
        {missingTabs && missingTabs.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5" aria-hidden="true">
            {missingTabs.map((tab) => (
              <li
                key={tab}
                className="inline-flex items-center gap-1 rounded-full bg-data-warning-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-data-warning-strong"
              >
                <Icon name="X" size={16} className="h-3 w-3" aria-hidden="true" />
                {tab}
              </li>
            ))}
          </ul>
        )}
        {badge && (
          <p className={cn('mt-1 text-[10px] font-semibold uppercase tracking-[0.08em]', t.title)}>
            {badge}
          </p>
        )}
      </div>
    </div>
  )
}
