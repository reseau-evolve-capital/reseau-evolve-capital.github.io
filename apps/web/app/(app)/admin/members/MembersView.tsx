'use client'

// Vue membres (ADM-003 + ADM-007). Filtre « impayé » en URL state (nuqs) ; tri dans MembersList.
// Colonne Accès + menu d'actions (Bloquer/Débloquer/Voir la fiche) câblés aux Server Actions
// (RPC staff-scopées). « Voir la fiche » réutilise /admin/cotisations filtré par membre (V0 :
// le détail membre dédié + historique d'accès est un follow-up). MembersList reste présentationnel.
// Réf : E-ADM, ADM-007, CLAUDE.md (a11y, formatage @evolve/utils).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useQueryState, parseAsBoolean, parseAsStringEnum } from 'nuqs'
import { useTranslations } from 'next-intl'
import {
  MembersList,
  Heading,
  Switch,
  LockMemberModal,
  EditMemberEmailModal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
  useToast,
  type MemberRow,
} from '@evolve/ui'
import type { ClubMember, MemberStateFilter } from '@/lib/data/admin'
import {
  filterMembers,
  filterByMemberState,
  countActiveMembers,
  ACTIVE_MEMBER_LIMIT,
} from '@/lib/data/admin'
import { useClubMembers, type ClubMembersPayload } from '@/lib/hooks/useClubMembers'
import { lockMemberAction, unlockMemberAction, updateMemberEmailAction } from '../actions'

/** ClubMember (data) → MemberRow (présentationnel). */
function toRow(m: ClubMember): MemberRow {
  return {
    id: m.id,
    fullName: m.fullName,
    email: m.email,
    emailIsPlaceholder: m.emailIsPlaceholder,
    role: m.role,
    totalContributed: m.totalContributed,
    detentionPct: m.detentionPct,
    monthsCount: m.monthsCount,
    status: m.status,
    accessStatus: m.accessStatus,
    membershipStatus: m.membershipStatus,
    leaveAt: m.leaveAt,
  }
}

const FILTER_ID = 'filter-impayes'
const STATE_VALUES = ['all', 'active', 'left'] as const

export function MembersView({ initialData }: { initialData: ClubMembersPayload }) {
  const t = useTranslations('admin')
  const toast = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data, isError } = useClubMembers(initialData)
  const [onlyUnpaid, setOnlyUnpaid] = useQueryState('impayes', parseAsBoolean.withDefault(false))
  const [memberState, setMemberState] = useQueryState(
    'etat',
    parseAsStringEnum<MemberStateFilter>([...STATE_VALUES]).withDefault('all')
  )
  const [isPending, startTransition] = useTransition()
  // Modale partagée blocage/déblocage ; null = fermée.
  const [modal, setModal] = useState<{ member: MemberRow; mode: 'lock' | 'unlock' } | null>(null)
  // Modale d'édition d'email (membre importé sans email) ; null = fermée.
  const [emailModal, setEmailModal] = useState<MemberRow | null>(null)
  // Erreur inline de la modale email (ex. « email déjà utilisé »), réinitialisée à l'ouverture.
  const [emailError, setEmailError] = useState<string | null>(null)

  // Comptage des actifs (sur TOUS les membres, indépendant des filtres) vs limite légale.
  const activeCount = countActiveMembers(data.members)
  const atLimit = activeCount >= ACTIVE_MEMBER_LIMIT

  // Comptes par état d'adhésion, pour suffixer chaque option du filtre (F5).
  // Calculés sur TOUS les membres en mémoire, indépendamment des filtres en cours.
  const totalCount = data.members.length
  const leftCount = totalCount - activeCount

  // Filtres composés : état d'adhésion (tous/actifs/sortis) puis impayé.
  const filtered = filterMembers(filterByMemberState(data.members, memberState), onlyUnpaid)

  function handleConfirm(reason: string | null) {
    const current = modal
    if (!current) return
    startTransition(async () => {
      const res =
        current.mode === 'lock'
          ? await lockMemberAction(current.member.id, reason)
          : await unlockMemberAction(current.member.id)
      if (res.ok) {
        // Invalide tout le préfixe ['admin', …] (membres + KPIs) → refetch RLS treasurer.
        await queryClient.invalidateQueries({ queryKey: ['admin'] })
        setModal(null)
      }
    })
  }

  /** Renseigner / corriger l'email d'un membre → updateMemberEmailAction (RPC staff). */
  function handleEmailSubmit(email: string) {
    const member = emailModal
    if (!member) return
    setEmailError(null)
    startTransition(async () => {
      const res = await updateMemberEmailAction(member.id, email)
      if (res.ok) {
        toast.success({
          title: t('members.email.toast.successTitle'),
          message: t('members.email.toast.successMessage'),
        })
        await queryClient.invalidateQueries({ queryKey: ['admin'] })
        router.refresh()
        setEmailModal(null)
      } else if (res.error === 'duplicate') {
        // Erreur attendue → message inline dans la modale (l'utilisateur peut corriger).
        setEmailError(t('members.email.errors.duplicate'))
      } else if (res.error === 'invalid') {
        setEmailError(t('members.email.errors.invalid'))
      } else if (res.error === 'forbidden' || res.error === 'unauthorized') {
        toast.error({
          title: t('members.email.toast.errorTitle'),
          message: t('members.email.toast.forbiddenMessage'),
        })
        setEmailModal(null)
      } else {
        toast.error({
          title: t('members.email.toast.errorTitle'),
          message: t('members.email.toast.errorMessage'),
        })
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Heading level="h1" className="text-[20px]">
            {t('members.title')}
          </Heading>
          {/*
            Compteur d'actifs vs limite légale (20). role="status" → annoncé aux AT.
            Warning doux (token data-warning-strong, AA) si la limite est atteinte/dépassée.
          */}
          <span
            role="status"
            className={`text-[14px] font-semibold ${
              atLimit ? 'text-data-warning-strong' : 'text-text-sec'
            }`}
          >
            {t('members.activeCount', { count: activeCount, limit: ACTIVE_MEMBER_LIMIT })}
            {atLimit && (
              <span className="ml-1 font-normal text-text-ter">
                {t('members.activeLimitReached')}
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtre d'état d'adhésion (tous / actifs / sortis). aria-label → getByLabel(). */}
          <SelectRoot
            value={memberState}
            onValueChange={(v) => void setMemberState(v as MemberStateFilter)}
          >
            <SelectTrigger aria-label={t('members.stateFilter.label')} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectPortal>
              <SelectContent>
                {/* Chaque option porte son compte (sur tous les membres) → repère rapide (F5). */}
                <SelectItem value="all">
                  {t('members.stateFilter.option', {
                    label: t('members.stateFilter.all'),
                    count: totalCount,
                  })}
                </SelectItem>
                <SelectItem value="active">
                  {t('members.stateFilter.option', {
                    label: t('members.stateFilter.active'),
                    count: activeCount,
                  })}
                </SelectItem>
                <SelectItem value="left">
                  {t('members.stateFilter.option', {
                    label: t('members.stateFilter.left'),
                    count: leftCount,
                  })}
                </SelectItem>
              </SelectContent>
            </SelectPortal>
          </SelectRoot>
          {/*
            Accessibilité : <label htmlFor> + id sur le Switch (Radix passe id au <button> DOM).
            Playwright getByLabel('Afficher seulement les membres en impayé') fonctionne via ce lien.
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
      </div>
      {isError && (
        <p role="status" className="text-[12px] text-text-ter">
          {t('staleData')}
        </p>
      )}
      {/* Nombre de résultats du filtre courant (annoncé aux AT via role="status"). */}
      <p role="status" className="text-[12px] text-text-ter">
        {t('members.resultsCount', { count: filtered.length })}
      </p>
      <MembersList
        members={filtered.map(toRow)}
        onLockMember={(m) => setModal({ member: m, mode: 'lock' })}
        onUnlockMember={(m) => setModal({ member: m, mode: 'unlock' })}
        onViewMember={(m) => router.push(`/admin/cotisations?membre=${m.id}`)}
        onEditMemberEmail={(m) => {
          setEmailError(null)
          setEmailModal(m)
        }}
        labels={{
          columns: {
            fullName: t('members.columns.fullName'),
            role: t('members.columns.role'),
            totalContributed: t('members.columns.totalContributed'),
            detentionPct: t('members.columns.detentionPct'),
            monthsCount: t('members.columns.monthsCount'),
            status: t('members.columns.status'),
            access: t('members.access.column'),
          },
          roles: {
            member: t('members.roles.member'),
            treasurer: t('members.roles.treasurer'),
            president: t('members.roles.president'),
            network_admin: t('members.roles.network_admin'),
          },
          // Membre sorti : « Ancien membre » remplace le badge rôle (F4).
          formerRole: t('members.roles.former'),
          statuses: {
            ok: t('members.statuses.ok'),
            pending: t('members.statuses.pending'),
            late: t('members.statuses.late'),
            exempt: t('members.statuses.exempt'),
          },
          // a11y du statut « — » (aucune cotisation enregistrée) (F3).
          statusNone: t('members.statuses.none'),
          access: {
            active: t('members.access.active'),
            locked: t('members.access.locked'),
          },
          actions: {
            trigger: t('members.access.actions.menu'),
            lock: t('members.access.actions.lock'),
            unlock: t('members.access.actions.unlock'),
            viewProfile: t('members.access.actions.viewProfile'),
            editEmail: t('members.email.action'),
          },
          emailMissing: t('members.email.missing'),
          emptyTitle: t('members.empty.title'),
          emptyDescription: t('members.empty.description'),
          tableLabel: t('members.tableLabel'),
          sortLabel: (column, direction) =>
            t('members.sortLabel', { column, direction: direction || 'none' }),
          detentionBarLabel: (name) => t('members.detentionBarLabel', { name }),
          leftBadge: t('members.left.badge'),
          leftSince: (date) => t('members.left.since', { date }),
        }}
      />
      {modal && (
        <LockMemberModal
          open
          onOpenChange={(o) => {
            if (!o) setModal(null)
          }}
          memberName={modal.member.fullName}
          mode={modal.mode}
          isPending={isPending}
          onConfirm={handleConfirm}
          labels={{
            lockTitle: (name) => t('members.access.lockModal.title', { name }),
            unlockTitle: (name) => t('members.access.unlockModal.title', { name }),
            lockDescription: t('members.access.lockModal.description'),
            unlockDescription: t('members.access.unlockModal.description'),
            reasonLabel: t('members.access.lockModal.reasonLabel'),
            reasonPlaceholder: t('members.access.lockModal.reasonPlaceholder'),
            reasons: {
              unpaid: t('members.access.lockModal.reasons.unpaid'),
              left_club: t('members.access.lockModal.reasons.left'),
              suspended: t('members.access.lockModal.reasons.suspended'),
              other: t('members.access.lockModal.reasons.other'),
            },
            otherPlaceholder: t('members.access.lockModal.otherPlaceholder'),
            cancel: t('members.access.lockModal.cancel'),
            confirmLock: t('members.access.lockModal.confirm'),
            confirmUnlock: t('members.access.unlockModal.confirm'),
          }}
        />
      )}
      {emailModal && (
        <EditMemberEmailModal
          open
          onOpenChange={(o) => {
            if (!o) {
              setEmailModal(null)
              setEmailError(null)
            }
          }}
          memberName={emailModal.fullName}
          isPending={isPending}
          {...(emailError ? { error: emailError } : {})}
          onConfirm={handleEmailSubmit}
          labels={{
            title: (name) => t('members.email.modal.title', { name }),
            description: t('members.email.modal.description'),
            emailLabel: t('members.email.modal.emailLabel'),
            emailPlaceholder: t('members.email.modal.emailPlaceholder'),
            emailHelp: t('members.email.modal.emailHelp'),
            cancel: t('members.email.modal.cancel'),
            confirm: t('members.email.modal.confirm'),
            close: t('members.email.modal.close'),
          }}
        />
      )}
    </div>
  )
}
