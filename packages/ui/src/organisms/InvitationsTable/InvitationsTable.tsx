'use client'

// InvitationsTable (ADM-007) — tableau des invitations envoyées (vue trésorier).
//
// Présentationnel : aucune logique métier ni formatage. Les dates arrivent
// PRÉ-FORMATÉES (l'app les formate via @evolve/utils). Colonnes : Email · Date d'envoi
// · Expire le · Statut (InvitationStatusBadge) · Actions (Renvoyer / Révoquer).
//
// Règles d'activation des actions (selon statut) :
//   pending  : Renvoyer activé  / Révoquer activé
//   accepted : Renvoyer inactif / Révoquer inactif
//   expired  : Renvoyer activé  / Révoquer inactif
//   revoked  : Renvoyer inactif / Révoquer inactif
// Les lignes revoked/expired affichent l'email barré.
//
// Réf : MembersList / PortfolioTable (table headless), CLAUDE.md (a11y AA, copy FR, zéro hex).

import * as React from 'react'

import { Icon } from '../../atoms/Icon'
import { InvitationStatusBadge, type InvitationStatus } from '../../atoms/InvitationStatusBadge'
import { EmptyState } from '../../molecules/EmptyState'
import { cn } from '../../lib/cn'

/** Ligne d'invitation consommée par la table (dates déjà formatées par l'app). */
export interface InvitationRow {
  id: string
  email: string
  /** Date d'envoi pré-formatée (string d'affichage). */
  sentAt: string
  /** Date d'expiration pré-formatée (string d'affichage). */
  expiresAt: string
  status: InvitationStatus
}

/** En-têtes de colonnes. */
export interface InvitationsTableColumnLabels {
  email: string
  sentAt: string
  expiresAt: string
  status: string
  actions: string
}

const DEFAULT_COLUMN_LABELS: InvitationsTableColumnLabels = {
  email: 'Email',
  sentAt: "Date d'envoi",
  expiresAt: 'Expire le',
  status: 'Statut',
  actions: 'Actions',
}

/** Toutes les chaînes user-facing/a11y. Défauts FR byte-exacts. */
export interface InvitationsTableLabels {
  columns?: Partial<InvitationsTableColumnLabels>
  /** aria-label du tableau. */
  tableLabel?: string
  /** Libellés des statuts (badge). */
  statuses?: {
    pending?: string
    accepted?: string
    expired?: string
    revoked?: string
  }
  /** Titre de l'état vide. */
  emptyTitle?: string
  /** Description de l'état vide. */
  emptyDescription?: string
  /** aria-label « Renvoyer l'invitation à {email} ». */
  resendLabel?: (email: string) => string
  /** aria-label « Révoquer l'invitation de {email} ». */
  revokeLabel?: (email: string) => string
}

const DEFAULT_TABLE_LABEL = 'Invitations envoyées'
const DEFAULT_EMPTY_TITLE = 'Aucune invitation.'
const DEFAULT_EMPTY_DESCRIPTION = 'Invitez votre premier membre pour démarrer la bêta.'

const defaultResendLabel = (email: string) => `Renvoyer l'invitation à ${email}`
const defaultRevokeLabel = (email: string) => `Révoquer l'invitation de ${email}`

/** Activation des actions par statut. */
const CAN_RESEND: Record<InvitationStatus, boolean> = {
  pending: true,
  accepted: false,
  expired: true,
  revoked: false,
}
const CAN_REVOKE: Record<InvitationStatus, boolean> = {
  pending: true,
  accepted: false,
  expired: false,
  revoked: false,
}
/** Email barré pour les statuts « finis » (révoquée/expirée). */
const STRIKETHROUGH: Record<InvitationStatus, boolean> = {
  pending: false,
  accepted: false,
  expired: true,
  revoked: true,
}

export interface InvitationsTableProps {
  invitations: InvitationRow[]
  isLoading?: boolean
  onResend: (id: string) => void
  onRevoke: (id: string) => void
  /**
   * Affiche la colonne d'actions (Renvoyer / Révoquer). false = LECTURE SEULE (ex. secrétaire) :
   * la colonne entière est omise (pas de cellule vide). Défaut true.
   */
  showActions?: boolean
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: InvitationsTableLabels
}

const TH_CLASS = 'text-left text-[12px] font-semibold text-text-ter py-2 px-3 first:pl-0'
const TD_CLASS = 'py-3 px-3 first:pl-0 align-middle text-[14px] text-text'

/** Bouton d'action icône (Renvoyer / Révoquer). Cible tactile ≥ 44px. */
function ActionButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: 'Mail' | 'X'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter',
        'transition-shadow duration-[150ms] hover:bg-neutral-100',
        'focus:outline-none focus-visible:shadow-[var(--sh-glow)]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
      )}
    >
      <Icon name={icon} size={16} aria-hidden="true" />
    </button>
  )
}

/**
 * Tableau des invitations. Présentationnel, non triable (ordre fourni par l'app).
 * États : loading (skeleton), vide (EmptyState), liste.
 */
export function InvitationsTable({
  invitations,
  isLoading,
  onResend,
  onRevoke,
  showActions = true,
  labels,
}: InvitationsTableProps) {
  const columnLabels = { ...DEFAULT_COLUMN_LABELS, ...labels?.columns }
  const tableLabel = labels?.tableLabel ?? DEFAULT_TABLE_LABEL
  const resendLabel = labels?.resendLabel ?? defaultResendLabel
  const revokeLabel = labels?.revokeLabel ?? defaultRevokeLabel
  // Nombre de colonnes (skeleton) : 4 fixes + la colonne d'actions si visible.
  const columnCount = showActions ? 5 : 4

  if (!isLoading && invitations.length === 0) {
    return (
      <EmptyState
        icon="Inbox"
        title={labels?.emptyTitle ?? DEFAULT_EMPTY_TITLE}
        description={labels?.emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
      />
    )
  }

  return (
    // `[contain:layout]` : confine la largeur min-content de la <table> au wrapper (anti scroll
    // horizontal de PAGE sur mobile malgré overflow-x-auto ; cf. MembersList).
    <div className="w-full min-w-0 max-w-full overflow-x-auto [contain:layout]">
      <table className="w-full border-collapse" aria-label={tableLabel}>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={TH_CLASS}>
              {columnLabels.email}
            </th>
            <th scope="col" className={TH_CLASS}>
              {columnLabels.sentAt}
            </th>
            <th scope="col" className={TH_CLASS}>
              {columnLabels.expiresAt}
            </th>
            <th scope="col" className={TH_CLASS}>
              {columnLabels.status}
            </th>
            {showActions && (
              <th scope="col" className={cn(TH_CLASS, 'text-right')}>
                {columnLabels.actions}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: columnCount }).map((__, j) => (
                    <td key={j} className="py-3 px-3 first:pl-0">
                      <div className="h-4 rounded bg-card-sub motion-safe:animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : invitations.map((inv) => (
                <tr
                  key={inv.id}
                  data-testid="invitation-row"
                  className="border-b border-border align-middle"
                >
                  <td className={TD_CLASS}>
                    <span className={cn(STRIKETHROUGH[inv.status] && 'line-through text-text-ter')}>
                      {inv.email}
                    </span>
                  </td>
                  <td className={cn(TD_CLASS, 'text-text-sec')}>{inv.sentAt}</td>
                  <td className={cn(TD_CLASS, 'text-text-sec')}>{inv.expiresAt}</td>
                  <td className={TD_CLASS}>
                    <InvitationStatusBadge status={inv.status} labels={labels?.statuses} />
                  </td>
                  {showActions && (
                    <td className={cn(TD_CLASS, 'text-right')}>
                      <div className="inline-flex items-center gap-1">
                        <ActionButton
                          icon="Mail"
                          label={resendLabel(inv.email)}
                          disabled={!CAN_RESEND[inv.status]}
                          onClick={() => onResend(inv.id)}
                        />
                        <ActionButton
                          icon="X"
                          label={revokeLabel(inv.email)}
                          disabled={!CAN_REVOKE[inv.status]}
                          onClick={() => onRevoke(inv.id)}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
