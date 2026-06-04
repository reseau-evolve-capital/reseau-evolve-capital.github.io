import * as React from 'react'
import { Icon } from '../Icon'
import { cn } from '../../lib/cn'

// AccessBadge (ADM-007) — pastille de statut d'accès d'un membre à l'espace.
//
// 3 statuts : actif (point vert), bloqué (icône cadenas) et invité (point orange).
// ⚠ « Bloqué » utilise le token dataviz `data-negative`, JAMAIS le rouge brand
// (branding only). `role="status"` + aria-label pour les lecteurs d'écran.
//
// Note d'intégration : apps/web ne passe que `active` | `locked` pour un membre ;
// `invited` existe pour la fidélité au design (contexte invitations / légende).

export type AccessStatus = 'active' | 'locked' | 'invited'

export interface AccessBadgeLabels {
  active?: string
  locked?: string
  invited?: string
}

const DEFAULT_LABELS: Required<AccessBadgeLabels> = {
  active: 'Actif',
  locked: 'Bloqué',
  invited: 'Invité',
}

/** Couleur du texte par statut (tokens dataviz — zéro hex en dur). */
const textClass: Record<AccessStatus, string> = {
  active: 'text-data-positive',
  locked: 'text-data-negative',
  invited: 'text-data-warning',
}

/** Couleur de la pastille ronde (active/invited) — token de fond plein. */
const dotClass: Record<AccessStatus, string> = {
  active: 'bg-data-positive',
  locked: 'bg-data-negative',
  invited: 'bg-data-warning',
}

export interface AccessBadgeProps {
  status: AccessStatus
  /** Libellés (i18n). Chaque clé absente retombe sur son défaut FR. */
  labels?: AccessBadgeLabels
  className?: string
}

/**
 * Pastille de statut d'accès. Présentationnel : aucune logique métier.
 * - `active` : point vert + « Actif »
 * - `locked` : cadenas (token negative) + « Bloqué » (jamais le rouge brand)
 * - `invited` : point orange + « Invité »
 */
export function AccessBadge({ status, labels, className }: AccessBadgeProps) {
  const label = { ...DEFAULT_LABELS, ...labels }[status]

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-semibold font-body',
        textClass[status],
        className
      )}
    >
      {status === 'locked' ? (
        <Icon name="Lock" size={16} aria-hidden="true" />
      ) : (
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', dotClass[status])}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  )
}
