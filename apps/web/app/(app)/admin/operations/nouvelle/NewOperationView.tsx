'use client'

// Vue client P0-b — assistant « Nouvelle opération » (E-OPS-2 §4). Enveloppe l'organisme
// OperationForm (@evolve/ui, contrôlé en interne) : il émet OperationFormPayload au submit, on
// le relaie à la Server Action recordOperationAction. L'i18n (next-intl) est injectée en props.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  OperationForm,
  useToast,
  type OperationFormPayload,
  type OperationTypeKey,
} from '@evolve/ui'
import { recordOperationAction } from '../actions'
import { errorMessageKey } from '../errorKeys'
import type { ActiveMemberOption } from '@/lib/data/operations'

export function NewOperationView({
  members,
  minContribution,
  balanceBefore,
  initialType,
}: {
  members: ActiveMemberOption[]
  minContribution: number
  balanceBefore: number | null
  initialType?: OperationTypeKey
}) {
  const t = useTranslations('admin.operations.form')
  const tErr = useTranslations('admin.operations.errors')
  const toast = useToast()
  const router = useRouter()
  const [, startTransition] = useTransition()

  const handleSubmit = (payload: OperationFormPayload) => {
    startTransition(async () => {
      const res = await recordOperationAction({
        type: payload.type,
        cashDelta: payload.cashDelta,
        operationDate: payload.operationDate,
        membershipId: payload.membershipId,
        symbol: payload.symbol,
        assetName: payload.assetName,
        quantity: payload.quantity,
        unitPrice: payload.unitPrice,
        currency: payload.currency,
        fxRate: payload.fxRate,
        brokerRef: payload.brokerRef,
        notes: payload.notes,
      })
      if (res.ok) {
        toast.success({ title: t('toast.successTitle'), message: t('toast.successMessage') })
      } else {
        toast.error({ title: tErr('recordTitle'), message: tErr(errorMessageKey(res.error)) })
      }
    })
  }

  return (
    <OperationForm
      members={members}
      minContribution={minContribution}
      balanceBefore={balanceBefore}
      initialType={initialType}
      onSubmit={handleSubmit}
      onBack={() => router.push('/admin/operations')}
      onViewOperations={() => router.push('/admin/operations/toutes')}
      labels={{
        back: t('back'),
        title: t('title'),
        step1Caption: t('step1.caption'),
        step1Title: t('step1.title'),
        step1Intro: t('step1.intro'),
        step2Caption: t('step2.caption'),
        changeType: t('step2.changeType'),
        member: t('fields.member'),
        amount: t('fields.amount'),
        date: t('fields.date'),
        transferRef: t('fields.transferRef'),
        notes: t('fields.notes'),
        symbol: t('fields.symbol'),
        assetName: t('fields.assetName'),
        quantity: t('fields.quantity'),
        unitPrice: t('fields.unitPrice'),
        currency: t('fields.currency'),
        brokerRef: t('fields.brokerRef'),
        optional: t('fields.optional'),
        memberPlaceholder: t('fields.memberPlaceholder'),
        submit: t('submit'),
        cashCaption: t('cashCaption'),
        successTitle: t('step3.successTitle'),
        newBalanceCaption: t('step3.newBalanceCaption'),
        viewOperations: t('step3.viewOperations'),
        newOperation: t('step3.newOperation'),
      }}
    />
  )
}
