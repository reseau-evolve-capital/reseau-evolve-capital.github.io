'use client'

// Vue « Bureau du réseau » (NET-020, maquette « Reseau - Roles & Statuts » écran 04).
//
// Gestion des rôles RÉSEAU : table (Membre · Rôle réseau · Titre · Actions) + bouton « Ajouter au
// bureau » (network_admin uniquement). L'attribution passe par un Dialog Radix (membre + rôle +
// titre) → grantBoardRoleAction (RPC network_grant_role). Le retrait passe par SensitiveConfirmModal
// → revokeBoardRoleAction (RPC network_revoke_role). Le garde-fou « dernier admin » vit DANS la RPC
// (migration 042) : on NE duplique PAS la logique côté client — on laisse la RPC trancher et on rend
// son erreur en `data-warning` (toast warning + message dans la modale).
//
// network_board = LECTURE SEULE : badge « LECTURE SEULE », aucune action (comme /reseau/clubs).
//
// Présentationnel + état local (Dialog/modale). Après une mutation réussie, on rafraîchit via
// router.refresh() (re-fetch RSC). Tokens uniquement (action « Retirer » = data-negative ; garde-fou
// dernier admin = data-warning ; jamais le rouge brand). i18n next-intl ; a11y AA (cibles ≥ 44px,
// focus visible, Dialog/modale labellisés).
//
// Réf : ClubDetailView (useToast + SensitiveConfirmModal), ReseauTabs (Dialog Radix drawer),
//   ClubsView (en-tête role-aware + badge LECTURE SEULE), maquette écran 04.

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Avatar,
  Badge,
  EmptyState,
  Heading,
  Icon,
  SensitiveConfirmModal,
  Text,
  useToast,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
  type BadgeVariant,
} from '@evolve/ui'
import type {
  NetworkBoardMember,
  NetworkEligibleMember,
  NetworkRole,
  NetworkTitle,
} from '@/lib/data/network'
import { grantBoardRoleAction, revokeBoardRoleAction } from './actions'

const ROLES: readonly NetworkRole[] = ['network_admin', 'network_board']
const TITLES: readonly NetworkTitle[] = ['president', 'vice_president', 'treasurer', 'secretary']

/** Valeur sentinelle du Select titre = « aucun titre » (Radix Select n'accepte pas value=""). */
const NO_TITLE = '__none__'

export interface BureauPayload {
  board: NetworkBoardMember[]
  eligible: NetworkEligibleMember[]
}

export function BureauView({
  initialData,
  isAdmin,
  currentUserId,
}: {
  initialData: BureauPayload
  /** network_admin → actions (ajouter / modifier / retirer). network_board → LECTURE SEULE. */
  isAdmin: boolean
  /** user courant : sert à étiqueter sa propre ligne (« vous ») dans la table. */
  currentUserId: string
}) {
  const t = useTranslations('reseau.bureau')
  const tc = useTranslations('common')
  const router = useRouter()
  const toast = useToast()
  const { board, eligible } = initialData

  // Dialog grant (ajouter / modifier). `editing` non-null = modification d'un membre existant.
  const [grantOpen, setGrantOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<NetworkBoardMember | null>(null)
  // Modale revoke. `removing` = membre ciblé par le retrait.
  const [removing, setRemoving] = React.useState<NetworkBoardMember | null>(null)
  const [pending, startTransition] = React.useTransition()

  const roleVariant = (role: NetworkRole): BadgeVariant =>
    role === 'network_admin' ? 'brand' : 'neutral'

  function openAdd() {
    setEditing(null)
    setGrantOpen(true)
  }
  function openEdit(member: NetworkBoardMember) {
    setEditing(member)
    setGrantOpen(true)
  }

  function handleGrant(userId: string, role: NetworkRole, title: NetworkTitle | null) {
    startTransition(async () => {
      const res = await grantBoardRoleAction(userId, role, title)
      if (!res.ok) {
        toast.error({ title: t('toast.grantErrorTitle'), message: errorMessage(res.error, t) })
        return
      }
      setGrantOpen(false)
      setEditing(null)
      toast.success({ title: t('toast.grantSuccess') })
      router.refresh()
    })
  }

  function handleRevoke(member: NetworkBoardMember) {
    startTransition(async () => {
      const res = await revokeBoardRoleAction(member.userId)
      if (!res.ok) {
        // Garde-fou « dernier admin » (data-warning) vs autres erreurs (data-negative).
        if (res.error === 'last_admin') {
          toast.warning({ title: t('toast.lastAdminTitle'), message: t('toast.lastAdminMessage') })
        } else {
          toast.error({ title: t('toast.revokeErrorTitle'), message: errorMessage(res.error, t) })
        }
        return
      }
      setRemoving(null)
      toast.success({ title: t('toast.revokeSuccess') })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête : titre + sous-titre + CTA admin / badge lecture seule. */}
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
            onClick={openAdd}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-brand-yellow px-4 py-2 text-[14px] font-semibold text-accent-ink transition-shadow duration-[150ms] hover:brightness-95 focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
          >
            <Icon name="Plus" size={16} aria-hidden="true" />
            {t('addToBoard')}
          </button>
        ) : (
          <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-text-ter">
            <Icon name="Eye" size={16} aria-hidden="true" />
            {t('readOnly')}
          </span>
        )}
      </div>

      {/* Tableau du bureau. État empty explicite si aucun membre réseau. */}
      {board.length === 0 ? (
        <EmptyState icon="Crown" title={t('empty.title')} description={t('empty.description')} />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-border bg-card">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">{t('table.caption')}</caption>
            <thead>
              <tr className="border-b border-border text-[12px] uppercase tracking-wide text-text-ter">
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('table.columns.member')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('table.columns.role')}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t('table.columns.title')}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t('table.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {board.map((member) => (
                <tr key={member.userId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.fullName}
                        src={member.avatarUrl ?? undefined}
                        size="sm"
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[14px] font-medium text-text">
                          {member.fullName}
                          {member.userId === currentUserId && (
                            <span className="ml-1.5 text-[12px] font-normal text-text-ter">
                              {t('table.you')}
                            </span>
                          )}
                        </span>
                        <span className="truncate text-[12px] text-text-ter">{member.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant(member.role)}>{t(`roles.${member.role}`)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-text-sec">
                    {member.title ? t(`titles.${member.title}`) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(member)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-border px-3 py-2 text-[13px] font-semibold text-text-sec transition-colors hover:text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
                        >
                          <Icon name="Pencil" size={16} aria-hidden="true" />
                          {t('table.actions.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving(member)}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-data-negative-50 px-3 py-2 text-[13px] font-semibold text-data-negative transition-colors hover:bg-data-negative-50 focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
                        >
                          <Icon name="Trash2" size={16} aria-hidden="true" />
                          {t('table.actions.remove')}
                        </button>
                      </div>
                    ) : (
                      <span className="block text-right text-[12px] text-text-ter">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog grant (ajouter / modifier) — network_admin uniquement. Le Dialog.Root vit ici ;
          le formulaire est REMONTÉ à chaque ouverture/édition (key) pour initialiser son état
          local depuis les props, SANS useEffect (cf. react-hooks/set-state-in-effect). */}
      {isAdmin && (
        <Dialog.Root
          open={grantOpen}
          onOpenChange={(o) => {
            setGrantOpen(o)
            if (!o) setEditing(null)
          }}
        >
          {grantOpen && (
            <GrantDialogForm
              key={editing?.userId ?? 'add'}
              editing={editing}
              eligible={eligible}
              pending={pending}
              onSubmit={handleGrant}
            />
          )}
        </Dialog.Root>
      )}

      {/* Modale revoke — SensitiveConfirmModal (action sensible). */}
      {isAdmin && (
        <SensitiveConfirmModal
          open={removing !== null}
          onOpenChange={(o) => {
            if (!o) setRemoving(null)
          }}
          title={t('revoke.title', { name: removing?.fullName ?? '' })}
          description={t('revoke.description')}
          acknowledgeLabel={t('revoke.acknowledge')}
          cancelLabel={tc('cancel')}
          confirmLabel={t('revoke.confirm')}
          closeLabel={tc('close')}
          isPending={pending}
          onConfirm={() => removing && handleRevoke(removing)}
        />
      )}
    </div>
  )
}

/** Mappe une clé d'erreur métier (Server Action) vers un message i18n lisible. */
function errorMessage(code: string, t: ReturnType<typeof useTranslations>): string {
  switch (code) {
    case 'forbidden':
    case 'unauthorized':
      return t('errors.forbidden')
    case 'not_found':
      return t('errors.notFound')
    case 'last_admin':
      return t('toast.lastAdminMessage')
    case 'invalid':
      return t('errors.invalid')
    default:
      return t('errors.unknown')
  }
}

/**
 * Corps du Dialog Radix « Ajouter au bureau » / « Modifier le rôle » : Select membre (désactivé en
 * édition) + Select rôle + Select titre (optionnel). Le bouton de confirmation reste désactivé tant
 * qu'aucun membre n'est choisi. Labellisé (Title/Description) ; fermeture Escape/overlay.
 *
 * Ce composant est REMONTÉ (key) à chaque ouverture/édition par le parent : son état local est donc
 * initialisé une fois depuis les props (lazy useState), SANS useEffect de synchronisation — ce qui
 * évite le anti-pattern `react-hooks/set-state-in-effect` (cf. gotcha repo PWA-001).
 */
function GrantDialogForm({
  editing,
  eligible,
  pending,
  onSubmit,
}: {
  editing: NetworkBoardMember | null
  eligible: NetworkEligibleMember[]
  pending: boolean
  onSubmit: (userId: string, role: NetworkRole, title: NetworkTitle | null) => void
}) {
  const t = useTranslations('reseau.bureau')
  const tc = useTranslations('common')

  // Init lazy depuis les props (le composant est keyé → remonté à chaque ouverture/édition).
  const [userId, setUserId] = React.useState<string>(() => editing?.userId ?? '')
  const [role, setRole] = React.useState<NetworkRole>(() => editing?.role ?? 'network_board')
  const [title, setTitle] = React.useState<string>(() => editing?.title ?? NO_TITLE)

  const isEdit = editing !== null
  const canSubmit = userId !== '' && !pending

  function submit() {
    if (!canSubmit) return
    onSubmit(userId, role, title === NO_TITLE ? null : (title as NetworkTitle))
  }

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-border bg-card p-6 shadow-[var(--sh-pop)] motion-safe:animate-in motion-safe:fade-in">
        <Dialog.Title className="font-display text-[18px] font-extrabold text-text">
          {isEdit ? t('dialog.editTitle') : t('dialog.addTitle')}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-[13px] text-text-sec">
          {t('dialog.description')}
        </Dialog.Description>

        <div className="mt-5 flex flex-col gap-4">
          {/* Membre : Select recherche-libre. Désactivé en édition (PK = user_id figée). */}
          <FieldLabel label={t('dialog.memberLabel')}>
            <SelectRoot value={userId} onValueChange={setUserId} disabled={isEdit}>
              <SelectTrigger aria-label={t('dialog.memberLabel')}>
                <SelectValue placeholder={t('dialog.memberPlaceholder')} />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent>
                  {eligible.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.fullName}
                      {m.isMember ? ` · ${t('dialog.alreadyMember')}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </FieldLabel>

          {/* Rôle réseau. */}
          <FieldLabel label={t('dialog.roleLabel')}>
            <SelectRoot value={role} onValueChange={(v) => setRole(v as NetworkRole)}>
              <SelectTrigger aria-label={t('dialog.roleLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`roles.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </FieldLabel>

          {/* Titre (optionnel). */}
          <FieldLabel label={t('dialog.titleLabel')}>
            <SelectRoot value={title} onValueChange={setTitle}>
              <SelectTrigger aria-label={t('dialog.titleLabel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent>
                  <SelectItem value={NO_TITLE}>{t('dialog.noTitle')}</SelectItem>
                  {TITLES.map((ti) => (
                    <SelectItem key={ti} value={ti}>
                      {t(`titles.${ti}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </FieldLabel>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Dialog.Close asChild>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center rounded-[10px] border border-border px-4 py-2 text-[14px] font-semibold text-text-sec focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
            >
              {tc('cancel')}
            </button>
          </Dialog.Close>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] bg-brand-yellow px-4 py-2 text-[14px] font-semibold text-accent-ink transition-shadow duration-[150ms] hover:brightness-95 focus:outline-none focus-visible:shadow-[var(--sh-glow)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEdit ? t('dialog.save') : t('dialog.add')}
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

/** Petit wrapper label + champ (a11y : le label enveloppe le contrôle). */
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-text-sec">{label}</span>
      {children}
    </label>
  )
}
