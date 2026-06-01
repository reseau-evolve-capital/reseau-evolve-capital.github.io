'use client'

// Dashboard admin (ADM-002). KPIs club + SyncBanner réutilisé + alerte impayés.
// Impayé = status ∈ (late,pending) OU amount_due>0 (cf. lib/data/admin). Tokens data-warning
// pour l'alerte (jamais brand-red). Réf : E-ADM, CLAUDE.md (a11y, formatage @evolve/utils).

import { KPICard, SyncBanner, Heading, Text, Icon } from '@evolve/ui'

import type { ClubSummary } from '@/lib/data/admin'
import { useClubSummary } from '@/lib/hooks/useClubSummary'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

export function AdminDashboardView({ initialData }: { initialData: ClubSummary }) {
  const { data } = useClubSummary(initialData)
  const sync = useSyncStatus(data.clubId)

  const syncError = sync.isError
    ? sync.error.message === 'rate_limited'
      ? 'Rate limit atteint. Réessaie dans quelques minutes.'
      : 'La synchronisation a échoué. Réessaie ?'
    : null

  return (
    <div className="flex flex-col gap-6">
      <Heading level="h1" className="text-[20px]">
        Espace trésorier
      </Heading>

      <SyncBanner
        syncedAt={data.syncedAt}
        userRole={data.userRole}
        isSyncing={sync.isPending}
        onSync={() => sync.mutate()}
        errorMessage={syncError}
      />

      {data.unpaidCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[10px] border border-data-warning bg-data-warning-50 p-4"
        >
          <Icon name="TriangleAlert" size={20} className="text-data-warning" aria-hidden="true" />
          <Text className="font-semibold">
            {data.unpaidCount === 1
              ? '1 membre est en situation d’impayé.'
              : `${data.unpaidCount} membres sont en situation d’impayé.`}
          </Text>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Membres actifs" value={data.activeMembers} format="raw" />
        <KPICard title="Valeur du portefeuille" value={data.portfolioValue} format="eur" />
        <KPICard title="Total cotisé" value={data.totalContributed} format="eur" />
        <KPICard title="Membres en impayé" value={data.unpaidCount} format="raw" />
      </div>
    </div>
  )
}
