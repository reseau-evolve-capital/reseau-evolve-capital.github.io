'use client'

import * as React from 'react'
import { Heading, KPICard, ContributionsTimeline } from '@evolve/ui'
import { formatEUR } from '@evolve/utils'
import type { MemberCotisationsData, ContributionStatus } from '@/lib/data/admin'

interface MemberCotisationsPanelProps {
  member: MemberCotisationsData
  currency?: string
  onRelancer: (membershipId: string) => void
  membershipId: string
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

/** Libellé FR du statut de cotisation. */
function statusLabel(status: ContributionStatus): string {
  switch (status) {
    case 'ok':
      return 'À jour'
    case 'late':
      return 'En retard'
    case 'pending':
      return 'En attente'
    case 'exempt':
      return 'Exempté'
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
}: MemberCotisationsPanelProps) {
  const joinedAtFormatted = member.joinedAt
    ? new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(member.joinedAt))
    : '—'

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
              {statusLabel(member.status)}
            </span>
          </div>
          <p className="text-[13px] text-text-sec">
            Membre depuis <span className="font-semibold text-text">{joinedAtFormatted}</span>
          </p>
        </div>
      </div>

      {/* ── Grille 3 KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Recouvrement perso"
          value={member.recoveryRate}
          format="pct"
          hint="Mois payés ÷ mois dus de ce membre."
          hintLabel="En savoir plus sur le recouvrement personnel"
        />
        <KPICard
          title="Montant dû"
          value={member.amountDue}
          format="eur"
          hint="Cotisations impayées de ce membre."
          hintLabel="En savoir plus sur le montant dû"
        />
        <KPICard
          title="Valeur nette de la part"
          value={member.netMarketValue ?? 0}
          format="eur"
          hint="Valeur de marché des positions détenues par ce membre."
          hintLabel="En savoir plus sur la valeur nette"
        />
      </div>

      {/* ── Encart « À régulariser » ── */}
      {member.lateMonths.length > 0 && (
        <section
          role="region"
          aria-label="Mois en retard"
          className="bg-data-negative-50 border border-data-negative rounded-[10px] p-4 sm:p-6 flex flex-col gap-4"
        >
          <Heading level="h3" className="text-data-negative-strong">
            Mois en retard
          </Heading>

          <ul className="flex flex-col gap-2" aria-label="Liste des mois en retard">
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

          <button
            type="button"
            onClick={() => onRelancer(membershipId)}
            className="self-start min-h-[44px] px-4 py-2.5 rounded-[8px] bg-data-negative text-neutral-0 text-[14px] font-semibold transition-opacity duration-[150ms] hover:opacity-90 active:opacity-80"
          >
            Relancer
          </button>
        </section>
      )}

      {/* ── Frise de cotisations ── */}
      <ContributionsTimeline years={member.years} />
    </div>
  )
}
