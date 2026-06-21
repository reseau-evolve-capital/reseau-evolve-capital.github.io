'use client'

import * as React from 'react'
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
}

/** Construit le texte du bandeau synthèse (FR hardcodé — T6 refactorera vers i18n). */
function buildSyntheseText(synthese: ReturnType<typeof buildSyntheseParams>): string {
  const { lateCount, recoveryRate, lateAmount, topMemberName, topMemberAmount } = synthese
  const rateStr = formatPct(recoveryRate, { showSign: false })

  if (lateCount === 0) {
    return 'Tout le monde est à jour 🎉'
  }

  if (lateCount === 1 && topMemberName != null && topMemberAmount != null) {
    return `Ton club est à jour à ${rateStr}. ${topMemberName} cumule ${formatEUR(topMemberAmount)} de retard.`
  }

  // lateCount > 1
  const topPart =
    topMemberName != null && topMemberAmount != null
      ? `, dont ${topMemberName} (${formatEUR(topMemberAmount)}) en priorité`
      : ''

  return `Ton club est à jour à ${rateStr}. ${lateCount} membres cumulent ${formatEUR(lateAmount)} de retard${topPart}.`
}

export function ClubCotisationsPanel({
  clubStats,
  regulariserList,
  onMemberSelect,
  onRelancer,
}: ClubCotisationsPanelProps) {
  const synthese = buildSyntheseParams(clubStats, regulariserList)
  const syntheseText = buildSyntheseText(synthese)

  // KPI "En retard" : valeur combinée (montant + comptage membres)
  const lateValue =
    clubStats.lateCount > 0
      ? `${formatEUR(clubStats.lateAmount)} · ${clubStats.lateCount} membre${clubStats.lateCount > 1 ? 's' : ''}`
      : formatEUR(clubStats.lateAmount)

  return (
    <div className="flex flex-col gap-6">
      {/* ── Bandeau synthèse ── */}
      <div className="bg-surface border border-border rounded-[10px] px-4 py-3">
        <p className="text-[14px] text-text leading-relaxed">{syntheseText}</p>
      </div>

      {/* ── Grille 3 KPI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Taux de recouvrement"
          value={clubStats.recoveryRate}
          format="pct"
          hint="Mois payés ÷ mois dus exploitables (hors futurs et exemptés)."
          hintLabel="En savoir plus sur le taux de recouvrement"
        />
        <KPICard
          title="En retard"
          value={lateValue}
          format="raw"
          hint="Total des cotisations impayées du club (mois en retard ou en attente)."
          hintLabel="En savoir plus sur les retards"
        />
        <KPICard
          title="Encaissé"
          value={clubStats.encaisse}
          format="eur"
          hint="Somme des cotisations effectivement reçues (mois au statut « payé »)."
          hintLabel="En savoir plus sur les encaissements"
        />
      </div>

      {/* ── Liste À régulariser ── */}
      <RegulariserList
        items={regulariserList}
        onRelancer={onRelancer}
        onMemberClick={onMemberSelect}
        labels={{
          title: 'À régulariser',
          emptyTitle: 'Tout le monde est à jour',
          emptyDesc: "Aucun membre n'a de cotisation en retard.",
          relancer: 'Relancer',
          lateMonthsLabel: (count: number) =>
            count === 1 ? '1 mois en retard' : `${count} mois en retard`,
          amountDueAriaLabel: 'Montant dû',
        }}
        formatAmount={(amount) => formatEUR(amount)}
      />
    </div>
  )
}
