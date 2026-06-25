import * as React from 'react'
import { formatDate } from '@evolve/utils'
import { OpChip } from '../../atoms/OpChip'
import { CashDeltaBadge } from '../../atoms/CashDeltaBadge'
import { OperationStatusTag } from '../../atoms/OperationStatusTag'
import { OperationSourceTag, type OperationSourceVariant } from '../../atoms/OperationSourceTag'
import { getOperationType, type OperationTypeKey } from '../../atoms/OperationType/operationTypes'
import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

/** Statut présentationnel d'une opération. */
export type OperationItemStatus = 'ok' | 'settled' | 'cancelled'

/**
 * Forme présentationnelle d'une opération (interface LÉGÈRE locale).
 * `@evolve/ui` ne dépend JAMAIS de `@evolve/data` : on redéclare ici le strict
 * nécessaire à l'affichage d'une ligne. L'appelant (apps/web) mappe son DTO vers ça.
 */
export interface OperationListItemData {
  id: string
  type: OperationTypeKey | string
  label: string
  /** Sous-ligne (ex. « Cotisation de juin », « 8 titres @ 672,50 € »). */
  meta?: string | null
  /** Date ISO (YYYY-MM-DD) ou libellé déjà formaté. */
  date?: string | null
  /** Flux de trésorerie signé (€, arrondi). */
  amount: number
  status?: OperationItemStatus
  /** Origine de l'opération (affichée dans la liste complète OPS-205, pas dans le preview). */
  source?: OperationSourceVariant
}

export interface OperationListItemProps {
  operation: OperationListItemData
  /** Atténue la ligne (opération annulée) : opacity 0.6 + line-through + grayscale chip. */
  cancelled?: boolean
  /** Ouvre le détail de l'opération. */
  onSelect?: (id: string) => void
  /** Affiche la colonne Source (liste complète OPS-205). Masquée par défaut (preview dashboard). */
  showSource?: boolean
  /** Libellés de statut (i18n), défauts FR. */
  settledLabel?: string
  cancelledStatusLabel?: string
  className?: string
}

/** Formate une date ISO en libellé court FR, sinon renvoie la chaîne telle quelle (— si vide). */
function displayDate(date: string | null | undefined): string {
  if (!date) return '—'
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    const formatted = formatDate(date)
    return formatted || '—'
  }
  return date
}

/**
 * OperationListItem (molecule) — une ligne d'opération.
 * Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §3.4 + §5 (OpListRow).
 *
 * OpChip 40 + (label + badge type mono + StatusTag) + (meta · date) + CashDeltaBadge + chevron.
 * Cliquable (role=button + clavier) → ouvre le détail. État annulé : opacity 0.6 sur la ligne,
 * grayscale sur le chip, line-through sur le label ET le badge montant.
 */
export function OperationListItem({
  operation,
  cancelled,
  onSelect,
  showSource = false,
  settledLabel,
  cancelledStatusLabel,
  className,
}: OperationListItemProps) {
  const status: OperationItemStatus = operation.status ?? 'ok'
  const isCancelled = cancelled ?? status === 'cancelled'
  const meta = getOperationType(operation.type)

  const handleActivate = () => onSelect?.(operation.id)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleActivate()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      aria-label={operation.label}
      className={cn(
        'group flex items-center gap-3.5 px-[22px] py-3.5 transition-colors duration-150',
        'hover:bg-card-sub focus-visible:outline-none focus-visible:shadow-glow',
        isCancelled && 'opacity-60',
        className
      )}
    >
      <OpChip type={operation.type} size={40} cancelled={isCancelled} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'font-display text-[15px] font-bold tracking-[-0.01em] text-text',
              isCancelled && 'line-through'
            )}
          >
            {operation.label}
          </span>
          <span className="rounded-[5px] bg-card-sub px-[7px] py-0.5 font-mono text-[10px] uppercase text-text-ter">
            {meta.label}
          </span>
          {status === 'settled' && (
            <OperationStatusTag variant="settled" settledLabel={settledLabel} />
          )}
          {status === 'cancelled' && (
            <OperationStatusTag variant="cancelled" cancelledLabel={cancelledStatusLabel} />
          )}
        </div>
        <div className="mt-[3px] truncate text-[12.5px] text-text-sec">
          {operation.meta ? `${operation.meta} · ` : ''}
          {displayDate(operation.date)}
        </div>
      </div>

      {showSource && operation.source && (
        <div className="hidden w-[78px] shrink-0 sm:block">
          <OperationSourceTag variant={operation.source} />
        </div>
      )}

      <CashDeltaBadge value={operation.amount} size="md" cancelled={isCancelled} />

      <Icon
        name="ChevronRight"
        size={16}
        aria-hidden="true"
        className="shrink-0 text-text-ter opacity-50 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
      />
    </div>
  )
}
