'use client'

// Organisme SyncBanner (DSH-008) — bandeau de synchronisation manuelle.
//
// Visible uniquement pour les rôles ≥ trésorier (treasurer | president | network_admin).
// Les membres ne le voient jamais (return null). Le bouton déclenche une sync serveur
// rate-limitée (429). En cas d'erreur, on affiche un message inline sur token NÉGATIF
// lisible (text-data-negative, AA-safe light/dark) — jamais le rouge brand #E93E3A.
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
  /** Message d'erreur inline (ex: rate-limit 429). Affiché sur token négatif lisible, jamais en rouge brand. */
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

  // B4 : le message d'erreur passe sur le token NÉGATIF lisible (text-data-negative, AA-safe
  // light ET dark — jamais le rouge brand #E93E3A réservé au branding) au lieu du gris discret
  // text-text-ter d'avant. role="alert"/aria-live="assertive" pour l'annoncer (≠ status poli).
  // On conserve la variante « sync » du conteneur (l'erreur sync n'est pas bloquante) mais
  // le message lui-même devient clairement visible.
  const message = (
    <span className="flex flex-col gap-1">
      <span>{label}</span>
      {errorMessage ? (
        <span
          role="alert"
          aria-live="assertive"
          className="text-[12px] font-medium text-data-negative"
        >
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
