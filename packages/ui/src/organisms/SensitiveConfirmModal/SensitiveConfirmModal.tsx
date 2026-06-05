'use client'

// SensitiveConfirmModal — double-confirmation « opération sensible ».
//
// Modale Radix Dialog réutilisable pour toute action critique exigeant deux gestes
// explicites de l'utilisateur (ex. modification de l'identifiant du club chez le courtier).
// Double-confirmation = (1) ouvrir la modale + (2) cocher une case d'acquittement AVANT
// que le bouton de confirmation ne s'active. Le bouton reste désactivé tant que la case
// n'est pas cochée.
//
// Présente un résumé optionnel des changements (label/avant/après) pour que l'utilisateur
// relise ce qu'il s'apprête à modifier. Icône d'alerte dans une pastille « warning fort »
// (token --color-data-warning-strong, contrasté AA — jamais le rouge brand pour une perte).
//
// Présentationnel : zéro logique métier, toutes les chaînes via props (i18n).
// Réf : LockMemberModal (pattern), CLAUDE.md (a11y AA, tokens only, jamais de hex).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import { Checkbox } from '../../atoms/Checkbox'
import { cn } from '../../lib/cn'

/** Une ligne de résumé du changement à valider (avant → après). */
export interface SensitiveChange {
  label: string
  before: string
  after: string
}

export interface SensitiveConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Titre de la modale (ex. « Opération sensible »). */
  title: string
  /** Paragraphe explicatif du risque. */
  description: string
  /** Libellé de la case d'acquittement (2ᵉ geste de confirmation). */
  acknowledgeLabel: string
  /** Résumé optionnel des changements à relire. */
  changes?: SensitiveChange[]
  /** En-tête de la colonne « avant » du résumé (a11y/i18n). Défaut FR. */
  beforeLabel?: string
  /** En-tête de la colonne « après » du résumé (a11y/i18n). Défaut FR. */
  afterLabel?: string
  /** Appelé quand l'utilisateur confirme (case cochée + clic). */
  onConfirm: () => void
  isPending?: boolean
  /** Bouton « Annuler ». Défaut FR. */
  cancelLabel?: string
  /** Bouton de confirmation. Défaut FR. */
  confirmLabel?: string
  /** aria-label du bouton fermer. Défaut FR. */
  closeLabel?: string
}

export function SensitiveConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  acknowledgeLabel,
  changes,
  beforeLabel = 'Avant',
  afterLabel = 'Après',
  onConfirm,
  isPending = false,
  cancelLabel = 'Annuler',
  confirmLabel = 'Confirmer',
  closeLabel = 'Fermer',
}: SensitiveConfirmModalProps) {
  const [acknowledged, setAcknowledged] = React.useState(false)
  const descId = React.useId()
  const ackId = React.useId()
  const ackLabelId = React.useId()

  // Réinitialise l'acquittement à chaque fermeture (jamais de case pré-cochée à la réouverture).
  React.useEffect(() => {
    if (!open) setAcknowledged(false)
  }, [open])

  const handleConfirm = () => {
    if (isPending || !acknowledged) return
    onConfirm()
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
          {/* Pastille d'alerte (token warning fort, contrasté AA). */}
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-data-warning-50 text-data-warning-strong">
            <Icon name="TriangleAlert" size={20} aria-hidden="true" />
          </span>

          <Dialog.Title className="mt-4 font-display font-bold text-[18px] text-text">
            {title}
          </Dialog.Title>
          <Dialog.Description id={descId} className="mt-2 text-[14px] text-text-sec">
            {description}
          </Dialog.Description>

          {changes && changes.length > 0 && (
            <dl className="mt-5 flex flex-col gap-3 rounded-[10px] border border-border bg-bg p-4">
              {changes.map((c) => (
                <div key={c.label} className="flex flex-col gap-1">
                  <dt className="text-[12px] font-semibold uppercase tracking-wide text-text-ter">
                    {c.label}
                  </dt>
                  <dd className="flex flex-wrap items-center gap-2 text-[14px]">
                    <span className="text-text-sec line-through" aria-label={beforeLabel}>
                      {c.before}
                    </span>
                    <Icon
                      name="ArrowRight"
                      size={16}
                      aria-hidden="true"
                      className="text-text-ter"
                    />
                    <span className="font-semibold text-text" aria-label={afterLabel}>
                      {c.after}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* 2ᵉ geste : case d'acquittement. Le bouton reste désactivé tant qu'elle n'est pas cochée.
              aria-labelledby relie explicitement la case à son libellé (axe : button-name). */}
          <label
            htmlFor={ackId}
            className="mt-5 flex cursor-pointer items-start gap-3 rounded-[10px] border border-border p-3"
          >
            <Checkbox
              id={ackId}
              aria-labelledby={ackLabelId}
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
              className="mt-0.5"
            />
            <span id={ackLabelId} className="text-[14px] text-text">
              {acknowledgeLabel}
            </span>
          </label>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={isPending}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant="danger"
              onClick={handleConfirm}
              isLoading={isPending}
              disabled={isPending || !acknowledged}
            >
              {confirmLabel}
            </Button>
          </div>

          <Dialog.Close
            aria-label={closeLabel}
            className="absolute top-4 right-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none"
          >
            <Icon name="X" size={16} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
