'use client'

// PollResultsView (organism) — résultats agrégés d'un vote (réf spec §2,10 + maquette
// « 4 · PollResultsView »). Présentationnel : reçoit les agrégats déjà calculés, n'expose
// JAMAIS d'identité de votant (les réponses texte sont listées sans attribution).
//
// En tête : titre du vote + badge vert « Résultats ».
// Deux modes selon `questionType` :
//   - options (yes_no / single_choice / multiple_choice) : barres de progression.
//     L'option MAJORITAIRE (pct le plus élevé) → barre dorée pleine + point ● + label
//     « OPTION MAJORITAIRE ». Les secondaires → barre dorée en opacity réduite.
//     multiple_choice : note « Les % dépassent 100 %… ».
//   - short_text : liste numérotée des réponses (sans attribution) + « … N autres réponses ».
//
// Pied : participation « X/Y membres ont voté (Z %) ». Jamais de NaN à l'écran : les pct
// affichés sont clampés/arrondis, et un état vide (`EmptyState`) couvre l'absence de données.
//
// PRÉSENTATIONNEL STRICT : aucune dépendance data/i18n. Copy via `labels` (défauts FR).
// Tokens uniquement ; le doré (brand.yellow) est l'accent légitime, vert = data-positive.

import * as React from 'react'

import { Badge } from '../../atoms/Badge'
import { EmptyState } from '../../molecules/EmptyState'
import { cn } from '../../lib/cn'

export type PollResultsQuestionType = 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'

export interface PollResultRow {
  /** Libellé de l'option. */
  label: string
  /** Pourcentage (0–100) déjà calculé. */
  pct: number
}

export interface PollResultsLabels {
  /** Badge « Résultats ». */
  results?: string
  /** Label de l'option majoritaire. */
  majority?: string
  /** Note des choix multiples (somme > 100 %). */
  multipleHint?: string
  /** Gabarit « … {count} autres réponses » (short_text). */
  moreResponses?: string
  /** aria-label de la liste des réponses texte. */
  responsesLabel?: string
  /** EmptyState (aucune donnée). */
  empty?: { title?: string; description?: string }
}

const DEFAULTS = {
  results: 'Résultats',
  majority: 'Option majoritaire',
  multipleHint: 'Les % dépassent 100 % car les réponses sont multiples.',
  moreResponses: '… {count} autres réponses',
  responsesLabel: 'Réponses reçues',
  empty: {
    title: 'Aucun résultat',
    description: 'Aucune réponse n’a encore été enregistrée pour ce vote.',
  },
}

export interface PollResultsViewProps {
  /** Titre du vote. */
  title: string
  /** Type de question — pilote l'affichage (barres vs liste de textes). */
  questionType: PollResultsQuestionType
  /** Résultats par option (questions à options). */
  rows?: PollResultRow[]
  /** Réponses texte (short_text), déjà anonymisées (sans attribution). */
  textResponses?: string[]
  /** Pied de participation déjà formaté (ex. « 12/12 membres ont voté (100 %) »). */
  participation?: string
  /** Copy/a11y (i18n). Défauts FR. */
  labels?: PollResultsLabels
  className?: string
}

/** Clamp + arrondi défensif : jamais de NaN/valeur hors borne à l'écran. */
function safePct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function PollResultsView({
  title,
  questionType,
  rows,
  textResponses,
  participation,
  labels,
  className,
}: PollResultsViewProps) {
  const t = {
    ...DEFAULTS,
    ...labels,
    empty: { ...DEFAULTS.empty, ...labels?.empty },
  }

  const isText = questionType === 'short_text'
  const isMultiple = questionType === 'multiple_choice'

  const header = (
    <div className="flex items-start justify-between gap-3">
      <h2 className="font-display text-[18px] font-extrabold leading-tight text-text">{title}</h2>
      <Badge variant="success">{t.results}</Badge>
    </div>
  )

  const footer = <p className="mt-5 text-[13px] text-text-sec">{participation ?? '—'}</p>

  // ── short_text : liste numérotée sans attribution ─────────────────────────
  if (isText) {
    const responses = textResponses ?? []
    if (responses.length === 0) {
      return (
        <div className={cn('rounded-[14px] border border-border bg-card p-6', className)}>
          {header}
          <EmptyState title={t.empty.title} description={t.empty.description} className="mt-4" />
          {footer}
        </div>
      )
    }
    const VISIBLE = 3
    const shown = responses.slice(0, VISIBLE)
    const remaining = responses.length - shown.length
    return (
      <div className={cn('rounded-[14px] border border-border bg-card p-6', className)}>
        {header}
        <ol className="mt-4 flex flex-col gap-3" aria-label={t.responsesLabel}>
          {shown.map((resp, i) => (
            <li key={i} className="flex items-start gap-3 rounded-[var(--r-md)] bg-card-sub p-3">
              <span
                aria-hidden="true"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-yellow/16 font-mono text-[12px] font-bold text-text"
              >
                {i + 1}
              </span>
              <span className="text-[14px] text-text">{resp}</span>
            </li>
          ))}
        </ol>
        {remaining > 0 && (
          <p className="mt-3 text-[13px] text-text-ter">
            {t.moreResponses.replace('{count}', String(remaining))}
          </p>
        )}
        {footer}
      </div>
    )
  }

  // ── options : barres de progression ───────────────────────────────────────
  const data = rows ?? []
  if (data.length === 0) {
    return (
      <div className={cn('rounded-[14px] border border-border bg-card p-6', className)}>
        {header}
        <EmptyState title={t.empty.title} description={t.empty.description} className="mt-4" />
        {footer}
      </div>
    )
  }

  // Option majoritaire = pct max (1ère occurrence).
  const maxPct = data.reduce((m, r) => Math.max(m, safePct(r.pct)), 0)
  let majorityMarked = false

  return (
    <div className={cn('rounded-[14px] border border-border bg-card p-6', className)}>
      {header}
      <ul className="mt-5 flex flex-col gap-4">
        {data.map((row, i) => {
          const pct = safePct(row.pct)
          const isMajority = !majorityMarked && pct === maxPct && pct > 0
          if (isMajority) majorityMarked = true
          return (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-text">{row.label}</span>
                  {isMajority && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-ter">
                      <span aria-hidden="true" className="text-brand-yellow">
                        ●
                      </span>
                      {t.majority}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-display text-[14px] font-bold text-text [font-feature-settings:'tnum']">
                  {pct} %
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${row.label} : ${pct} %`}
                className="mt-1.5 h-2.5 w-full overflow-hidden rounded-pill bg-border"
              >
                <div
                  className={cn(
                    'h-full rounded-pill bg-brand-yellow transition-[width] duration-[220ms] ease-out motion-reduce:transition-none',
                    !isMajority && 'opacity-50'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {isMultiple && <p className="mt-3 text-[12px] text-text-ter">{t.multipleHint}</p>}
      {footer}
    </div>
  )
}
