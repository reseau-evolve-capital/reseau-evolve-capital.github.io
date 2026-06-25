'use client'

// OperationCancelModal (organism) — modale d'annulation avec motif obligatoire.
// Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §5 (CancelModal).
//
// Radix Dialog centré (focus-trap, Escape, overlay clic-ferme, Title + Description auto-câblés).
// PRÉSENTATIONNEL STRICT : zéro dépendance @evolve/data. `onConfirm(reason)` reçoit le motif.
// Le bouton « Confirmer l'annulation » reste DÉSACTIVÉ tant que le motif est vide/blanc.
// Le motif est réinitialisé à chaque fermeture (jamais d'état rémanent).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { signedEURWhole } from '@evolve/utils'

import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export interface OperationCancelModalLabels {
  title?: string
  /** Gabarit du résumé ; {label} et {amount} sont remplacés. */
  summary?: string
  reasonLabel?: string
  reasonPlaceholder?: string
  reasonHint?: string
  keepButton?: string
  confirmButton?: string
  close?: string
}

export interface OperationCancelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Libellé de l'opération concernée (pour le résumé). */
  operationLabel: string
  /** Montant signé de l'opération (pour le résumé). */
  amount: number
  /** Appelé avec le motif (non vide) à la confirmation. */
  onConfirm: (reason: string) => void
  isPending?: boolean
  labels?: OperationCancelModalLabels
}

const DEFAULTS: Required<OperationCancelModalLabels> = {
  title: 'Annuler cette opération ?',
  summary:
    "L'opération {label} · {amount} ne comptera plus dans le solde. Elle reste visible dans l'historique, barrée, avec son motif.",
  reasonLabel: "Motif de l'annulation",
  reasonPlaceholder: 'ex. Doublon de saisie, montant erroné…',
  reasonHint: "Obligatoire — conservé dans la trace de l'opération.",
  keepButton: "Garder l'opération",
  confirmButton: "Confirmer l'annulation",
  close: 'Fermer',
}

export function OperationCancelModal({
  open,
  onOpenChange,
  operationLabel,
  amount,
  onConfirm,
  isPending = false,
  labels,
}: OperationCancelModalProps) {
  const t = { ...DEFAULTS, ...labels }
  const [reason, setReason] = React.useState('')
  const descId = React.useId()
  const reasonId = React.useId()
  const hintId = React.useId()

  React.useEffect(() => {
    if (!open) setReason('')
  }, [open])

  const canConfirm = reason.trim().length > 0 && !isPending

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(reason.trim())
  }

  const summary = t.summary
    .replace('{label}', operationLabel)
    .replace('{amount}', signedEURWhole(amount))

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[var(--overlay)] motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={cn(
            'fixed left-1/2 top-1/2 z-[90] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
            'overflow-hidden rounded-lg border border-border bg-card shadow-modal focus:outline-none'
          )}
        >
          {/* Header */}
          <div className="px-6 pt-6">
            <span className="mb-4 inline-flex h-[46px] w-[46px] items-center justify-center rounded-pill bg-data-warning-50 text-data-warning">
              <Icon name="TriangleAlert" size={24} aria-hidden="true" />
            </span>
            <Dialog.Title className="font-display text-[21px] font-extrabold tracking-[-0.02em] text-text">
              {t.title}
            </Dialog.Title>
            <Dialog.Description
              id={descId}
              className="mt-2 text-[14px] leading-relaxed text-text-sec"
            >
              {summary}
            </Dialog.Description>
          </div>

          {/* Champ motif */}
          <div className="px-6 py-[18px]">
            <label
              htmlFor={reasonId}
              className="font-body text-[12px] font-semibold uppercase tracking-[0.05em] text-text-ter"
            >
              {t.reasonLabel} <span className="text-data-negative">*</span>
            </label>
            <textarea
              id={reasonId}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              aria-label={t.reasonLabel}
              aria-describedby={hintId}
              aria-required="true"
              className={cn(
                'mt-2 w-full resize-y rounded-md border border-border-strong bg-card px-[15px] py-[13px]',
                'text-[16px] md:text-[14px] text-text placeholder:text-text-ter',
                'focus:border-brand-yellow focus:shadow-glow focus:outline-none'
              )}
            />
            <p id={hintId} className="mt-2 text-[12.5px] text-text-ter">
              {t.reasonHint}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 border-t border-border bg-card-sub px-6 py-4">
            <Dialog.Close className="inline-flex min-h-11 items-center justify-center rounded-pill border border-border-strong bg-card px-[22px] font-body text-[14px] font-bold text-text transition-transform duration-150 hover:border-text-ter active:scale-[0.985] focus-visible:outline-none focus-visible:shadow-glow">
              {t.keepButton}
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              aria-disabled={!canConfirm}
              className={cn(
                'inline-flex min-h-11 items-center justify-center rounded-pill bg-data-negative px-[22px]',
                'font-body text-[14px] font-bold text-white transition-transform duration-150',
                'hover:opacity-95 active:scale-[0.985] focus-visible:outline-none focus-visible:shadow-glow',
                'disabled:cursor-not-allowed disabled:opacity-50',
                '[html[data-theme=dark]_&]:text-neutral-1000'
              )}
            >
              {t.confirmButton}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
