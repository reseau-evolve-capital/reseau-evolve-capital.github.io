'use client'

// InviteForm (ADM-007) — formulaire inline d'invitation d'un membre.
//
// Présentationnel : aucune logique métier/réseau. L'app passe `onSubmit(email)`,
// `isPending` (désactive le bouton) et `error` (message serveur). Validation
// d'email basique côté client (empêche l'envoi d'une adresse manifestement invalide).
// Réf : ADM-002, CLAUDE.md (a11y AA, copy FR, tokens — zéro hex).

import * as React from 'react'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import { Input } from '../../atoms/Input'
import { cn } from '../../lib/cn'

export interface InviteFormLabels {
  /** `aria-label` du champ email (pas de label visible — design inline). */
  emailLabel?: string
  /** Placeholder du champ email. */
  placeholder?: string
  /** Libellé du bouton d'envoi. */
  submit?: string
  /** Note d'information sous la ligne. */
  note?: string
  /** Message d'erreur de validation locale (email invalide). */
  invalidEmail?: string
}

const DEFAULT_LABELS: Required<InviteFormLabels> = {
  emailLabel: 'Adresse e-mail du membre à inviter',
  placeholder: 'email@exemple.fr',
  submit: "Envoyer l'invitation",
  note: 'Un lien valable 72 h sera envoyé à cette adresse.',
  invalidEmail: 'Saisis une adresse e-mail valide.',
}

export interface InviteFormProps {
  onSubmit: (email: string) => void
  /** Désactive le bouton + le champ pendant l'envoi serveur. */
  isPending?: boolean
  /** Message d'erreur serveur (ex: déjà invité). Affiché sous le champ. */
  error?: string | null
  /** Libellés (i18n). Chaque clé absente retombe sur son défaut FR. */
  labels?: InviteFormLabels
  className?: string
}

/** Validation email minimale (présence d'un « @ » avec partie locale et domaine). */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/**
 * Formulaire d'invitation inline (≠ modale). Mail icon + champ e-mail + bouton
 * sur une ligne, note d'information dessous. Validation locale + erreur serveur.
 */
export function InviteForm({
  onSubmit,
  isPending = false,
  error,
  labels,
  className,
}: InviteFormProps) {
  const t = { ...DEFAULT_LABELS, ...labels }
  const [email, setEmail] = React.useState('')
  const [localError, setLocalError] = React.useState<string | null>(null)

  const errorId = React.useId()
  const noteId = React.useId()
  const shownError = localError ?? error ?? null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isPending) return
    if (!isValidEmail(email)) {
      setLocalError(t.invalidEmail)
      return
    }
    setLocalError(null)
    onSubmit(email.trim())
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-ter"
            aria-hidden="true"
          >
            <Icon name="Mail" size={16} />
          </span>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            disabled={isPending}
            onChange={(e) => {
              setEmail(e.target.value)
              if (localError) setLocalError(null)
            }}
            placeholder={t.placeholder}
            aria-label={t.emailLabel}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? errorId : noteId}
            className="pl-9"
          />
        </div>
        <Button type="submit" isLoading={isPending} disabled={isPending} className="sm:shrink-0">
          {t.submit}
        </Button>
      </div>

      {shownError ? (
        <p id={errorId} role="alert" aria-live="polite" className="text-[12px] text-data-negative">
          {shownError}
        </p>
      ) : (
        <p id={noteId} className="text-[12px] text-text-ter">
          {t.note}
        </p>
      )}
    </form>
  )
}
