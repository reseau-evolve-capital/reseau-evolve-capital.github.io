'use client'

// PollCreateForm (organism) — formulaire admin de création d'un vote, 2 étapes (réf spec §8 +
// maquette « 6 · PollCreateForm »). Page max-width 640 centrée.
//
//   Step 1 — titre (requis) + description (optionnel) + grille 2×2 de type-cards
//            (Oui/Non · Choix unique · Choix multiple · Réponse courte). Sélection d'un type
//            → bordure dorée + fond teinté.
//   Step 2 — selon le type :
//            • single_choice / multiple_choice : liste d'options (ajout/suppression),
//            • paramètres communs : toggle « Résultats visibles après la clôture »
//              (results_visibility), toggle « Notifier par e-mail » (notify_by_email),
//              champ « Date de clôture » (closes_at).
//            yes_no / short_text n'ont pas d'options → step 2 affiche seulement les paramètres.
//   Footer sticky : « Sauver le brouillon » (draft) + « Publier » (open).
//
// PRÉSENTATIONNEL STRICT (CLAUDE.md) : aucune dépendance data/i18n. Copy via `labels`
// (défauts FR). Émet `onSubmit(payload, action)` où action ∈ 'draft' | 'publish' ; l'appelant
// branche la Server Action. Aucune validation métier lourde ici : on garantit juste un payload
// cohérent (titre trimé, options non vides filtrées) et un footer désactivé tant que le minimum
// n'est pas réuni. Tokens uniquement ; doré = accent légitime.

import * as React from 'react'

import { Icon } from '../../atoms/Icon'
import { Input } from '../../atoms/Input'
import { Switch } from '../../atoms/Switch'
import { cn } from '../../lib/cn'

export type PollFormQuestionType = 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'
export type PollFormResultsVisibility = 'after_close' | 'live'
export type PollCreateAction = 'draft' | 'publish'

export interface PollCreatePayload {
  title: string
  description: string
  questionType: PollFormQuestionType
  /** Options (libellés trimés, vides exclus). Vide pour yes_no / short_text. */
  options: string[]
  resultsVisibility: PollFormResultsVisibility
  notifyByEmail: boolean
  /** Valeur brute du champ date (ISO yyyy-mm-dd) ou null. */
  closesAt: string | null
}

interface TypeCardMeta {
  type: PollFormQuestionType
  label: string
  hint: string
}

export interface PollCreateLabels {
  /** Eyebrow (« Admin · Votes »). */
  eyebrow?: string
  /** Titre de page step 1. */
  step1Title?: string
  /** Gabarit du titre step 2 (« Nouveau vote · {type} »). */
  step2Title?: string
  /** Champs step 1. */
  titleLabel?: string
  titlePlaceholder?: string
  descriptionLabel?: string
  descriptionPlaceholder?: string
  typeSectionLabel?: string
  /** Libellés + hints des 4 type-cards. */
  types?: Partial<Record<PollFormQuestionType, { label?: string; hint?: string }>>
  /** Section options (step 2). */
  optionsLabel?: string
  optionPlaceholder?: string
  addOption?: string
  /** aria-label gabarit du bouton retirer une option (« {n} » → index 1-based). */
  removeOption?: string
  /** Section paramètres. */
  settingsLabel?: string
  resultsVisibilityLabel?: string
  resultsVisibilityHint?: string
  notifyLabel?: string
  notifyHint?: string
  closesAtLabel?: string
  /** Footer. */
  saveDraft?: string
  publish?: string
  footerHint?: string
  /** Navigation entre étapes. */
  next?: string
  back?: string
}

const DEFAULT_TYPES: TypeCardMeta[] = [
  { type: 'yes_no', label: 'Oui / Non', hint: 'Question fermée, réponse binaire.' },
  { type: 'single_choice', label: 'Choix unique', hint: 'Une seule réponse parmi plusieurs.' },
  { type: 'multiple_choice', label: 'Choix multiple', hint: 'Plusieurs réponses possibles.' },
  { type: 'short_text', label: 'Réponse courte', hint: 'Texte libre, transmis de façon anonyme.' },
]

const DEFAULTS = {
  eyebrow: 'Admin · Votes',
  step1Title: 'Nouveau vote',
  step2Title: 'Nouveau vote · {type}',
  titleLabel: 'Intitulé du vote',
  titlePlaceholder: 'Ex. Faut-il diversifier vers les SCPI ?',
  descriptionLabel: 'Description (optionnel)',
  descriptionPlaceholder: 'Contexte transmis aux membres…',
  typeSectionLabel: 'Type de réponse',
  optionsLabel: 'Options de réponse',
  optionPlaceholder: 'Libellé de l’option',
  addOption: 'Ajouter une option',
  removeOption: 'Retirer l’option {n}',
  settingsLabel: 'Paramètres',
  resultsVisibilityLabel: 'Résultats visibles après la clôture',
  resultsVisibilityHint: 'Les membres ne verront les résultats qu’une fois le vote clos.',
  notifyLabel: 'Notifier par e-mail',
  notifyHint: 'Envoyer une invitation à voter à tous les membres.',
  closesAtLabel: 'Date de clôture',
  saveDraft: 'Sauver le brouillon',
  publish: 'Publier',
  footerHint: 'Les membres seront notifiés à la publication.',
  next: 'Continuer',
  back: 'Retour',
}

export interface PollCreateFormProps {
  /** Soumission. action = bouton cliqué ('draft' | 'publish'). */
  onSubmit: (payload: PollCreatePayload, action: PollCreateAction) => void
  /** Copy/a11y (i18n). Défauts FR. */
  labels?: PollCreateLabels
  className?: string
}

const MIN_OPTIONS = 2

export function PollCreateForm({ onSubmit, labels, className }: PollCreateFormProps) {
  const t = { ...DEFAULTS, ...labels }
  const typeCards = DEFAULT_TYPES.map((c) => ({
    ...c,
    label: labels?.types?.[c.type]?.label ?? c.label,
    hint: labels?.types?.[c.type]?.hint ?? c.hint,
  }))

  const [step, setStep] = React.useState<1 | 2>(1)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [questionType, setQuestionType] = React.useState<PollFormQuestionType>('single_choice')
  const [options, setOptions] = React.useState<string[]>(['', ''])
  const [resultsAfterClose, setResultsAfterClose] = React.useState(true)
  const [notifyByEmail, setNotifyByEmail] = React.useState(false)
  const [closesAt, setClosesAt] = React.useState('')

  const needsOptions = questionType === 'single_choice' || questionType === 'multiple_choice'

  const titleId = React.useId()
  const descId = React.useId()
  const dateId = React.useId()

  const step1Valid = title.trim().length > 0
  const filledOptions = options.map((o) => o.trim()).filter(Boolean)
  const step2Valid = !needsOptions || filledOptions.length >= MIN_OPTIONS

  const buildPayload = (): PollCreatePayload => ({
    title: title.trim(),
    description: description.trim(),
    questionType,
    options: needsOptions ? filledOptions : [],
    resultsVisibility: resultsAfterClose ? 'after_close' : 'live',
    notifyByEmail,
    closesAt: closesAt ? closesAt : null,
  })

  const submit = (action: PollCreateAction) => {
    if (!step1Valid || !step2Valid) return
    onSubmit(buildPayload(), action)
  }

  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (index: number) =>
    setOptions((prev) => (prev.length <= MIN_OPTIONS ? prev : prev.filter((_, i) => i !== index)))
  const setOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))

  const headerTitle =
    step === 1
      ? t.step1Title
      : t.step2Title.replace(
          '{type}',
          (typeCards.find((c) => c.type === questionType)?.label ?? '').toLowerCase()
        )

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className={cn('mx-auto w-full max-w-[640px]', className)}
      aria-label={t.step1Title}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-ter">{t.eyebrow}</p>
      <h1 className="mt-1 font-display text-[24px] font-extrabold leading-tight text-text">
        {headerTitle}
      </h1>

      {/* ── Step 1 : intitulé + description + type-cards ─────────────────── */}
      {step === 1 && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor={titleId}
              className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-ter"
            >
              {t.titleLabel}
            </label>
            <Input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={descId}
              className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-ter"
            >
              {t.descriptionLabel}
            </label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              className={cn(
                'block min-h-[88px] w-full resize-y rounded-[10px] p-3',
                'border border-border bg-card text-[14px] text-text placeholder:text-text-ter',
                'focus:outline-none focus-visible:shadow-[var(--sh-glow)]'
              )}
            />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-ter">
              {t.typeSectionLabel}
            </legend>
            <div
              role="radiogroup"
              aria-label={t.typeSectionLabel}
              className="grid grid-cols-2 gap-3"
            >
              {typeCards.map((card) => {
                const selected = card.type === questionType
                return (
                  <button
                    key={card.type}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setQuestionType(card.type)}
                    className={cn(
                      'flex min-h-[88px] flex-col gap-1 rounded-[12px] p-4 text-left',
                      'transition-colors duration-[150ms]',
                      'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
                      selected
                        ? 'border-2 border-brand-yellow bg-brand-yellow/12'
                        : 'border border-border-strong bg-card hover:border-brand-yellow/50'
                    )}
                  >
                    <span className="font-display text-[14px] font-bold text-text">
                      {card.label}
                    </span>
                    <span className="text-[12px] text-text-sec">{card.hint}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        </div>
      )}

      {/* ── Step 2 : options (si besoin) + paramètres ────────────────────── */}
      {step === 2 && (
        <div className="mt-6 flex flex-col gap-6">
          {needsOptions && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-[15px] font-bold text-text">{t.optionsLabel}</h2>
              <ul className="flex flex-col gap-2">
                {options.map((opt, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      placeholder={t.optionPlaceholder}
                      aria-label={`${t.optionsLabel} ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={options.length <= MIN_OPTIONS}
                      aria-label={t.removeOption.replace('{n}', String(i + 1))}
                      className={cn(
                        'inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center',
                        'rounded-[var(--r-md)] text-text-ter hover:text-text',
                        'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
                        'disabled:cursor-not-allowed disabled:opacity-40'
                      )}
                    >
                      <Icon name="Trash2" size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addOption}
                className={cn(
                  'inline-flex min-h-[44px] items-center justify-center gap-2 self-start',
                  'rounded-[var(--r-md)] border border-dashed border-border-strong px-4 text-[13px] text-text-sec',
                  'transition-colors duration-[150ms] hover:text-text',
                  'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none'
                )}
              >
                <Icon name="Plus" size={16} aria-hidden="true" />
                {t.addOption}
              </button>
            </section>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-[15px] font-bold text-text">{t.settingsLabel}</h2>

            <SettingToggle
              label={t.resultsVisibilityLabel}
              hint={t.resultsVisibilityHint}
              checked={resultsAfterClose}
              onCheckedChange={setResultsAfterClose}
            />
            <SettingToggle
              label={t.notifyLabel}
              hint={t.notifyHint}
              checked={notifyByEmail}
              onCheckedChange={setNotifyByEmail}
            />

            <div className="flex flex-col gap-2">
              <label
                htmlFor={dateId}
                className="font-mono text-[12px] uppercase tracking-[0.08em] text-text-ter"
              >
                {t.closesAtLabel}
              </label>
              <Input
                id={dateId}
                type="date"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
          </section>
        </div>
      )}

      {/* ── Footer sticky : navigation + actions ─────────────────────────── */}
      <div className="sticky bottom-0 mt-8 flex flex-col gap-2 border-t border-border bg-bg-page/95 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--r-md)] px-3 text-[13px] font-semibold text-text-sec',
                'hover:text-text focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none'
              )}
            >
              <Icon name="ArrowLeft" size={16} aria-hidden="true" />
              {t.back}
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => step1Valid && setStep(2)}
                disabled={!step1Valid}
                className={cn(
                  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--r-md)] px-5',
                  'bg-brand-yellow text-accent-ink font-display text-[14px] font-bold',
                  'transition-opacity duration-[150ms] hover:opacity-90',
                  'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                {t.next}
                <Icon name="ArrowRight" size={16} aria-hidden="true" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => submit('draft')}
                  disabled={!step1Valid || !step2Valid}
                  className={cn(
                    'inline-flex min-h-[44px] items-center justify-center rounded-[var(--r-md)] px-4',
                    'border border-border-strong bg-card text-text font-display text-[14px] font-bold',
                    'transition-colors duration-[150ms] hover:bg-border/40',
                    'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-40'
                  )}
                >
                  {t.saveDraft}
                </button>
                <button
                  type="button"
                  onClick={() => submit('publish')}
                  disabled={!step1Valid || !step2Valid}
                  className={cn(
                    'inline-flex min-h-[44px] items-center justify-center rounded-[var(--r-md)] px-5',
                    'bg-brand-yellow text-accent-ink font-display text-[14px] font-bold',
                    'transition-opacity duration-[150ms] hover:opacity-90',
                    'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)] outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-40'
                  )}
                >
                  {t.publish}
                </button>
              </>
            )}
          </div>
        </div>
        {step === 2 && <p className="text-[12px] text-text-ter">{t.footerHint}</p>}
      </div>
    </form>
  )
}

interface SettingToggleProps {
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingToggle({ label, hint, checked, onCheckedChange }: SettingToggleProps) {
  const labelId = React.useId()
  const hintId = React.useId()
  // Radix Switch rend un <button role="switch"> : un <label htmlFor> ne le nomme pas
  // (un bouton n'est pas « labelable »). On le nomme explicitement via aria-labelledby.
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--r-md)] border border-border bg-card p-3">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className="text-[14px] font-semibold text-text">
          {label}
        </span>
        <span id={hintId} className="text-[12px] text-text-sec">
          {hint}
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}
