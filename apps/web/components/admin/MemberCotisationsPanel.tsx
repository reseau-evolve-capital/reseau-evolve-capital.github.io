'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Heading, KPICard, ContributionsTimeline } from '@evolve/ui'
import { formatEUR } from '@evolve/utils'
import type { MemberCotisationsData, ContributionStatus } from '@/lib/data/admin'

interface MemberCotisationsPanelProps {
  member: MemberCotisationsData
  currency?: string
  onRelancer: (membershipId: string) => void
  membershipId: string
  /** false = secrétaire (LECTURE SEULE) → le bouton « Relancer » est masqué. Défaut true. */
  canManage?: boolean
}

/** Classe Tailwind pour le texte du badge selon le statut. */
function statusBadgeClass(status: ContributionStatus): string {
  switch (status) {
    case 'ok':
      return 'text-data-positive bg-data-positive-50'
    case 'late':
      return 'text-data-negative bg-data-negative-50'
    case 'pending':
      return 'text-text-sec bg-card-sub'
    case 'exempt':
      return 'text-text-sec bg-card-sub'
  }
}

/** Formate un mois en label FR lisible. Ex: month=6, year=2024 → « juin 2024 ». */
function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long' }).format(
    new Date(year, month - 1)
  )
}

export function MemberCotisationsPanel({
  member,
  onRelancer,
  membershipId,
  canManage = true,
}: MemberCotisationsPanelProps) {
  const t = useTranslations('admin.cotisations')

  const joinedAtFormatted = member.joinedAt
    ? new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(member.joinedAt))
    : '—'

  const statusLabel = t(`member.statusBadge.${member.status}`)

  return (
    <div className="flex flex-col gap-6">
      {/* ── En-tête membre ── */}
      <div className="bg-card border border-border rounded-[10px] p-4 sm:p-6 shadow-[var(--sh-card)]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Heading level="h2">{member.fullName}</Heading>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-pill text-[12px] font-semibold leading-none ${statusBadgeClass(member.status)}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-[13px] text-text-sec">
            {t('member.since', { date: joinedAtFormatted })}
          </p>
        </div>
      </div>

      {/* ── Grille 3 KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title={t('kpi.memberRecovery')}
          value={member.recoveryRate}
          format="pct"
          hint={t('kpi.memberRecoveryHint')}
          hintLabel={t('kpi.memberRecovery')}
        />
        <KPICard
          title={t('kpi.amountDue')}
          value={member.amountDue}
          format="eur"
          hint={t('kpi.amountDueHint')}
          hintLabel={t('kpi.amountDue')}
        />
        <KPICard
          title={t('kpi.netMarketValue')}
          value={member.netMarketValue ?? 0}
          format="eur"
          hint={t('kpi.netMarketValueHint')}
          hintLabel={t('kpi.netMarketValue')}
        />
      </div>

      {/* ── Encart « Mois en retard » ── */}
      {member.lateMonths.length > 0 && (
        <section
          role="region"
          aria-label={t('member.lateMonthsTitle')}
          className="bg-data-negative-50 border border-data-negative rounded-[10px] p-4 sm:p-6 flex flex-col gap-4"
        >
          <Heading level="h3" className="text-data-negative-strong">
            {t('member.lateMonthsTitle')}
          </Heading>

          <ul className="flex flex-col gap-2" aria-label={t('member.lateMonthsTitle')}>
            {member.lateMonths.map((lm) => {
              const label = formatMonthLabel(lm.year, lm.month)
              return (
                <li
                  key={`${lm.year}-${lm.month}`}
                  className="flex items-center justify-between gap-2 text-[14px]"
                >
                  <span className="text-text capitalize">{label}</span>
                  <span className="font-semibold text-data-negative tabular-nums">
                    {formatEUR(lm.amount)}
                  </span>
                </li>
              )
            })}
          </ul>

          {canManage && (
            <button
              type="button"
              onClick={() => onRelancer(membershipId)}
              className="self-start min-h-[44px] px-4 py-2.5 rounded-[8px] bg-data-negative text-neutral-0 text-[14px] font-semibold transition-opacity duration-[150ms] hover:opacity-90 active:opacity-80"
            >
              {t('member.relancer')}
            </button>
          )}
        </section>
      )}

      {/* ── Frise de cotisations ── */}
      <ContributionsTimeline years={member.years} />
    </div>
  )
}
