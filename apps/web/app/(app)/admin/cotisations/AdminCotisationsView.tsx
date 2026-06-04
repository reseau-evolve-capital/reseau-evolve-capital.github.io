'use client'

// Vue cotisations admin (ADM-005). Filtre membre en URL (nuqs) → timeline + stats du club.
// Réutilise ContributionsTimeline (organism S6) + KPICard. Formatage via @evolve/utils.
//
// Contrat Select vérifié sur packages/ui/src/atoms/Select/Select.tsx :
//   - SelectItem enveloppe children dans RadixSelect.ItemText en interne → pas de SelectItemText externe.
//   - SelectTrigger passe {...props} à RadixSelect.Trigger → aria-label est transmis au DOM.
//   - aria-label="Filtrer par membre" sur SelectTrigger suffit pour getByLabel() Playwright.

import { useQueryState } from 'nuqs'
import { useTranslations } from 'next-intl'
import {
  ContributionsTimeline,
  KPICard,
  Heading,
  EmptyState,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
} from '@evolve/ui'
import {
  useAdminContributions,
  type AdminContribPayload,
  type AdminContribOption,
} from '@/lib/hooks/useAdminContributions'

const ALL = 'all'

export function AdminCotisationsView({
  initialData,
  members,
}: {
  initialData: AdminContribPayload
  members: AdminContribOption[]
}) {
  const t = useTranslations('admin')
  const [member, setMember] = useQueryState('membre')
  const membershipId = member && member !== ALL ? member : null
  const { data, isError, isFetching } = useAdminContributions(initialData, membershipId)

  // data peut être undefined au 1er rendu filtré (query en cours, pas encore de placeholderData)
  const payload = data ?? initialData
  const stats = payload.stats

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level="h1" className="text-[20px]">
          {t('cotisations.title')}
        </Heading>
        {/*
          Accessibilité : aria-label transmis via {...props} de SelectTrigger à RadixSelect.Trigger.
          Playwright getByLabel('Filtrer par membre') fonctionne via cet aria-label.
          La liste des membres est tirée de initialData (stable) — pas de re-fetch nécessaire.
        */}
        <SelectRoot
          value={membershipId ?? ALL}
          onValueChange={(v) => void setMember(v === ALL ? null : v)}
        >
          <SelectTrigger aria-label={t('cotisations.filterMember')} className="w-56">
            <SelectValue placeholder={t('cotisations.allMembers')} />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <SelectItem value={ALL}>{t('cotisations.allMembers')}</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPortal>
        </SelectRoot>
      </div>

      {isError && (
        <p role="status" className="text-[12px] text-text-ter">
          {t('staleData')}
        </p>
      )}

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-3 transition-opacity${
          isFetching ? ' opacity-50' : ''
        }`}
      >
        <KPICard title={t('cotisations.kpi.total')} value={stats.total} format="eur" />
        <KPICard title={t('cotisations.kpi.count')} value={stats.count} format="raw" />
        <KPICard title={t('cotisations.kpi.average')} value={stats.average} format="eur" />
      </div>

      {payload.years.length === 0 ? (
        <EmptyState
          icon="Calendar"
          title={t('cotisations.empty.title')}
          description={t('cotisations.empty.description')}
        />
      ) : (
        <ContributionsTimeline years={payload.years} />
      )}
    </div>
  )
}
