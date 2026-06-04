'use client'

// Dashboard admin (ADM-002). KPIs club + SyncBanner réutilisé + alerte impayés.
// Impayé = status ∈ (late,pending) OU amount_due>0 (cf. lib/data/admin). Tokens data-warning
// pour l'alerte (jamais brand-red). Réf : E-ADM, CLAUDE.md (a11y, formatage @evolve/utils).

import { useTranslations } from 'next-intl'
import { KPICard, SyncBanner, Heading, Text, Icon } from '@evolve/ui'

import type { ClubSummary } from '@/lib/data/admin'
import { useClubSummary } from '@/lib/hooks/useClubSummary'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

export function AdminDashboardView({ initialData }: { initialData: ClubSummary }) {
  const t = useTranslations('admin')
  const { data, isError } = useClubSummary(initialData)
  const sync = useSyncStatus(data.clubId)

  const syncError = sync.isError
    ? sync.error.message === 'rate_limited'
      ? t('dashboard.syncError.rateLimited')
      : t('dashboard.syncError.failed')
    : null

  return (
    <div className="flex flex-col gap-6">
      <Heading level="h1" className="text-[20px]">
        {t('dashboard.title')}
      </Heading>

      {isError && (
        <p role="status" className="text-[12px] text-text-ter">
          {t('staleData')}
        </p>
      )}

      <SyncBanner
        syncedAt={data.syncedAt}
        userRole={data.userRole}
        isSyncing={sync.isPending}
        onSync={() => sync.mutate()}
        errorMessage={syncError}
        syncedAtTemplate={(time) => t('sync.syncedAt', { time })}
        refreshLabel={t('sync.refresh')}
        refreshAriaLabel={t('sync.refreshAria')}
      />

      {data.unpaidCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[10px] border border-data-warning bg-data-warning-50 p-4"
        >
          <Icon name="TriangleAlert" size={20} className="text-data-warning" aria-hidden="true" />
          <Text className="font-semibold">
            {t('dashboard.unpaidAlert', { count: data.unpaidCount })}
          </Text>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title={t('dashboard.kpi.activeMembers')} value={data.activeMembers} format="raw" />
        <KPICard
          title={t('dashboard.kpi.portfolioValue')}
          value={data.portfolioValue}
          format="eur"
        />
        <KPICard
          title={t('dashboard.kpi.totalContributed')}
          value={data.totalContributed}
          format="eur"
        />
        <KPICard title={t('dashboard.kpi.unpaidCount')} value={data.unpaidCount} format="raw" />
      </div>
    </div>
  )
}
