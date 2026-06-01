'use client'

// Vue cotisations admin (ADM-005). Filtre membre en URL (nuqs) → timeline + stats du club.
// Réutilise ContributionsTimeline (organism S6) + KPICard. Formatage via @evolve/utils.
//
// Contrat Select vérifié sur packages/ui/src/atoms/Select/Select.tsx :
//   - SelectItem enveloppe children dans RadixSelect.ItemText en interne → pas de SelectItemText externe.
//   - SelectTrigger passe {...props} à RadixSelect.Trigger → aria-label est transmis au DOM.
//   - aria-label="Filtrer par membre" sur SelectTrigger suffit pour getByLabel() Playwright.

import { useQueryState } from 'nuqs'
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
import { useAdminContributions, type AdminContribPayload } from '@/lib/hooks/useAdminContributions'

const ALL = 'all'

export function AdminCotisationsView({ initialData }: { initialData: AdminContribPayload }) {
  const [member, setMember] = useQueryState('membre')
  const membershipId = member && member !== ALL ? member : null
  const { data, isError } = useAdminContributions(initialData, membershipId)

  // data peut être undefined au 1er rendu filtré (query en cours, pas encore de placeholderData)
  const payload = data ?? initialData
  const stats = payload.stats

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level="h1" className="text-[20px]">
          Cotisations du club
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
          <SelectTrigger aria-label="Filtrer par membre" className="w-56">
            <SelectValue placeholder="Tous les membres" />
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              <SelectItem value={ALL}>Tous les membres</SelectItem>
              {initialData.members.map((m) => (
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
          Impossible d&apos;actualiser les données. Affichage des dernières valeurs connues.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard title="Total cotisé" value={stats.total} format="eur" />
        <KPICard title="Versements" value={stats.count} format="raw" />
        <KPICard title="Versement moyen" value={stats.average} format="eur" />
      </div>

      {payload.years.length === 0 ? (
        <EmptyState
          icon="Calendar"
          title="Aucune cotisation"
          description="Aucun versement enregistré pour ce filtre."
        />
      ) : (
        <ContributionsTimeline years={payload.years} />
      )}
    </div>
  )
}
