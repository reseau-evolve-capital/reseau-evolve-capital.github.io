'use client'

// Vue client OPS-205 — liste des opérations + détail (drawer) + annulation (modale).
// Enveloppe les organismes @evolve/ui (OperationsTable, OperationDetailDrawer, OperationCancelModal)
// et gère l'état d'interaction (sélection, ouverture modale) + l'appel cancelOperationAction.
// Les données sont lues côté serveur (page.tsx) ; les filtres pilotent l'URL (rechargement RSC).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  OperationsTable,
  OperationDetailDrawer,
  OperationCancelModal,
  useToast,
  type OperationListItemData,
  type OperationDetail,
  type OperationFilter,
} from '@evolve/ui'
import type { OperationType } from '@evolve/data'
import { cancelOperationAction } from '../actions'
import { errorMessageKey } from '../errorKeys'

/** Cycle de filtre Type : tous → cotisation → achat → vente → dividende → frais → pénalité → tous. */
const TYPE_CYCLE: ReadonlyArray<OperationType | null> = [
  null,
  'contribution',
  'buy',
  'sell',
  'dividend_cash',
  'fee',
  'penalty',
]

export function OperationsListView({
  operations,
  details,
  hasMore,
  page,
  activeType,
}: {
  operations: OperationListItemData[]
  details: OperationDetail[]
  hasMore: boolean
  page: number
  activeType: OperationType | null
}) {
  const t = useTranslations('admin.operations.list')
  const tType = useTranslations('admin.operations.types')
  const tErr = useTranslations('admin.operations.errors')
  const toast = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [isPending, setPending] = useState(false)

  const selected = details.find((d) => d.id === selectedId) ?? null

  // Navigation pilotée par l'URL (le RSC relit avec les nouveaux filtres / la nouvelle page).
  const pushParams = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams()
    if (activeType) params.set('type', activeType)
    mutate(params)
    const qs = params.toString()
    startTransition(() =>
      router.push(qs ? `/admin/operations/toutes?${qs}` : '/admin/operations/toutes')
    )
  }

  const cycleType = () => {
    const idx = TYPE_CYCLE.indexOf(activeType)
    const next = TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length] ?? null
    pushParams((p) => {
      p.delete('page')
      if (next) p.set('type', next)
      else p.delete('type')
    })
  }

  const filters: OperationFilter[] = [
    {
      key: 'type',
      label: t('filters.type'),
      value: activeType ? tType(activeType) : t('filters.allTypes'),
    },
  ]

  const handleConfirmCancel = (reason: string) => {
    if (!selectedId) return
    setPending(true)
    startTransition(async () => {
      const res = await cancelOperationAction(selectedId, reason)
      setPending(false)
      if (res.ok) {
        toast.success({ title: t('cancel.toastTitle'), message: t('cancel.toastMessage') })
        setCancelOpen(false)
        setSelectedId(null)
        router.refresh()
      } else {
        toast.error({ title: tErr('cancelTitle'), message: tErr(errorMessageKey(res.error)) })
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <OperationsTable
        operations={operations}
        filters={filters}
        state={operations.length === 0 ? 'empty' : 'ready'}
        onSelectOperation={setSelectedId}
        onNewOperation={() => router.push('/admin/operations/nouvelle')}
        onFilterClick={(key) => {
          if (key === 'type') cycleType()
        }}
        hasMore={hasMore}
        onLoadMore={() => pushParams((p) => p.set('page', String(page + 1)))}
        labels={{
          caption: t('caption'),
          title: t('title'),
          newOperation: t('newOperation'),
          sortLabel: t('sortLabel'),
          emptyTitle: t('empty.title'),
          emptyText: t('empty.text'),
          emptyCta: t('empty.cta'),
          loadMore: t('loadMore'),
        }}
      />

      <OperationDetailDrawer
        open={selectedId !== null}
        onOpenChange={(open) => {
          // Le drawer reste monté tant que la modale d'annulation (empilée par-dessus) est ouverte.
          if (!open && !cancelOpen) setSelectedId(null)
        }}
        operation={selected}
        onCancelRequest={() => setCancelOpen(true)}
        labels={{
          close: t('detail.close'),
          impactCaption: t('detail.impactCaption'),
          cancelledImpactNote: t('detail.cancelledImpactNote'),
          rowDate: t('detail.rowDate'),
          rowType: t('detail.rowType'),
          rowRef: t('detail.rowRef'),
          rowSource: t('detail.rowSource'),
          rowDetail: t('detail.rowDetail'),
          sourceManual: t('detail.sourceManual'),
          sourceMigrated: t('detail.sourceMigrated'),
          cancelReasonCaption: t('detail.cancelReasonCaption'),
          cancelButton: t('detail.cancelButton'),
          settledWarning: t('detail.settledWarning'),
          cancelledFooter: t('detail.cancelledFooter'),
        }}
      />

      {selected && (
        <OperationCancelModal
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          operationLabel={selected.label}
          amount={selected.amount}
          onConfirm={handleConfirmCancel}
          isPending={isPending}
          labels={{
            title: t('cancel.title'),
            summary: t('cancel.summary'),
            reasonLabel: t('cancel.reasonLabel'),
            reasonPlaceholder: t('cancel.reasonPlaceholder'),
            reasonHint: t('cancel.reasonHint'),
            keepButton: t('cancel.keepButton'),
            confirmButton: t('cancel.confirmButton'),
            close: t('cancel.close'),
          }}
        />
      )}
    </div>
  )
}
