'use client'

// OperationDetailDrawer (organism) — panneau de détail d'une opération (droite, 440px).
// Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §5 (OpDetailDrawer).
//
// Radix Dialog (focus-trap, Escape, overlay clic-ferme, Title auto-câblé). role=dialog
// aria-modal hérités. PRÉSENTATIONNEL STRICT : zéro dépendance @evolve/data. L'opération
// est injectée sous forme présentationnelle légère. Tous les libellés ont un défaut FR.
//
// Footer CONDITIONNEL selon le statut :
//   - 'ok'        → bouton .op-btn.danger « Annuler l'opération » (onCancelRequest).
//   - 'settled'   → bouton désactivé (opacity .5) + avertissement « passe par une correction ».
//                   Le bouton NE déclenche RIEN (parts déjà distribuées).
//   - 'cancelled' → texte « conservée pour l'historique » + encart motif.

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { signedEURWhole } from '@evolve/utils'

import { Icon } from '../../atoms/Icon'
import { OpChip } from '../../atoms/OpChip'
import { OperationStatusTag } from '../../atoms/OperationStatusTag'
import { getOperationType, type OperationTypeKey } from '../../atoms/OperationType/operationTypes'
import { cn } from '../../lib/cn'

export type OperationDetailStatus = 'ok' | 'settled' | 'cancelled'

/** Forme présentationnelle d'une opération détaillée (interface LÉGÈRE locale). */
export interface OperationDetail {
  id: string
  type: OperationTypeKey | string
  label: string
  /** Sous-ligne « Détail » (ex. « 160 titres @ 155 € »). */
  meta?: string | null
  /** Date déjà formatée ou ISO. */
  date?: string | null
  /** Flux de trésorerie signé (€, arrondi). */
  amount: number
  /** Référence (virement / courtier). */
  ref?: string | null
  source?: 'manual' | 'migrated'
  status?: OperationDetailStatus
  /** Motif d'annulation (si status === 'cancelled'). */
  cancelReason?: string | null
}

export interface OperationDetailLabels {
  close?: string
  impactCaption?: string
  cancelledImpactNote?: string
  rowDate?: string
  rowType?: string
  rowRef?: string
  rowSource?: string
  rowDetail?: string
  sourceManual?: string
  sourceMigrated?: string
  cancelReasonCaption?: string
  cancelButton?: string
  /** Footer 'settled'. */
  settledWarning?: string
  /** Footer 'cancelled'. */
  cancelledFooter?: string
}

export interface OperationDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operation: OperationDetail | null
  /** Demande d'annulation (footer 'ok' uniquement) → ouvre la modale de motif. */
  onCancelRequest?: () => void
  labels?: OperationDetailLabels
}

const DEFAULTS: Required<OperationDetailLabels> = {
  close: 'Fermer',
  impactCaption: 'Impact sur le solde',
  cancelledImpactNote: 'Ne compte plus dans le solde du club.',
  rowDate: 'Date',
  rowType: 'Type',
  rowRef: 'Référence',
  rowSource: 'Source',
  rowDetail: 'Détail',
  sourceManual: 'Saisie manuelle',
  sourceMigrated: 'Migré (matrice)',
  cancelReasonCaption: "Motif d'annulation",
  cancelButton: "Annuler l'opération",
  settledWarning:
    'Opération settlée (parts distribuées) — passe par une correction, pas une annulation.',
  cancelledFooter: 'Opération annulée — conservée pour l’historique.',
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3">
      <span className="text-[13px] text-text-ter">{label}</span>
      <span className="text-right text-[14px] font-semibold text-text">{value ?? '—'}</span>
    </div>
  )
}

export function OperationDetailDrawer({
  open,
  onOpenChange,
  operation,
  onCancelRequest,
  labels,
}: OperationDetailDrawerProps) {
  const t = { ...DEFAULTS, ...labels }
  const titleId = React.useId()

  if (!operation) return null

  const status: OperationDetailStatus = operation.status ?? 'ok'
  const isCancelled = status === 'cancelled'
  const meta = getOperationType(operation.type)
  const positive = !(operation.amount < 0)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[var(--overlay)] motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-labelledby={titleId}
          className={cn(
            'fixed right-0 top-0 z-[70] flex h-full w-[440px] max-w-[calc(100vw-1rem)] flex-col',
            'border-l border-border bg-card shadow-modal focus:outline-none',
            'motion-safe:animate-in motion-safe:slide-in-from-right'
          )}
        >
          {/* En-tête */}
          <div className="flex items-center gap-3 border-b border-border px-6 py-5">
            <OpChip type={operation.type} size={44} cancelled={isCancelled} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Dialog.Title
                  id={titleId}
                  className={cn(
                    'font-display text-[19px] font-extrabold tracking-[-0.02em] text-text',
                    isCancelled && 'line-through'
                  )}
                >
                  {operation.label}
                </Dialog.Title>
                {status === 'settled' && <OperationStatusTag variant="settled" />}
                {isCancelled && <OperationStatusTag variant="cancelled" />}
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-text-ter">
                {meta.label} · {operation.id}
              </p>
            </div>
            <Dialog.Close
              aria-label={t.close}
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-pill text-text-sec transition-colors hover:bg-card-sub focus-visible:outline-none focus-visible:shadow-glow"
            >
              <Icon name="X" size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* Corps scrollable */}
          <div className="flex-1 overflow-y-auto px-6">
            {/* Zone montant */}
            <div className="flex flex-col items-center border-b border-border py-5 text-center">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-ter">
                {t.impactCaption}
              </p>
              <p
                className={cn(
                  'font-display text-[38px] font-black tracking-[-0.03em] [font-feature-settings:"tnum","lnum"]',
                  isCancelled
                    ? 'text-text-ter line-through'
                    : positive
                      ? 'text-data-positive'
                      : 'text-data-negative'
                )}
              >
                {signedEURWhole(operation.amount)}
              </p>
              {isCancelled && (
                <p className="mt-2 text-[12.5px] text-text-ter">{t.cancelledImpactNote}</p>
              )}
            </div>

            {/* Lignes de détail */}
            <div className="py-1">
              <DetailRow label={t.rowDate} value={operation.date || '—'} />
              <DetailRow label={t.rowType} value={meta.label} />
              <DetailRow label={t.rowRef} value={operation.ref || '—'} />
              <DetailRow
                label={t.rowSource}
                value={operation.source === 'migrated' ? t.sourceMigrated : t.sourceManual}
              />
              <DetailRow label={t.rowDetail} value={operation.meta || '—'} />
            </div>

            {/* Encart motif */}
            {isCancelled && operation.cancelReason && (
              <div className="mt-4 mb-2 rounded-md border border-border bg-card-sub px-4 py-3.5">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-ter">
                  {t.cancelReasonCaption}
                </p>
                <p className="text-[13.5px] leading-relaxed text-text-sec">
                  {operation.cancelReason}
                </p>
              </div>
            )}
          </div>

          {/* Footer conditionnel */}
          <div className="border-t border-border bg-card-sub px-6 py-4">
            {status === 'ok' && (
              <button
                type="button"
                onClick={onCancelRequest}
                className="flex min-h-11 w-full items-center justify-center rounded-pill bg-data-negative px-[22px] font-body text-[14px] font-bold text-white transition-transform duration-150 hover:opacity-95 active:scale-[0.985] focus-visible:outline-none focus-visible:shadow-glow [html[data-theme=dark]_&]:text-neutral-1000"
              >
                {t.cancelButton}
              </button>
            )}

            {status === 'settled' && (
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="flex min-h-11 w-full items-center justify-center rounded-pill border border-border bg-transparent px-[22px] font-body text-[14px] font-bold text-text-sec opacity-50"
                >
                  {t.cancelButton}
                </button>
                <p className="flex items-start gap-1.5 text-[12.5px] text-text-sec">
                  <Icon
                    name="TriangleAlert"
                    size={16}
                    aria-hidden="true"
                    className="mt-px shrink-0 text-data-warning"
                  />
                  {t.settledWarning}
                </p>
              </div>
            )}

            {isCancelled && (
              <p className="text-center text-[13px] text-text-ter">{t.cancelledFooter}</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
