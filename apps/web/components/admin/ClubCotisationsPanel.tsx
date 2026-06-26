'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { KPICard, RegulariserList } from '@evolve/ui'
import { formatEUR, formatPct } from '@evolve/utils'
import { buildSyntheseParams } from '@/lib/data/admin'
import type { ClubCotisationsStats, RegulariserMember } from '@/lib/data/admin'

interface ClubCotisationsPanelProps {
  clubStats: ClubCotisationsStats
  regulariserList: RegulariserMember[]
  /** Code ISO 4217. Défaut : 'EUR'. Réservé pour V2 multi-devises. */
  currency?: string
  onMemberSelect: (membershipId: string) => void
  onRelancer: (membershipId: string) => void
  /** false = secrétaire (LECTURE SEULE) → le bouton « Relancer » est masqué. Défaut true. */
  canManage?: boolean
}

export function ClubCotisationsPanel({
  clubStats,
  regulariserList,
  onMemberSelect,
  onRelancer,
  canManage = true,
}: ClubCotisationsPanelProps) {
  const t = useTranslations('admin.cotisations')

  const synthese = buildSyntheseParams(clubStats, regulariserList)
  const { lateCount, recoveryRate, lateAmount, topMemberName, topMemberAmount } = synthese
  const rateStr = formatPct(recoveryRate, { showSign: false })

  let syntheseText: string
  if (lateCount === 0) {
    syntheseText = t('synthese.allGood')
  } else if (lateCount === 1 && topMemberName != null && topMemberAmount != null) {
    syntheseText = t('synthese.oneMember', {
      rate: rateStr,
      name: topMemberName,
      amount: formatEUR(topMemberAmount),
    })
  } else {
    syntheseText = t('synthese.manyMembers', {
      rate: rateStr,
      count: lateCount,
      amount: formatEUR(lateAmount),
      topName: topMemberName ?? '',
      topAmount: topMemberAmount != null ? formatEUR(topMemberAmount) : '',
    })
  }

  // KPI "En retard" : valeur combinée (montant + comptage membres)
  const lateValue =
    clubStats.lateCount > 0
      ? `${formatEUR(clubStats.lateAmount)} · ${clubStats.lateCount} membre${clubStats.lateCount > 1 ? 's' : ''}`
      : formatEUR(clubStats.lateAmount)

  return (
    <div className="flex flex-col gap-6">
      {/* ── Bandeau synthèse ── */}
      <div className="bg-card-sub border border-border rounded-[10px] px-4 py-3">
        <p className="text-[14px] text-text leading-relaxed">{syntheseText}</p>
      </div>

      {/* ── Grille 3 KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title={t('kpi.recoveryRate')}
          value={clubStats.recoveryRate}
          format="pct"
          hint={t('kpi.recoveryRateHint')}
          hintLabel={t('kpi.recoveryRate')}
        />
        <KPICard
          title={t('kpi.late')}
          value={lateValue}
          format="raw"
          hint={t('kpi.lateHint')}
          hintLabel={t('kpi.late')}
        />
        <KPICard
          title={t('kpi.encaisse')}
          value={clubStats.encaisse}
          format="eur"
          hint={t('kpi.encaisseHint')}
          hintLabel={t('kpi.encaisse')}
        />
      </div>

      {/* ── Liste À régulariser ── */}
      <RegulariserList
        items={regulariserList}
        {...(canManage ? { onRelancer } : {})}
        onMemberClick={onMemberSelect}
        labels={{
          title: t('regulariser.title'),
          emptyTitle: t('regulariser.emptyTitle'),
          emptyDesc: t('regulariser.emptyDesc'),
          relancer: t('regulariser.relancer'),
          lateMonthsLabel: (count: number) => t('regulariser.lateMonths', { n: count }),
          amountDueAriaLabel: t('kpi.amountDue'),
        }}
        formatAmount={(amount) => formatEUR(amount)}
      />
    </div>
  )
}
