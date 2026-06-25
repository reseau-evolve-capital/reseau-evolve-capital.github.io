'use client'

// OperationsTable (organism) — carte « Toutes les opérations » : en-tête + filtres + liste.
// Spec : `docs/tickets/design-refs/E-OPS-2-design-spec.md` §5 (OPS-205 — liste).
//
// PRÉSENTATIONNEL STRICT : zéro dépendance @evolve/data. Les opérations sont injectées
// sous la forme présentationnelle légère `OperationListItemData`. Tous les libellés ont
// un défaut FR surchargeable (i18n côté apps/web).
//
// États : 'ready' (liste) · 'empty' (encart pointillé + CTA) · 'loading' (skeletons) ·
// 'error' (bande dégradée + Réessayer). Pagination simple optionnelle (« Voir plus »).

import * as React from 'react'

import { Icon } from '../../atoms/Icon'
import { Skeleton } from '../../atoms/Skeleton'
import { OperationListItem, type OperationListItemData } from '../../molecules/OperationListItem'
import { OperationFilterBar, type OperationFilter } from '../../molecules/OperationFilterBar'
import { cn } from '../../lib/cn'

export type OperationsTableState = 'ready' | 'empty' | 'loading' | 'error'

export interface OperationsTableLabels {
  /** Sur-titre caption au-dessus du H1. */
  caption?: string
  /** Titre de page. */
  title?: string
  /** Bouton de création. */
  newOperation?: string
  /** Tri (transmis à la barre de filtres). */
  sortLabel?: string
  /** Empty : titre / texte / CTA. */
  emptyTitle?: string
  emptyText?: string
  emptyCta?: string
  /** Error : titre / texte / bouton. */
  errorTitle?: string
  errorText?: string
  retry?: string
  /** Pagination. */
  loadMore?: string
}

export interface OperationsTableProps {
  operations: OperationListItemData[]
  filters: OperationFilter[]
  state?: OperationsTableState
  onSelectOperation?: (id: string) => void
  onNewOperation?: () => void
  onFilterClick?: (key: string) => void
  onRetry?: () => void
  /** Pagination : affiche « Voir plus » si vrai. */
  hasMore?: boolean
  onLoadMore?: () => void
  labels?: OperationsTableLabels
  className?: string
}

const DEFAULTS: Required<OperationsTableLabels> = {
  caption: 'Evolve Capital · Trésorerie · Opérations',
  title: 'Toutes les opérations',
  newOperation: '+ Nouvelle opération',
  sortLabel: 'Trié par date',
  emptyTitle: 'Aucune opération enregistrée',
  emptyText:
    'Les versements, achats, ventes et autres mouvements de trésorerie apparaîtront ici dès la première saisie.',
  emptyCta: '+ Enregistrer la première',
  errorTitle: 'Impossible de charger les opérations',
  errorText: 'Une erreur est survenue. Réessaie dans un instant.',
  retry: 'Réessayer',
  loadMore: 'Voir plus',
}

/** Bouton principal jaune (`.op-btn.primary`). */
function PrimaryButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-brand-yellow px-[22px]',
        'font-body text-[14px] font-bold text-neutral-900 transition-transform duration-150',
        'hover:opacity-95 active:scale-[0.985] focus-visible:outline-none focus-visible:shadow-glow',
        className
      )}
    >
      {children}
    </button>
  )
}

/** Bouton secondaire (`.op-btn.secondary`). */
function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-border-strong bg-card px-[22px]',
        'font-body text-[14px] font-bold text-text transition-transform duration-150',
        'hover:border-text-ter active:scale-[0.985] focus-visible:outline-none focus-visible:shadow-glow'
      )}
    >
      {children}
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 px-[22px] py-3.5">
      <Skeleton width={40} height={40} radius="999px" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton width={170} height={13} />
        <Skeleton width={120} height={11} />
      </div>
      <Skeleton width={70} height={12} />
      <Skeleton width={84} height={28} radius="999px" />
    </div>
  )
}

export function OperationsTable({
  operations,
  filters,
  state = 'ready',
  onSelectOperation,
  onNewOperation,
  onFilterClick,
  onRetry,
  hasMore = false,
  onLoadMore,
  labels,
  className,
}: OperationsTableProps) {
  const t = { ...DEFAULTS, ...labels }

  return (
    <div className={cn('w-full', className)}>
      {/* En-tête de page */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-ter">
            {t.caption}
          </p>
          <h1 className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] text-text">
            {t.title}
          </h1>
        </div>
        <PrimaryButton onClick={onNewOperation}>{t.newOperation}</PrimaryButton>
      </div>

      {/* Carte liste */}
      <div
        className={cn(
          'overflow-hidden rounded-md border border-border bg-card shadow-card',
          state === 'error' && 'border-data-negative/30'
        )}
      >
        {state === 'error' && (
          <div className="h-1 w-full bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-red" />
        )}

        <OperationFilterBar
          filters={filters}
          onFilterClick={onFilterClick}
          sortLabel={t.sortLabel}
        />

        {state === 'loading' && (
          <div className="divide-y divide-border" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-pill bg-data-warning-50 text-data-warning">
              <Icon name="RefreshCw" size={24} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-extrabold text-text">{t.errorTitle}</h2>
              <p className="mt-1 max-w-[42ch] text-[14px] text-text-sec">{t.errorText}</p>
            </div>
            <SecondaryButton onClick={onRetry}>{t.retry}</SecondaryButton>
          </div>
        )}

        {state === 'empty' && (
          <div className="m-[14px] flex flex-col items-center gap-4 rounded-md border border-dashed border-border-strong px-6 py-16 text-center">
            <span className="inline-flex h-[60px] w-[60px] items-center justify-center rounded-pill bg-card-sub text-text-ter">
              <Icon name="ScrollText" size={24} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-[20px] font-extrabold text-text">{t.emptyTitle}</h2>
              <p className="mx-auto mt-1 max-w-[42ch] text-[14px] text-text-sec">{t.emptyText}</p>
            </div>
            <PrimaryButton onClick={onNewOperation}>{t.emptyCta}</PrimaryButton>
          </div>
        )}

        {state === 'ready' && (
          <>
            <div className="divide-y divide-border">
              {operations.map((op) => (
                <OperationListItem
                  key={op.id}
                  operation={op}
                  onSelect={onSelectOperation}
                  showSource
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center border-t border-border p-4">
                <SecondaryButton onClick={onLoadMore}>{t.loadMore}</SecondaryButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
