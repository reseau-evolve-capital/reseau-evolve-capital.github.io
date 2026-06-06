'use client'

// LockMemberModal (ADM-007) — modale de confirmation blocage / déblocage d'un membre.
//
// Radix Dialog (focus-trap, Escape, Title + Description requis). Deux modes :
//  - lock   : icône cadenas (token negative), raison optionnelle (Select), CTA destructif
//             « Bloquer l'accès » (Button danger). « Autre » révèle un champ libre.
//  - unlock : confirmation simple (pas de raison), CTA « Débloquer » (Button danger neutre).
//
// La raison choisie (string) — ou la saisie libre, ou null — est passée à onConfirm.
// Présentationnel : zéro logique métier. Réf : PositionDetailModal, CLAUDE.md.

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import { Input } from '../../atoms/Input'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
} from '../../atoms/Select'
import { cn } from '../../lib/cn'

export type LockMemberMode = 'lock' | 'unlock'

/** Clé interne d'une raison de blocage (stable, indépendante de l'i18n). */
export type LockReasonKey = 'unpaid' | 'left_club' | 'suspended' | 'other'

const REASON_KEYS: readonly LockReasonKey[] = ['unpaid', 'left_club', 'suspended', 'other']

export interface LockMemberModalLabels {
  /** Gabarit du titre en mode lock. Reçoit le nom du membre. */
  lockTitle?: (memberName: string) => string
  /** Gabarit du titre en mode unlock. Reçoit le nom du membre. */
  unlockTitle?: (memberName: string) => string
  /** Paragraphe explicatif (mode lock). */
  lockDescription?: string
  /** Paragraphe explicatif (mode unlock). */
  unlockDescription?: string
  /** Label du champ raison. */
  reasonLabel?: string
  /** Placeholder du Select de raison. */
  reasonPlaceholder?: string
  /** Libellés des options de raison. */
  reasons?: Partial<Record<LockReasonKey, string>>
  /** Placeholder du champ libre (raison « Autre »). */
  otherPlaceholder?: string
  /** aria-label du champ libre (raison « Autre »). */
  otherLabel?: string
  /** Bouton « Annuler ». */
  cancel?: string
  /** Bouton de confirmation en mode lock. */
  confirmLock?: string
  /** Bouton de confirmation en mode unlock. */
  confirmUnlock?: string
  /** aria-label du bouton fermer. */
  close?: string
}

const DEFAULT_LABELS: Required<Omit<LockMemberModalLabels, 'reasons'>> & {
  reasons: Record<LockReasonKey, string>
} = {
  lockTitle: (name) => `Bloquer l'accès de ${name} ?`,
  unlockTitle: (name) => `Débloquer l'accès de ${name} ?`,
  lockDescription:
    "Cette personne sera déconnectée immédiatement et ne pourra plus accéder à l'espace membre jusqu'au déblocage. Cette action est réversible.",
  unlockDescription:
    "Cette personne pourra de nouveau se connecter et accéder à l'espace membre immédiatement.",
  reasonLabel: 'Raison (optionnel)',
  reasonPlaceholder: 'Choisir une raison',
  reasons: {
    unpaid: 'Impayé',
    left_club: 'Départ du club',
    suspended: 'Suspendu temporairement',
    other: 'Autre',
  },
  otherPlaceholder: 'Préciser la raison…',
  otherLabel: 'Préciser la raison du blocage',
  cancel: 'Annuler',
  confirmLock: "Bloquer l'accès",
  confirmUnlock: 'Débloquer',
  close: 'Fermer',
}

export interface LockMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  /** Défaut 'lock'. */
  mode?: LockMemberMode
  /** Reçoit la raison choisie (libellé), la saisie libre, ou null si aucune. */
  onConfirm: (reason: string | null) => void
  isPending?: boolean
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: LockMemberModalLabels
}

/**
 * Modale blocage/déblocage (Radix Dialog). En mode lock, propose une raison
 * optionnelle ; « Autre » révèle un champ libre. La raison résolue (string|null)
 * est remontée via onConfirm.
 */
export function LockMemberModal({
  open,
  onOpenChange,
  memberName,
  mode = 'lock',
  onConfirm,
  isPending = false,
  labels,
}: LockMemberModalProps) {
  const t = {
    ...DEFAULT_LABELS,
    ...labels,
    reasons: { ...DEFAULT_LABELS.reasons, ...labels?.reasons },
  }
  const isLock = mode === 'lock'

  const [reasonKey, setReasonKey] = React.useState<LockReasonKey | ''>('')
  const [otherText, setOtherText] = React.useState('')

  // Réinitialise l'état du formulaire à chaque ouverture/fermeture.
  React.useEffect(() => {
    if (!open) {
      setReasonKey('')
      setOtherText('')
    }
  }, [open])

  const descId = React.useId()

  /** Raison résolue passée à onConfirm. */
  const resolvedReason = (): string | null => {
    if (!isLock || reasonKey === '') return null
    if (reasonKey === 'other') {
      const trimmed = otherText.trim()
      return trimmed.length > 0 ? trimmed : t.reasons.other
    }
    return t.reasons[reasonKey]
  }

  const handleConfirm = () => {
    if (isPending) return
    onConfirm(resolvedReason())
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
          {/* Icône cadenas dans une pastille teintée (token negative — jamais le rouge brand). */}
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-data-negative-50 text-data-negative">
            <Icon name={isLock ? 'Lock' : 'LockOpen'} size={20} aria-hidden="true" />
          </span>

          <Dialog.Title className="mt-4 font-display font-bold text-[18px] text-text">
            {isLock ? t.lockTitle(memberName) : t.unlockTitle(memberName)}
          </Dialog.Title>
          <Dialog.Description id={descId} className="mt-2 text-[14px] text-text-sec">
            {isLock ? t.lockDescription : t.unlockDescription}
          </Dialog.Description>

          {isLock && (
            <div className="mt-5 flex flex-col gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-text-ter">
                {t.reasonLabel}
              </span>
              <SelectRoot
                value={reasonKey === '' ? undefined : reasonKey}
                onValueChange={(v) => setReasonKey(v as LockReasonKey)}
              >
                <SelectTrigger aria-label={t.reasonLabel}>
                  <SelectValue placeholder={t.reasonPlaceholder} />
                </SelectTrigger>
                <SelectPortal>
                  <SelectContent>
                    {REASON_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t.reasons[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPortal>
              </SelectRoot>

              {reasonKey === 'other' && (
                <Input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder={t.otherPlaceholder}
                  aria-label={t.otherLabel}
                  className="mt-1"
                />
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={isPending}>
                {t.cancel}
              </Button>
            </Dialog.Close>
            <Button
              variant="danger"
              onClick={handleConfirm}
              isLoading={isPending}
              disabled={isPending}
            >
              {isLock ? t.confirmLock : t.confirmUnlock}
            </Button>
          </div>

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
