'use client'

// Vue « Liste des clubs » (NET-005). En-tête (titre + sous-titre + CTA « + Ajouter un club »
// réservé network_admin ; badge LECTURE SEULE pour network_board) + bandeau 3 KPICard +
// NetworkClubsTable (présentationnel). Le RPC pré-agrège et la garde réseau est portée par
// la page/le layout — cette vue reste présentationnelle et role-aware.
//
// Action « Voir » → /reseau/clubs/[id] (fiche club, NET-008 sur la même branche : route à venir,
// 404 transitoire assumé comme /reseau). L'action « Synchroniser » par club est différée à
// NET-008 (déclenchée depuis la fiche, section « Matrice & synchronisation ») : on ne câble donc
// PAS `onSync` ici pour ne pas afficher un bouton non fonctionnel.
//
// Réf : AdminDashboardView (bandeau KPICard), MembersView (vue role-aware), spec E-NET §Écran 1.

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { KPICard, NetworkClubsTable, Heading, Text, Icon, type NetworkClubRow } from '@evolve/ui'
import type { NetworkClubsPayload } from '@/lib/data/network'

export function ClubsView({
  initialData,
  isAdmin,
}: {
  initialData: NetworkClubsPayload
  /** network_admin → CTA « + Ajouter un club ». network_board → badge LECTURE SEULE. */
  isAdmin: boolean
}) {
  const t = useTranslations('reseau.clubs')
  const locale = useLocale()
  const router = useRouter()
  const { clubs, kpis } = initialData

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête de contenu : titre + sous-titre + CTA admin / badge lecture seule. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading level="h1" className="text-[20px]">
            {t('title')}
          </Heading>
          <Text className="text-[14px] text-text-sec">{t('subtitle')}</Text>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => router.push('/reseau/clubs/nouveau')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-brand-yellow px-4 py-2 text-[14px] font-semibold text-accent-ink transition-shadow duration-[150ms] hover:brightness-95 focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
          >
            <Icon name="Plus" size={16} aria-hidden="true" />
            {t('addClub')}
          </button>
        ) : (
          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-text-ter">
            <Icon name="Eye" size={16} aria-hidden="true" />
            {t('readOnly')}
          </span>
        )}
      </div>

      {/* Bandeau KPI. La pill de variation est volontairement absente : pas de delta sans
          historique sur le réseau (cf. spec — pas de delta quand 0 club / pas de valo). */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard title={t('kpi.clubs')} value={kpis.clubsCount} format="raw" icon="Building2" />
        <KPICard
          title={t('kpi.members')}
          value={kpis.totalActiveMembers}
          format="raw"
          icon="Users"
        />
        <KPICard
          title={t('kpi.capital')}
          // Capital cumulé : « — » tant qu'aucun club n'a de valo (jamais « 0 € » trompeur).
          value={kpis.cumulativeCapital == null ? '—' : kpis.cumulativeCapital}
          format={kpis.cumulativeCapital == null ? 'raw' : 'eur'}
          icon="Wallet"
        />
      </div>

      {/* Tableau des clubs (présentationnel). « Voir » navigue vers la fiche club. */}
      <NetworkClubsTable
        clubs={clubs}
        onView={(club: NetworkClubRow) => router.push(`/reseau/clubs/${club.id}`)}
        labels={{
          locale,
          columns: {
            club: t('table.columns.club'),
            createdAt: t('table.columns.createdAt'),
            members: t('table.columns.members'),
            valuation: t('table.columns.valuation'),
            lastSync: t('table.columns.lastSync'),
            matrix: t('table.columns.matrix'),
            actions: t('table.columns.actions'),
          },
          tableLabel: t('table.tableLabel'),
          syncStatuses: {
            ok: t('table.sync.ok'),
            stale: t('table.sync.stale'),
            never: t('table.sync.never'),
          },
          neverSynced: t('table.sync.neverSynced'),
          matrix: {
            connected: t('table.matrix.connected'),
            disconnected: t('table.matrix.disconnected'),
          },
          disabledBadge: t('table.disabledBadge'),
          valuationNone: t('table.valuationNone'),
          viewLabel: (name) => t('table.actions.view', { name }),
          syncLabel: (name) => t('table.actions.sync', { name }),
          emptyTitle: t('table.empty.title'),
          emptyDescription: t('table.empty.description'),
        }}
      />
    </div>
  )
}
