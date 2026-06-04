'use client'

// Vue membres (ADM-003). Filtre « impayé » en URL state (nuqs) ; le tri vit dans MembersList.
// MembersList reste présentationnel → on lui passe la liste déjà filtrée + mappée (MemberRow).
// Réf : E-ADM, CLAUDE.md (a11y, formatage @evolve/utils).

import { useQueryState, parseAsBoolean } from 'nuqs'
import { useTranslations } from 'next-intl'
import { MembersList, Heading, Switch, type MemberRow } from '@evolve/ui'
import type { ClubMember } from '@/lib/data/admin'
import { filterMembers } from '@/lib/data/admin'
import { useClubMembers, type ClubMembersPayload } from '@/lib/hooks/useClubMembers'

/** ClubMember (data) → MemberRow (présentationnel). */
function toRow(m: ClubMember): MemberRow {
  return {
    id: m.id,
    fullName: m.fullName,
    email: m.email,
    role: m.role,
    totalContributed: m.totalContributed,
    detentionPct: m.detentionPct,
    monthsCount: m.monthsCount,
    status: m.status,
  }
}

const FILTER_ID = 'filter-impayes'

export function MembersView({ initialData }: { initialData: ClubMembersPayload }) {
  const t = useTranslations('admin')
  const { data, isError } = useClubMembers(initialData)
  const [onlyUnpaid, setOnlyUnpaid] = useQueryState('impayes', parseAsBoolean.withDefault(false))

  const filtered = filterMembers(data.members, onlyUnpaid)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level="h1" className="text-[20px]">
          {t('members.title')}
        </Heading>
        {/*
          Accessibilité : <label htmlFor> + id sur le Switch (Radix passe id au <button> DOM).
          Playwright getByLabel('Afficher seulement les membres en impayé') fonctionne via ce lien.
          onCheckedChange : (checked: boolean) => void — API Radix via SwitchProps.
        */}
        <div className="flex items-center gap-2">
          <Switch
            id={FILTER_ID}
            checked={onlyUnpaid}
            onCheckedChange={(v) => void setOnlyUnpaid(v)}
          />
          <label htmlFor={FILTER_ID} className="text-[14px] text-text-sec cursor-pointer">
            {t('members.filterUnpaid')}
          </label>
        </div>
      </div>
      {isError && (
        <p role="status" className="text-[12px] text-text-ter">
          {t('staleData')}
        </p>
      )}
      <MembersList
        members={filtered.map(toRow)}
        labels={{
          columns: {
            fullName: t('members.columns.fullName'),
            role: t('members.columns.role'),
            totalContributed: t('members.columns.totalContributed'),
            detentionPct: t('members.columns.detentionPct'),
            monthsCount: t('members.columns.monthsCount'),
            status: t('members.columns.status'),
          },
          roles: {
            member: t('members.roles.member'),
            treasurer: t('members.roles.treasurer'),
            president: t('members.roles.president'),
            network_admin: t('members.roles.network_admin'),
          },
          statuses: {
            ok: t('members.statuses.ok'),
            pending: t('members.statuses.pending'),
            late: t('members.statuses.late'),
            exempt: t('members.statuses.exempt'),
          },
          emptyTitle: t('members.empty.title'),
          emptyDescription: t('members.empty.description'),
          tableLabel: t('members.tableLabel'),
          sortLabel: (column, direction) =>
            t('members.sortLabel', { column, direction: direction || 'none' }),
          detentionBarLabel: (name) => t('members.detentionBarLabel', { name }),
        }}
      />
    </div>
  )
}
