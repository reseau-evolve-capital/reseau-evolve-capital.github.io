'use client'
import { DashboardHero, KPICard } from '@evolve/ui'
import { contributionStatusLabel, type DashboardData } from '@/lib/data/dashboard'

export function DashboardView({ initialData }: { initialData: DashboardData | null }) {
  if (!initialData) return null // états empty/error gérés en T9
  const d = initialData
  return (
    <div className="flex flex-col gap-4">
      <DashboardHero netMarketValue={d.netMarketValue} syncedAt={d.syncedAt} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Ma détention" value={d.detentionPct} format="pct" icon="ChartPie" />
        <KPICard title="Total cotisé" value={d.totalContributed} format="eur" icon="TrendingUp" />
        <KPICard
          title="Statut cotisation"
          value={contributionStatusLabel(d.contribution.status)}
          format="raw"
          icon="Calendar"
        />
      </div>
    </div>
  )
}
