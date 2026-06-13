'use client'

// FeedbackSheet — widget « un retour à partager ? » (bug / idée / question).
//
// Modale centrée sur scrim au-dessus du dashboard (desktop 480px) / bottom-sheet ancré
// bas (mobile, grab-handle). 5 états : idle | (idle avec images) | loading | success | error.
//
// PRÉSENTATIONNEL STRICT (CLAUDE.md) : packages/ui ne dépend JAMAIS d'i18n, de
// packages/data, ni de html2canvas. Toute la copy arrive par props (`labels`) avec des
// défauts FR tutoiement.
//
// Pièces jointes : l'utilisateur joint SES PROPRES images (jusqu'à 3). Le bouton « Joindre »
// déclenche un <input type="file" accept="image/*" multiple hidden> et les fichiers sont lus
// en data URLs via FileReader (API navigateur pure — OK en 'use client', aucune dép externe).
// Plus AUCUNE capture automatique (l'ancien flow onCaptureScreenshot / html2canvas est retiré).
// Le composant capture `window.location.href` + `navigator.userAgent` au submit.
//
// Tokens uniquement, jamais de hex en dur. État error = tokens dataviz `data-negative`
// (bg-data-negative-50, border-l --data-negative, texte --data-negative-strong) — JAMAIS
// le rouge brand (#E93E3A = branding only). Radix Dialog (focus-trap, Escape, Title +
// Description requis). A11y AA : focus glow, cibles ≥44×44, clavier, prefers-reduced-motion.
//
// Réf visuelle : « FeedbackSheet — Maquettes (standalone) » (toggle light/dark).
// Réf code : EditMemberEmailModal (API Dialog + labels mergés), PwaInstallSheet (anim, spinner).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export type FeedbackType = 'bug' | 'feature' | 'question'

/** Nombre maximum d'images jointes. Le surplus est ignoré proprement (pas de crash). */
export const MAX_FEEDBACK_IMAGES = 3

export interface FeedbackSubmission {
  type: FeedbackType
  message: string
  /** Jusqu'à 3 data URLs d'images chargées par l'utilisateur (remplace screenshotDataUrl). */
  imageDataUrls?: string[]
  pageUrl: string
  pageRoute: string
  userAgent: string
}

/**
 * Chaînes user-facing + a11y (i18n). Tout est optionnel — défauts FR tutoiement.
 * apps/web (LOT D) fournit les valeurs fr/en. Clés relatives aux pièces jointes :
 *  - `attach`      : libellé du bouton « Joindre » (déclenche le sélecteur de fichiers).
 *  - `attachMax`   : hint affiché quand 3 images sont jointes (bouton masqué).
 *  - `attached`    : texte SR/badge « Image jointe » sur une vignette.
 *  - `remove`      : libellé visible du bouton retirer.
 *  - `removeImage` : modèle d'aria-label paramétrable, « {n} » remplacé par l'index 1-based.
 *  - `privacyNote` : mention vie privée (plurielle, honnête — pas de claim de floutage).
 */
export interface FeedbackLabels {
  /** Titre de l'en-tête. */
  title?: string
  /** Sous-titre de l'en-tête. */
  subtitle?: string
  /** aria-label du bouton fermer (X). */
  close?: string
  /** Libellés des 3 pills de type. */
  types?: Partial<Record<FeedbackType, string>>
  /** aria-label du groupe de pills (non visible). */
  typeLabel?: string
  /** Label du champ message (« TON MESSAGE »). */
  messageLabel?: string
  /** Placeholders par type. */
  placeholders?: Partial<Record<FeedbackType, string>>
  /** Bouton joindre des images (déclenche le sélecteur de fichiers natif). */
  attach?: string
  /** Hint affiché quand le maximum d'images est atteint (ex. « 3 images maximum »). */
  attachMax?: string
  /** Texte SR/badge sur chaque vignette (« Image jointe »). */
  attached?: string
  /** Libellé visible du bouton « Retirer » une image. */
  remove?: string
  /** Modèle d'aria-label du bouton retirer ; « {n} » → index 1-based de l'image. */
  removeImage?: string
  /** Mention vie privée sous les vignettes (plurielle, honnête — pas de claim « floutées »). */
  privacyNote?: string
  /** Label de la clé route dans l'encart contexte (« Route capturée »). */
  contextLabel?: string
  /** CTA d'envoi. */
  submit?: string
  /** Libellé du CTA pendant l'envoi. */
  sending?: string
  /** Écran de succès. */
  success?: {
    title?: string
    subtitle?: string
    pill?: string
    close?: string
  }
  /** Écran d'erreur. */
  error?: {
    title?: string
    retry?: string
  }
}

interface ResolvedLabels {
  title: string
  subtitle: string
  close: string
  types: Record<FeedbackType, string>
  typeLabel: string
  messageLabel: string
  placeholders: Record<FeedbackType, string>
  attach: string
  attachMax: string
  attached: string
  remove: string
  removeImage: string
  privacyNote: string
  contextLabel: string
  submit: string
  sending: string
  success: { title: string; subtitle: string; pill: string; close: string }
  error: { title: string; retry: string }
}

const DEFAULTS: ResolvedLabels = {
  title: 'Un retour à partager ?',
  subtitle: 'Bug, idée ou question — on lit chaque message.',
  close: 'Fermer',
  types: { bug: 'Bug', feature: 'Idée', question: 'Question' },
  typeLabel: 'Type de retour',
  messageLabel: 'Ton message',
  placeholders: {
    bug: 'Décris ce que tu as constaté…',
    feature: 'Décris ton idée…',
    question: 'Pose ta question…',
  },
  attach: 'Joindre des images (optionnel)',
  attachMax: '3 images maximum',
  attached: 'Image jointe',
  remove: 'Retirer',
  removeImage: 'Retirer l’image {n}',
  privacyNote: 'Ces images seront partagées uniquement avec l’équipe technique.',
  contextLabel: 'Route capturée',
  submit: 'Envoyer →',
  sending: 'Envoi…',
  success: {
    title: 'Merci pour ton retour.',
    subtitle: "On l'a bien reçu. On revient vers toi par e-mail si on a besoin d'une précision.",
    pill: 'Vérifie ta boîte mail',
    close: 'Fermer',
  },
  error: { title: "L'envoi a échoué.", retry: 'Réessayer' },
}

/** Merge profond léger (un seul niveau pour success/types/placeholders/error). */
function resolveLabels(labels?: FeedbackLabels): ResolvedLabels {
  return {
    ...DEFAULTS,
    ...labels,
    types: { ...DEFAULTS.types, ...labels?.types },
    placeholders: { ...DEFAULTS.placeholders, ...labels?.placeholders },
    success: { ...DEFAULTS.success, ...labels?.success },
    error: { ...DEFAULTS.error, ...labels?.error },
  }
}

export interface FeedbackSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Route lisible affichée dans l'encart contexte (ex. « /portefeuille · 18.04 »). */
  currentRoute: string
  /** Appelé au submit. Résout → success, rejette → error (type+message+images conservés). */
  onSubmit: (data: FeedbackSubmission) => Promise<void>
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR tutoiement. */
  labels?: FeedbackLabels
}

const TYPES: readonly FeedbackType[] = ['bug', 'feature', 'question'] as const
type Phase = 'idle' | 'loading' | 'success' | 'error'

/** Lit un File image en data URL (API navigateur pure ; aucune dép externe). */
function readImageFileAsDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined)
    reader.onerror = () => resolve(undefined)
    reader.readAsDataURL(file)
  })
}

/** Spinner inline (largeur du CTA conservée pendant le loading). */
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

/** CTA outline pleine largeur (envoyer / fermer / réessayer). Focus glow, ≥44px. */
const outlineCta = cn(
  'inline-flex w-full items-center justify-center gap-2 rounded-[var(--r-md)]',
  'border border-border-strong bg-card-sub text-text',
  'font-display text-[14px] font-bold uppercase tracking-wide',
  'transition-colors duration-[150ms] hover:bg-border/40',
  'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
  'disabled:cursor-not-allowed disabled:opacity-40'
)

export function FeedbackSheet({
  open,
  onOpenChange,
  currentRoute,
  onSubmit,
  labels,
}: FeedbackSheetProps) {
  const t = resolveLabels(labels)
  const descId = React.useId()

  const [type, setType] = React.useState<FeedbackType>('feature')
  const [message, setMessage] = React.useState('')
  const [images, setImages] = React.useState<string[]>([])
  const [phase, setPhase] = React.useState<Phase>('idle')
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Réinitialise tout l'état à chaque (ré)ouverture — jamais d'état rémanent.
  React.useEffect(() => {
    if (open) {
      setType('feature')
      setMessage('')
      setImages([])
      setPhase('idle')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  const trimmed = message.trim()
  const canSubmit = trimmed.length > 0 && phase !== 'loading'
  const isLoading = phase === 'loading'

  // Clic sur « Joindre » → ouvre le sélecteur de fichiers natif.
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Lecture des fichiers choisis → data URLs, cap à MAX_FEEDBACK_IMAGES (surplus ignoré).
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const remaining = MAX_FEEDBACK_IMAGES - images.length
    if (remaining <= 0) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const picked = Array.from(fileList).slice(0, remaining)
    const dataUrls = await Promise.all(picked.map(readImageFileAsDataUrl))
    const valid = dataUrls.filter((u): u is string => typeof u === 'string')
    if (valid.length > 0) {
      setImages((prev) => [...prev, ...valid].slice(0, MAX_FEEDBACK_IMAGES))
    }
    // Réinitialise l'input pour autoriser la re-sélection du même fichier.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImageAt = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setPhase('loading')
    try {
      await onSubmit({
        type,
        message: trimmed,
        ...(images.length > 0 ? { imageDataUrls: images } : {}),
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        pageRoute: currentRoute,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      })
      setPhase('success')
    } catch {
      // Conserve type + message + images pour le « Réessayer » (re-rempli).
      setPhase('error')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={cn(
            'fixed z-50 bg-card shadow-[var(--sh-modal)] focus:outline-none',
            // Mobile : bottom-sheet ancré bas, coins sup. arrondis.
            'inset-x-0 bottom-0 w-full rounded-t-[var(--r-lg)] border border-border',
            'px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))]',
            // Desktop : modale centrée 480px, tous coins arrondis, padding 28px.
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
            <SuccessView labels={t} onClose={() => onOpenChange(false)} descId={descId} />
          ) : (
            <FormView
              labels={t}
              descId={descId}
              type={type}
              setType={setType}
              message={message}
              setMessage={setMessage}
              images={images}
              onRemoveImage={removeImageAt}
              fileInputRef={fileInputRef}
              onOpenFilePicker={openFilePicker}
              onFilesSelected={handleFilesSelected}
              currentRoute={currentRoute}
              phase={phase}
              isLoading={isLoading}
              canSubmit={canSubmit}
              onSubmit={handleSubmit}
              onRetry={() => setPhase('idle')}
            />
          )}

          {/* Bouton fermer (X) — masqué en success (le CTA « Fermer » fait foi). */}
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

interface FormViewProps {
  labels: ResolvedLabels
  descId: string
  type: FeedbackType
  setType: (t: FeedbackType) => void
  message: string
  setMessage: (m: string) => void
  images: string[]
  onRemoveImage: (index: number) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onOpenFilePicker: () => void
  onFilesSelected: (files: FileList | null) => void
  currentRoute: string
  phase: Phase
  isLoading: boolean
  canSubmit: boolean
  onSubmit: () => void
  onRetry: () => void
}

function FormView({
  labels: t,
  descId,
  type,
  setType,
  message,
  setMessage,
  images,
  onRemoveImage,
  fileInputRef,
  onOpenFilePicker,
  onFilesSelected,
  currentRoute,
  phase,
  isLoading,
  canSubmit,
  onSubmit,
  onRetry,
}: FormViewProps) {
  const msgId = React.useId()
  // Pendant le loading, le formulaire est figé (opacity + pointer-events).
  const frozen = isLoading
  const hasImages = images.length > 0
  const atMax = images.length >= MAX_FEEDBACK_IMAGES

  return (
    <>
      <Dialog.Title className="font-display text-[20px] font-extrabold leading-tight text-text">
        {t.title}
      </Dialog.Title>
      <Dialog.Description id={descId} className="mt-1 text-[13px] text-text-sec">
        {t.subtitle}
      </Dialog.Description>

      {/* Bandeau d'erreur (au-dessus du formulaire). Tokens data-negative. */}
      {phase === 'error' && (
        <div
          role="alert"
          className={cn(
            'mt-4 flex items-start gap-2 rounded-[var(--r-md)] border-l-[3px] p-3',
            'border-[var(--data-negative)] bg-data-negative-50 text-[var(--data-negative-strong)]'
          )}
        >
          <Icon name="TriangleAlert" size={20} aria-hidden="true" className="mt-px" />
          <span className="text-[13px] font-medium">{t.error.title}</span>
        </div>
      )}

      <div
        className={cn(frozen && 'pointer-events-none select-none opacity-50')}
        aria-hidden={frozen || undefined}
      >
        {/* Sélecteur de type : 3 pills. */}
        <div className="mt-5 flex gap-2" role="group" aria-label={t.typeLabel}>
          {TYPES.map((tp) => {
            const selected = tp === type
            return (
              <button
                key={tp}
                type="button"
                aria-pressed={selected}
                onClick={() => setType(tp)}
                className={cn(
                  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-[var(--r-pill)] px-3',
                  'border font-display text-[13px] font-bold',
                  'transition-colors duration-[150ms]',
                  'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
                  selected
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-border-strong text-text-sec hover:text-text'
                )}
              >
                {t.types[tp]}
              </button>
            )
          })}
        </div>

        {/* Label + textarea. */}
        <label
          htmlFor={msgId}
          className="mt-5 block font-mono text-[12px] uppercase tracking-[0.08em] text-text-ter"
        >
          {t.messageLabel}
        </label>
        <textarea
          id={msgId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.placeholders[type]}
          disabled={frozen}
          className={cn(
            'mt-2 block w-full resize-y rounded-[var(--r-md)] p-3',
            hasImages ? 'min-h-[72px]' : 'min-h-[120px]',
            // text-[16px] sur mobile : empêche le zoom auto iOS Safari/Chrome au focus (< 16px) ; 14px ≥ md.
            'border border-border-strong bg-card-sub text-[16px] text-text placeholder:text-text-ter md:text-[14px]',
            'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
          )}
        />

        {/* Input fichier natif (caché) — déclenché par le bouton « Joindre ». */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => onFilesSelected(e.target.files)}
        />

        {/* Vignettes des images jointes (grille jusqu'à 3 colonnes). */}
        {hasImages && (
          <div className="mt-4">
            <ul className="grid grid-cols-3 gap-2">
              {images.map((src, index) => (
                <li
                  key={`${index}-${src.slice(0, 24)}`}
                  className="relative aspect-square overflow-hidden rounded-[var(--r-md)] border border-border bg-card-sub"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <span className="sr-only">{t.attached}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    aria-label={t.removeImage.replace('{n}', String(index + 1))}
                    className={cn(
                      'absolute right-1 top-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center',
                      'rounded-[var(--r-pill)] bg-card/90 text-[var(--data-negative-strong)]',
                      'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]'
                    )}
                  >
                    <Icon name="X" size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] italic text-text-ter">
              <Icon name="Lock" size={16} aria-hidden="true" />
              {t.privacyNote}
            </p>
          </div>
        )}

        {/* Bouton joindre (dashed) tant que < 3 images ; sinon hint « max ».
            role="status" annonce le changement aux lecteurs d'écran (WCAG 4.1.3 — M-001). */}
        {atMax ? (
          <p
            role="status"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-dashed border-border px-3 py-3 text-[12px] text-text-ter"
          >
            <Icon name="Image" size={16} aria-hidden="true" />
            {t.attachMax}
          </p>
        ) : (
          <button
            type="button"
            onClick={onOpenFilePicker}
            disabled={frozen}
            className={cn(
              'mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2',
              'rounded-[var(--r-md)] border border-dashed border-border-strong px-3 text-[13px] text-text-sec',
              'transition-colors duration-[150ms] hover:text-text',
              'focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Icon name="Image" size={20} aria-hidden="true" />
            {t.attach}
            {hasImages && (
              <span className="font-mono text-[12px] text-text-ter">
                {images.length}/{MAX_FEEDBACK_IMAGES}
              </span>
            )}
          </button>
        )}

        {/* Encart contexte : route capturée. */}
        <div className="mt-4 flex items-center justify-between gap-2 rounded-[var(--r-md)] border border-border bg-card-sub px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-ter">
            {t.contextLabel}
          </span>
          <span className="font-mono text-[12px] text-text-sec">{currentRoute}</span>
        </div>
      </div>

      {/* CTA : Réessayer (error) sinon Envoyer. */}
      {phase === 'error' ? (
        <button type="button" onClick={onRetry} className={cn(outlineCta, 'mt-5 min-h-[52px]')}>
          {t.error.retry}
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-busy={isLoading || undefined}
          className={cn(outlineCta, 'mt-5 min-h-[52px]')}
        >
          {isLoading ? (
            <>
              <CtaSpinner />
              {t.sending}
            </>
          ) : (
            t.submit
          )}
        </button>
      )}
    </>
  )
}

interface SuccessViewProps {
  labels: ResolvedLabels
  onClose: () => void
  descId: string
}

function SuccessView({ labels: t, onClose, descId }: SuccessViewProps) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Pastille check 56px (cercle positif). */}
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-data-positive-50 text-data-positive">
        <Icon name="Check" size={24} aria-hidden="true" />
      </span>
      <Dialog.Title className="mt-4 font-display text-[20px] font-extrabold text-text">
        {t.success.title}
      </Dialog.Title>
      <Dialog.Description id={descId} className="mt-2 max-w-[36ch] text-[13px] text-text-sec">
        {t.success.subtitle}
      </Dialog.Description>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-data-positive-50 px-3 py-1.5 text-[12px] font-medium text-data-positive">
        <Icon name="Mail" size={16} aria-hidden="true" />
        {t.success.pill}
      </span>
      <button type="button" onClick={onClose} className={cn(outlineCta, 'mt-6 min-h-[52px]')}>
        {t.success.close}
      </button>
    </div>
  )
}
