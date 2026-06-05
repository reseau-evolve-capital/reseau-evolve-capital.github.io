'use client'

// EditMemberEmailModal — renseigner / corriger l'email d'un membre (sortants importés sans
// email = placeholder, cf. migration 026). Opération SENSIBLE (impacte l'identité et le
// matching feuille → user), mais réversible : une confirmation simple suffit (un message
// clair + un seul geste), pas la double-confirmation du SensitiveConfirmModal.
//
// Radix Dialog (focus-trap, Escape, Title + Description requis). Un seul champ email
// (FormField → label + aria-describedby + aria-invalid). Le bouton de confirmation est
// désactivé tant que le champ est vide. L'erreur d'unicité (« email déjà utilisé ») est
// affichée inline via la prop `error` (remontée par l'app après l'appel serveur).
//
// Présentationnel : zéro logique métier (validation/réseau côté app). Toutes les chaînes
// via props (i18n). Réf : LockMemberModal (pattern Dialog), CLAUDE.md (a11y AA, tokens only).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import { Input } from '../../atoms/Input'
import { FormField } from '../../molecules/FormField'
import { cn } from '../../lib/cn'

export interface EditMemberEmailModalLabels {
  /** Gabarit du titre. Reçoit le nom du membre. */
  title?: (memberName: string) => string
  /** Paragraphe explicatif. */
  description?: string
  /** Label du champ email. */
  emailLabel?: string
  /** Placeholder du champ email. */
  emailPlaceholder?: string
  /** Texte d'aide sous le champ. */
  emailHelp?: string
  /** Bouton « Annuler ». */
  cancel?: string
  /** Bouton de confirmation. */
  confirm?: string
  /** aria-label du bouton fermer. */
  close?: string
}

const DEFAULT_LABELS: Required<EditMemberEmailModalLabels> = {
  title: (name) => `Renseigner l'email de ${name}`,
  description:
    "Ce membre a été importé sans email (typiquement un sortant). Renseignez son email réel : il sera utilisé pour le rattacher à son compte. Aucun accès n'est ouvert automatiquement.",
  emailLabel: 'Adresse email',
  emailPlaceholder: 'prenom.nom@exemple.fr',
  emailHelp: 'L’email saisi remplace le placeholder et est préservé lors des synchronisations.',
  cancel: 'Annuler',
  confirm: 'Enregistrer',
  close: 'Fermer',
}

export interface EditMemberEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  /** Valeur initiale du champ (défaut ''). Les placeholders ne sont jamais préremplis. */
  initialEmail?: string
  /** Reçoit l'email saisi (trimé par l'app) à la confirmation. */
  onConfirm: (email: string) => void
  isPending?: boolean
  /** Message d'erreur inline (ex. « email déjà utilisé »). Affiché sous le champ. */
  error?: string
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: EditMemberEmailModalLabels
}

/**
 * Modale d'édition de l'email d'un membre (Radix Dialog). Confirmation simple :
 * un champ email + un bouton. L'app valide/persiste et peut remonter une erreur inline.
 */
export function EditMemberEmailModal({
  open,
  onOpenChange,
  memberName,
  initialEmail = '',
  onConfirm,
  isPending = false,
  error,
  labels,
}: EditMemberEmailModalProps) {
  const t = { ...DEFAULT_LABELS, ...labels }
  const [email, setEmail] = React.useState(initialEmail)
  const descId = React.useId()

  // Réinitialise le champ à la valeur initiale à chaque ouverture (jamais d'état rémanent).
  React.useEffect(() => {
    if (open) setEmail(initialEmail)
  }, [open, initialEmail])

  const trimmed = email.trim()
  const canSubmit = trimmed.length > 0 && !isPending

  const handleConfirm = () => {
    if (!canSubmit) return
    onConfirm(trimmed)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2',
            'rounded-[16px] bg-card p-6 shadow-[var(--sh-modal)]',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[220ms]',
            'focus:outline-none max-h-[90vh] overflow-y-auto'
          )}
        >
          {/* Pastille « mail » (token brand neutre — jamais le rouge brand pour une perte). */}
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-card-sub text-text-sec">
            <Icon name="Mail" size={20} aria-hidden="true" />
          </span>

          <Dialog.Title className="mt-4 font-display font-bold text-[18px] text-text">
            {t.title(memberName)}
          </Dialog.Title>
          <Dialog.Description id={descId} className="mt-2 text-[14px] text-text-sec">
            {t.description}
          </Dialog.Description>

          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            <FormField label={t.emailLabel} helpText={t.emailHelp} {...(error ? { error } : {})}>
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  disabled={isPending}
                  autoFocus
                />
              )}
            </FormField>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" disabled={isPending}>
                  {t.cancel}
                </Button>
              </Dialog.Close>
              <Button type="submit" isLoading={isPending} disabled={!canSubmit}>
                {t.confirm}
              </Button>
            </div>
          </form>

          <Dialog.Close
            aria-label={t.close}
            className="absolute top-4 right-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none"
          >
            <Icon name="X" size={16} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
