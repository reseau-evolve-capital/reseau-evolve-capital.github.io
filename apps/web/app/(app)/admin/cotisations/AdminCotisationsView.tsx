'use client'

// Vue cotisations admin V2 (T6 — câblage mode club / mode membre + RelanceModal).
//
// Mode CLUB  (membershipId == null) : ClubCotisationsPanel — synthèse + KPI + RegulariserList.
// Mode MEMBRE (membershipId != null) : MemberCotisationsPanel — fiche individuelle.
// RelanceModal : contrôlée par état local (relanceOpen / relanceMemberId / relanceMemberName).
//
// Contrat Select : aria-label transmis via {...props} de SelectTrigger à RadixSelect.Trigger.
// Sélecteur visible uniquement en mode CLUB — en mode MEMBRE, bouton « ← Tous les membres ».

import { useState } from 'react'
import { useQueryState } from 'nuqs'
import { useTranslations } from 'next-intl'
import {
  Heading,
  EmptyState,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
} from '@evolve/ui'
import { ClubCotisationsPanel } from '@/components/admin/ClubCotisationsPanel'
import { MemberCotisationsPanel } from '@/components/admin/MemberCotisationsPanel'
import { RelanceModal } from '@/components/admin/RelanceModal'
import { useAdminContributions, type AdminContribOption } from '@/lib/hooks/useAdminContributions'
import type { AdminContribPayload } from '@/lib/data/admin'

const ALL = 'all'

export function AdminCotisationsView({
  initialData,
  members,
  currency = 'EUR',
}: {
  initialData: AdminContribPayload
  members: AdminContribOption[]
  /** Code ISO 4217 de la devise du club actif (ex. 'EUR', 'XOF'). Défaut 'EUR'. */
  currency?: string
}) {
  const t = useTranslations('admin')
  const [membre, setMembre] = useQueryState('membre')
  const membershipId = membre && membre !== ALL ? membre : null

  const { data, isError, isFetching } = useAdminContributions(initialData, membershipId)
  const payload = data ?? initialData

  // État RelanceModal
  const [relanceOpen, setRelanceOpen] = useState(false)
  const [relanceMemberId, setRelanceMemberId] = useState<string>('')
  const [relanceMemberName, setRelanceMemberName] = useState<string>('')

  const openRelance = (mId: string, mName: string) => {
    setRelanceMemberId(mId)
    setRelanceMemberName(mName)
    setRelanceOpen(true)
  }

  const closeRelance = () => setRelanceOpen(false)

  // Mode CLUB : on retrouve le nom depuis regulariserList
  const handleClubRelancer = (mId: string) => {
    const item = payload.regulariserList.find((m) => m.membershipId === mId)
    openRelance(mId, item?.fullName ?? '')
  }

  // Mode MEMBRE : on utilise le nom du membre déjà chargé
  const handleMemberRelancer = (mId: string) => {
    openRelance(mId, payload.member?.fullName ?? '')
  }

  // lateMonths pour la RelanceModal : si on est en mode membre, on les a ;
  // sinon on passe [] (le message se construit sans liste de mois).
  const relanceLateMonths =
    relanceMemberId === membershipId && payload.member != null ? payload.member.lateMonths : []

  const relanceAmountDue =
    relanceMemberId === membershipId && payload.member != null
      ? payload.member.amountDue
      : (payload.regulariserList.find((m) => m.membershipId === relanceMemberId)?.amountDue ?? 0)

  return (
    <div className="flex flex-col gap-6">
      {/* ── En-tête : titre + sélecteur (mode club) ou bouton retour (mode membre) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level="h1" className="text-[20px]">
          {t('cotisations.title')}
        </Heading>

        {membershipId ? (
          <button
            type="button"
            onClick={() => void setMembre(null)}
            className="text-[13px] font-semibold text-text-ter hover:text-text transition-colors"
          >
            {t('cotisations.backToClub')}
          </button>
        ) : (
          <SelectRoot
            value={membershipId ?? ALL}
            onValueChange={(v) => void setMembre(v === ALL ? null : v)}
          >
            <SelectTrigger aria-label={t('cotisations.filterMember')} className="w-full sm:w-56">
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
        )}
      </div>

      {/* ── Indicateur données périmées ── */}
      {isError && (
        <p role="status" className="text-[12px] text-text-ter">
          {t('staleData')}
        </p>
      )}

      {/* ── Contenu principal (club ou membre) ── */}
      <div className={isFetching ? 'opacity-50 transition-opacity' : undefined}>
        {membershipId == null ? (
          <ClubCotisationsPanel
            clubStats={payload.clubStats}
            regulariserList={payload.regulariserList}
            currency={currency}
            onMemberSelect={(id) => void setMembre(id)}
            onRelancer={handleClubRelancer}
          />
        ) : payload.member != null ? (
          <MemberCotisationsPanel
            member={payload.member}
            currency={currency}
            onRelancer={handleMemberRelancer}
            membershipId={membershipId}
          />
        ) : (
          <EmptyState
            icon="Calendar"
            title={t('cotisations.empty.title')}
            description={t('cotisations.empty.description')}
          />
        )}
      </div>

      {/* ── Modale de relance ── */}
      <RelanceModal
        open={relanceOpen}
        onClose={closeRelance}
        memberName={relanceMemberName}
        membershipId={relanceMemberId}
        lateMonths={relanceLateMonths}
        amountDue={relanceAmountDue}
        currency={currency}
        memberEmail={null}
        clubId={initialData.clubId}
      />
    </div>
  )
}
