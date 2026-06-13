'use client'

// PollVoteSheet (organism) — modale/sheet de vote anonyme (réf spec §1,2,10 + maquette
// « 2 · PollVoteSheet »). Modale desktop centrée 480px sur scrim · bottom-sheet mobile.
//
// En tête : pill dorée « Vote anonyme » AVANT toute interaction. Titre + description du vote.
// Quatre types de réponse (`questionType`) :
//   - 'yes_no'          : 3 options FIXES Oui / Non / Abstention (radio).
//   - 'single_choice'   : options personnalisées, 1 réponse (radio, items ≥ 52px).
//   - 'multiple_choice' : options personnalisées, N réponses (checkbox 24×24 r4) +
//                         note « Vous pouvez sélectionner plusieurs réponses. ».
//   - 'short_text'      : encadré avertissement anonymat (bordure gauche 2px dorée),
//                         textarea (max 280) + compteur X/280.
//
// L'option sélectionnée passe en fond teinté doré + bordure dorée + indicateur coché.
// Le CTA « CONFIRMER MON VOTE » est DÉSACTIVÉ tant qu'aucune sélection / texte valide.
// En état « ready », la mention « Votre réponse est définitive… » s'affiche au-dessus du CTA.
//
// Après submit réussi → écran de succès « Vote enregistré » :
//   - resultsVisibility 'after_close' → « Résultats disponibles à la clôture le {date} ».
//   - resultsVisibility 'live'        → « Les résultats sont calculés en direct » + état chargement
//     (l'appelant injecte les vraies barres via `liveResultsSlot`).
//
// PRÉSENTATIONNEL STRICT (CLAUDE.md) : aucune dépendance data/i18n. Copy via `labels`
// (défauts FR). `onSubmit(value)` est async → resolve = succès, reject = état error.
// Radix Dialog (focus-trap, Escape, Title + Description). A11y AA : radio/checkbox groups
// ARIA, focus glow, cibles ≥ 44px, clavier complet, prefers-reduced-motion.
// Tokens uniquement, jamais de hex en dur ; le doré (brand.yellow) est l'accent légitime.

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export type PollQuestionType = 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'
export type PollResultsVisibility = 'after_close' | 'live'

export const POLL_TEXT_MAX = 280

export interface PollOption {
  /** Identifiant stable de l'option (clé envoyée dans la sélection). */
  id: string
  /** Libellé affiché. */
  label: string
}

/** Valeur soumise selon le type. selectedOptions pour yes_no/single/multiple, textResponse pour short_text. */
export interface PollVoteValue {
  selectedOptions: string[]
  textResponse: string | null
}

export interface PollVoteLabels {
  /** Pill « Vote anonyme ». */
  anonymous?: string
  /** aria-label du bouton fermer. */
  close?: string
  /** Mention de réponse définitive (au-dessus du CTA en état ready). */
  definitive?: string
  /** Note des choix multiples. */
  multipleHint?: string
  /** Avertissement anonymat du texte libre (§10). */
  textAnonymityNote?: string
  /** CTA de confirmation. */
  submit?: string
  /** CTA pendant l'envoi. */
  sending?: string
  /** Libellés des 3 options fixes du type yes_no. */
  yesNo?: { yes?: string; no?: string; abstain?: string }
  /** Écran de succès. */
  success?: {
    title?: string
    /** Sous-titre (after_close, anonymat). */
    subtitle?: string
    /** Sous-titre (live). */
    subtitleLive?: string
    /** Gabarit « Résultats disponibles à la clôture le {date} » ; « {date} » remplacé. */
    afterClose?: string
    /** Texte de chargement des résultats live. */
    loadingLive?: string
    /** CTA fermer. */
    close?: string
  }
  /** Bandeau d'erreur (submit rejeté). */
  error?: string
  /** aria-label du groupe d'options (radio/checkbox group). */
  optionsGroupLabel?: string
}

interface ResolvedLabels {
  anonymous: string
  close: string
  definitive: string
  multipleHint: string
  textAnonymityNote: string
  submit: string
  sending: string
  yesNo: { yes: string; no: string; abstain: string }
  success: {
    title: string
    subtitle: string
    subtitleLive: string
    afterClose: string
    loadingLive: string
    close: string
  }
  error: string
  optionsGroupLabel: string
}

const DEFAULTS: ResolvedLabels = {
  anonymous: 'Vote anonyme',
  close: 'Fermer',
  definitive: 'Votre réponse est définitive et ne pourra pas être modifiée.',
  multipleHint: 'Vous pouvez sélectionner plusieurs réponses.',
  textAnonymityNote:
    'Votre réponse sera visible de l’équipe sous forme anonyme. Votre nom n’y sera pas associé.',
  submit: 'Confirmer mon vote',
  sending: 'Envoi…',
  yesNo: { yes: 'Oui', no: 'Non', abstain: 'Abstention' },
  success: {
    title: 'Vote enregistré',
    subtitle: 'Votre réponse a bien été prise en compte, de façon anonyme.',
    subtitleLive: 'Merci. Les résultats sont calculés en direct.',
    afterClose: 'Résultats disponibles à la clôture le {date}',
    loadingLive: 'Chargement des résultats…',
    close: 'Fermer',
  },
  error: 'L’envoi a échoué. Réessayez.',
  optionsGroupLabel: 'Options de réponse',
}

function resolveLabels(labels?: PollVoteLabels): ResolvedLabels {
  return {
    ...DEFAULTS,
    ...labels,
    yesNo: { ...DEFAULTS.yesNo, ...labels?.yesNo },
    success: { ...DEFAULTS.success, ...labels?.success },
  }
}

/** Options fixes pour le type yes_no. */
function yesNoOptions(t: ResolvedLabels): PollOption[] {
  return [
    { id: 'yes', label: t.yesNo.yes },
    { id: 'no', label: t.yesNo.no },
    { id: 'abstain', label: t.yesNo.abstain },
  ]
}

export interface PollVoteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Titre de la question. */
  title: string
  /** Description optionnelle. */
  description?: string
  /** Type de réponse. */
  questionType: PollQuestionType
  /** Options pour single_choice / multiple_choice. Ignoré pour yes_no (fixe) et short_text. */
  options?: PollOption[]
  /** Visibilité des résultats — pilote l'écran de succès. Défaut 'after_close'. */
  resultsVisibility?: PollResultsVisibility
  /** Date de clôture lisible (ex. « 20 juin ») injectée dans le message after_close. */
  closesAtLabel?: string
  /** Slot pour les vraies barres de résultats live (l'appelant les fournit). */
  liveResultsSlot?: React.ReactNode
  /** Soumission. Résout → success, rejette → error (la sélection est conservée). */
  onSubmit: (value: PollVoteValue) => Promise<void>
  /** Copy/a11y (i18n). Défauts FR. */
  labels?: PollVoteLabels
}

type Phase = 'idle' | 'loading' | 'success' | 'error'

export function PollVoteSheet({
  open,
  onOpenChange,
  title,
  description,
  questionType,
  options,
  resultsVisibility = 'after_close',
  closesAtLabel,
  liveResultsSlot,
  onSubmit,
  labels,
}: PollVoteSheetProps) {
  const t = resolveLabels(labels)
  const descId = React.useId()
  const groupId = React.useId()

  const [selected, setSelected] = React.useState<string[]>([])
  const [text, setText] = React.useState('')
  const [phase, setPhase] = React.useState<Phase>('idle')

  // Réinitialise l'état à chaque (ré)ouverture — jamais d'état rémanent.
  React.useEffect(() => {
    if (open) {
      setSelected([])
      setText('')
      setPhase('idle')
    }
  }, [open])

  const effectiveOptions = questionType === 'yes_no' ? yesNoOptions(t) : (options ?? [])

  const trimmed = text.trim()
  const hasSelection = questionType === 'short_text' ? trimmed.length > 0 : selected.length > 0
  const isLoading = phase === 'loading'
  const canSubmit = hasSelection && !isLoading

  const toggleSingle = (id: string) => setSelected([id])
  const toggleMultiple = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setPhase('loading')
    try {
      await onSubmit({
        selectedOptions: questionType === 'short_text' ? [] : selected,
        textResponse: questionType === 'short_text' ? trimmed : null,
      })
      setPhase('success')
    } catch {
      setPhase('error')
    }
  }

  const isRadio = questionType === 'yes_no' || questionType === 'single_choice'
  const isMultiple = questionType === 'multiple_choice'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={cn(
            'fixed z-50 bg-card shadow-[var(--sh-modal)] focus:outline-none',
            // Mobile : bottom-sheet ancré bas.
            'inset-x-0 bottom-0 w-full rounded-t-[var(--r-lg)] border border-border',
            'px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]',
            // Desktop : modale centrée 480px.
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[480px] sm:max-w-[calc(100vw-2rem)]',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--r-lg)] sm:p-7',
            'max-h-[92vh] overflow-y-auto',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-[220ms]'
          )}
        >
          {/* Grab-handle mobile (décoratif). */}
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong sm:hidden"
            aria-hidden="true"
          />

          {phase === 'success' ? (
            <SuccessView
              labels={t}
              descId={descId}
              resultsVisibility={resultsVisibility}
              closesAtLabel={closesAtLabel}
              liveResultsSlot={liveResultsSlot}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <>
              {/* Pill « Vote anonyme » en tête, avant toute interaction. */}
              <span className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-brand-yellow/16 px-3 py-1 text-[12px] font-semibold text-text">
                <Icon
                  name="ShieldCheck"
                  size={16}
                  className="text-brand-yellow"
                  aria-hidden="true"
                />
                {t.anonymous}
              </span>

              <Dialog.Title className="mt-3 font-display text-[20px] font-extrabold leading-tight text-text">
                {title}
              </Dialog.Title>
              <Dialog.Description id={descId} className="mt-1 text-[13px] text-text-sec">
                {description ?? ''}
              </Dialog.Description>

              {phase === 'error' && (
                <div
                  role="alert"
                  className={cn(
                    'mt-4 flex items-start gap-2 rounded-[var(--r-md)] border-l-[3px] p-3',
                    'border-[var(--data-negative)] bg-data-negative-50 text-[var(--data-negative-strong)]'
                  )}
                >
                  <Icon name="TriangleAlert" size={20} aria-hidden="true" className="mt-px" />
                  <span className="text-[13px] font-medium">{t.error}</span>
                </div>
              )}

              <div
                className={cn('mt-5', isLoading && 'pointer-events-none select-none opacity-50')}
              >
                {questionType === 'short_text' ? (
                  <ShortTextField labels={t} value={text} onChange={setText} disabled={isLoading} />
                ) : (
                  <OptionsField
                    labels={t}
                    groupId={groupId}
                    options={effectiveOptions}
                    selected={selected}
                    isRadio={isRadio}
                    isMultiple={isMultiple}
                    onSelectSingle={toggleSingle}
                    onToggleMultiple={toggleMultiple}
                    disabled={isLoading}
                  />
                )}
              </div>

              {/* Mention définitive — uniquement quand une sélection existe (état « ready »). */}
              {hasSelection && (
                <p className="mt-4 text-[12px] italic text-text-ter">{t.definitive}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                aria-busy={isLoading || undefined}
                className={cn(
                  'mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2',
                  'rounded-[var(--r-md)] bg-brand-yellow text-accent-ink',
                  'font-display text-[14px] font-bold uppercase tracking-wide',
                  'transition-opacity duration-[150ms] hover:opacity-90',
                  'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                {isLoading ? <CtaSpinner /> : null}
                {isLoading ? t.sending : t.submit}
              </button>
            </>
          )}

          {phase !== 'success' && (
            <Dialog.Close
              aria-label={t.close}
              className={cn(
                'absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center',
                'rounded-md text-text-ter hover:text-text-sec',
                'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none'
              )}
            >
              <Icon name="X" size={20} aria-hidden="true" />
            </Dialog.Close>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── Sous-vues ─────────────────────────────────────────────────────────── */

interface OptionsFieldProps {
  labels: ResolvedLabels
  groupId: string
  options: PollOption[]
  selected: string[]
  isRadio: boolean
  isMultiple: boolean
  onSelectSingle: (id: string) => void
  onToggleMultiple: (id: string) => void
  disabled: boolean
}

function OptionsField({
  labels: t,
  groupId,
  options,
  selected,
  isRadio,
  isMultiple,
  onSelectSingle,
  onToggleMultiple,
  disabled,
}: OptionsFieldProps) {
  // Navigation clavier des radios : flèches. Pour les checkboxes, chaque bouton est tabbable.
  const handleRadioKey = (event: React.KeyboardEvent, index: number) => {
    if (!isRadio) return
    const last = options.length - 1
    let next = index
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = index === 0 ? last : index - 1
    else return
    event.preventDefault()
    const opt = options[next]
    if (opt) {
      onSelectSingle(opt.id)
      const el = document.getElementById(`${groupId}-opt-${next}`)
      el?.focus()
    }
  }

  return (
    <>
      <div
        role={isRadio ? 'radiogroup' : 'group'}
        aria-label={t.optionsGroupLabel}
        className="flex flex-col gap-2"
      >
        {options.map((opt, index) => {
          const isSelected = selected.includes(opt.id)
          const optId = `${groupId}-opt-${index}`
          // Radio : un seul élément tabbable (le sélectionné, ou le 1er). Roving tabindex.
          const radioTabIndex = isSelected || (selected.length === 0 && index === 0) ? 0 : -1
          return (
            <button
              key={opt.id}
              id={optId}
              type="button"
              role={isRadio ? 'radio' : 'checkbox'}
              aria-checked={isSelected}
              tabIndex={isRadio ? radioTabIndex : 0}
              disabled={disabled}
              onClick={() => (isMultiple ? onToggleMultiple(opt.id) : onSelectSingle(opt.id))}
              onKeyDown={(e) => handleRadioKey(e, index)}
              className={cn(
                'flex min-h-[52px] items-center gap-3 rounded-[var(--r-md)] px-4 text-left',
                'border bg-card transition-colors duration-[150ms]',
                'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
                'disabled:cursor-not-allowed disabled:opacity-40',
                isSelected
                  ? 'border-2 border-brand-yellow bg-brand-yellow/12'
                  : 'border border-border-strong hover:border-brand-yellow/50'
              )}
            >
              {/* Indicateur visuel : pastille ronde (radio) ou case carrée 24×24 r4 (checkbox). */}
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex shrink-0 items-center justify-center border',
                  isMultiple ? 'h-6 w-6 rounded-[4px]' : 'h-5 w-5 rounded-full',
                  isSelected
                    ? 'border-brand-yellow bg-brand-yellow text-accent-ink'
                    : 'border-border-strong bg-card'
                )}
              >
                {isSelected && isMultiple && (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 12 12">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {isSelected && !isMultiple && (
                  <span className="block h-2.5 w-2.5 rounded-full bg-accent-ink" />
                )}
              </span>
              <span className="text-[14px] font-medium text-text">{opt.label}</span>
            </button>
          )
        })}
      </div>

      {isMultiple && <p className="mt-3 text-[12px] text-text-ter">{t.multipleHint}</p>}
    </>
  )
}

interface ShortTextFieldProps {
  labels: ResolvedLabels
  value: string
  onChange: (v: string) => void
  disabled: boolean
}

function ShortTextField({ labels: t, value, onChange, disabled }: ShortTextFieldProps) {
  const fieldId = React.useId()
  const count = value.length
  return (
    <>
      {/* Encadré avertissement anonymat : bordure gauche 2px dorée (§10). */}
      <p className="flex items-start gap-2 rounded-[var(--r-md)] border-l-2 border-brand-yellow bg-brand-yellow/8 p-3 text-[12px] text-text-sec">
        <Icon name="Info" size={16} className="mt-px text-brand-yellow" aria-hidden="true" />
        {t.textAnonymityNote}
      </p>
      <label htmlFor={fieldId} className="sr-only">
        {t.optionsGroupLabel}
      </label>
      <textarea
        id={fieldId}
        value={value}
        disabled={disabled}
        maxLength={POLL_TEXT_MAX}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-3 block min-h-[120px] w-full resize-y rounded-[var(--r-md)] p-3',
          'border border-border-strong bg-card-sub text-[14px] text-text placeholder:text-text-ter',
          'focus:border-brand-yellow focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
        )}
      />
      <p className="mt-1 text-right font-mono text-[12px] text-text-ter" aria-live="polite">
        {count}/{POLL_TEXT_MAX}
      </p>
    </>
  )
}

interface SuccessViewProps {
  labels: ResolvedLabels
  descId: string
  resultsVisibility: PollResultsVisibility
  closesAtLabel?: string
  liveResultsSlot?: React.ReactNode
  onClose: () => void
}

function SuccessView({
  labels: t,
  descId,
  resultsVisibility,
  closesAtLabel,
  liveResultsSlot,
  onClose,
}: SuccessViewProps) {
  const isLive = resultsVisibility === 'live'
  return (
    <div className="flex flex-col items-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-data-positive-50 text-data-positive">
        <Icon name="Check" size={24} aria-hidden="true" />
      </span>
      <Dialog.Title className="mt-4 font-display text-[20px] font-extrabold text-text">
        {t.success.title}
      </Dialog.Title>
      <Dialog.Description id={descId} className="mt-2 max-w-[36ch] text-[13px] text-text-sec">
        {isLive ? t.success.subtitleLive : t.success.subtitle}
      </Dialog.Description>

      {isLive ? (
        <div className="mt-5 w-full">
          {liveResultsSlot ?? (
            <p
              role="status"
              className="flex items-center justify-center gap-2 rounded-[var(--r-md)] border border-border bg-card-sub px-3 py-4 text-[13px] text-text-ter"
            >
              <CtaSpinner />
              {t.success.loadingLive}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-5 w-full rounded-[var(--r-md)] border border-border bg-card-sub px-3 py-3 text-[13px] text-text-sec">
          {t.success.afterClose.replace('{date}', closesAtLabel ?? '—')}
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className={cn(
          'mt-6 inline-flex min-h-[52px] w-full items-center justify-center',
          'rounded-[var(--r-md)] border border-border-strong bg-card-sub text-text',
          'font-display text-[14px] font-bold uppercase tracking-wide',
          'transition-colors duration-[150ms] hover:bg-border/40',
          'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
        )}
      >
        {t.success.close}
      </button>
    </div>
  )
}

function CtaSpinner() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
