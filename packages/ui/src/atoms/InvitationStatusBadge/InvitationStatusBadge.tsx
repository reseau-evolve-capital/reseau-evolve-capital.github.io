import * as React from 'react'
import { Badge, type BadgeVariant } from '../Badge'

// InvitationStatusBadge (ADM-007) — statut d'une invitation membre.
//
// Fin wrapper au-dessus de `Badge` : les variantes existantes mappent exactement
// les couleurs de la maquette (warning=orange, success=vert, neutral=gris, error=rouge).
// `revoked` = token dataviz `data-negative` (via Badge variant `error`), jamais le rouge brand.

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface InvitationStatusBadgeLabels {
  pending?: string
  accepted?: string
  expired?: string
  revoked?: string
}

const DEFAULT_LABELS: Required<InvitationStatusBadgeLabels> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  expired: 'Expirée',
  revoked: 'Révoquée',
}

/** Mapping statut → variante Badge (couleurs maquette). */
const STATUS_VARIANT: Record<InvitationStatus, BadgeVariant> = {
  pending: 'warning', // orange/ambre
  accepted: 'success', // vert
  expired: 'neutral', // gris
  revoked: 'error', // rouge dataviz (data-negative)
}

export interface InvitationStatusBadgeProps {
  status: InvitationStatus
  /** Libellés (i18n). Chaque clé absente retombe sur son défaut FR. */
  labels?: InvitationStatusBadgeLabels
  className?: string
}

/** Badge de statut d'invitation. Présentationnel. */
export function InvitationStatusBadge({ status, labels, className }: InvitationStatusBadgeProps) {
  const label = { ...DEFAULT_LABELS, ...labels }[status]
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {label}
    </Badge>
  )
}
