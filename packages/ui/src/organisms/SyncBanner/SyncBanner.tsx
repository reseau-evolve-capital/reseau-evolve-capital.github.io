'use client'

// Organisme SyncBanner (DSH-008) — bandeau de synchronisation manuelle.
//
// Visible uniquement pour les rôles ≥ trésorier (treasurer | president | network_admin).
// Les membres ne le voient jamais (return null). Le bouton déclenche une sync serveur
// rate-limitée (429). En cas d'erreur, on affiche un message inline discret (pas de
// système de toast dans apps/web) — jamais de rouge brand agressif.
//
// Depuis NTF-006 : SyncBanner est un PRÉRÉGLAGE de l'organisme générique Banner (variante
// « sync »). L'API publique (SyncBannerProps, SyncRole) et tous les comportements existants
// sont conservés : visibilité par rôle, bouton actualiser min-h 44, spinner, errorMessage
// inline, gabarits de copy. Réf : DSH-008, NTF-006, CLAUDE.md.

import * as React from 'react'

import { formatRelativeTime } from '@evolve/utils'

import { Icon } from '../../atoms/Icon'
import { Spinner } from '../../atoms/Spinner'
import { Banner } from '../Banner'

export type SyncRole = 'member' | 'treasurer' | 'president' | 'network_admin'

export interface SyncBannerProps {
  syncedAt: Date | string | null
  userRole: SyncRole
  /** Désactive le bouton (ex: rate-limit côté serveur connu) sans masquer le bandeau. */
  canSync?: boolean
  isSyncing?: boolean
  onSync?: () => void
  /** Message d'erreur inline (ex: rate-limit 429). Affiché en discret, jamais en rouge brand. */
  errorMessage?: string | null
  className?: string
  /** Gabarit du libellé « synchronisé » : reçoit le temps relatif déjà formaté (ou le fallback). Défaut FR. */
  syncedAtTemplate?: (relativeTime: string) => string
  /** Fallback affiché quand syncedAt est null. Défaut « — ». */
  neverSyncedLabel?: string
  /** Libellé du bouton d'actualisation. Défaut FR. */
  refreshLabel?: string
  /** aria-label du bouton d'actualisation. Défaut FR. */
  refreshAriaLabel?: string
}

const PRIVILEGED: readonly SyncRole[] = ['treasurer', 'president', 'network_admin']

export function SyncBanner({
  syncedAt,
  userRole,
  canSync = true,
  isSyncing = false,
  onSync,
  errorMessage = null,
  className,
  syncedAtTemplate = (relativeTime) => `Synchronisé ${relativeTime}`,
  neverSyncedLabel = '—',
  refreshLabel = 'Actualiser',
  refreshAriaLabel = 'Actualiser les données',
}: SyncBannerProps) {
  if (!PRIVILEGED.includes(userRole)) return null

  const label = syncedAtTemplate(syncedAt ? formatRelativeTime(syncedAt) : neverSyncedLabel)

  // Le message inline d'erreur reste DISCRET (text-ter), pas de variante « error » bruyante :
  // on conserve la variante « sync » et on rend le message sous le libellé via le slot actions.
  const message = (
    <span className="flex flex-col gap-1">
      <span>{label}</span>
      {errorMessage ? (
        <span role="status" className="text-[12px] text-text-ter">
          {errorMessage}
        </span>
      ) : null}
    </span>
  )

  const refreshButton = (
    <button
      type="button"
      onClick={() => onSync?.()}
      disabled={!canSync || isSyncing}
      aria-label={refreshAriaLabel}
      aria-busy={isSyncing}
      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 min-h-[44px] text-[13px] font-semibold text-text border border-border cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:shadow-[var(--sh-glow)] outline-none"
    >
      {isSyncing ? <Spinner size={16} /> : <Icon name="RefreshCw" size={16} aria-hidden="true" />}
      {refreshLabel}
    </button>
  )

  // Layout inline (réf DSH-008) : libellé à gauche, bouton « Actualiser » à droite, sur une
  // même ligne. Restauré via l'option actionsLayout="inline" du Banner générique.
  return (
    <Banner
      variant="sync"
      message={message}
      actions={refreshButton}
      actionsLayout="inline"
      {...(className !== undefined ? { className } : {})}
    />
  )
}
