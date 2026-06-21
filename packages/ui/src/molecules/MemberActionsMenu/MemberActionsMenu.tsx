'use client'

// MemberActionsMenu (ADM-007) — menu d'actions par ligne membre (table trésorier).
//
// Trigger icône « ··· » (aria-label requis) ouvrant un Radix DropdownMenu :
// navigation clavier complète et focus-trap gérés par Radix. Actions selon le statut :
// - active  → « Bloquer l'accès » (texte negative, icône cadenas) + « Voir la fiche »
// - locked  → « Débloquer » (icône cadenas ouvert) + « Voir la fiche »
//
// Présentationnel : aucune logique métier, toutes les actions remontent par callback.
// « Bloquer » utilise le token dataviz `data-negative`, jamais le rouge brand.
// Réf : AppTopbar (pattern Radix DropdownMenu), CLAUDE.md (a11y AA, copy FR, zéro hex).

import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

import { Icon } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export interface MemberActionsMenuLabels {
  /** `aria-label` du trigger « ··· ». */
  trigger?: string
  /** Entrée « Bloquer l'accès » (statut active). */
  lock?: string
  /** Entrée « Débloquer » (statut locked). */
  unlock?: string
  /** Entrée « Voir la fiche ». */
  viewProfile?: string
  /** Entrée « Renseigner l'email » (membre importé sans email réel). */
  editEmail?: string
  /** Entrée « Modifier le rôle » (ADM-008). */
  editRole?: string
}

const DEFAULT_LABELS: Required<MemberActionsMenuLabels> = {
  trigger: 'Actions',
  lock: "Bloquer l'accès",
  unlock: 'Débloquer',
  viewProfile: 'Voir la fiche',
  editEmail: "Renseigner l'email",
  editRole: 'Modifier le rôle',
}

export interface MemberActionsMenuProps {
  accessStatus: 'active' | 'locked'
  onLock?: () => void
  onUnlock?: () => void
  onViewProfile?: () => void
  /** Action « Renseigner l'email » — n'apparaît que si fournie (membre sans email réel). */
  onEditEmail?: () => void
  /** Action « Modifier le rôle » (ADM-008) — n'apparaît que si fournie (membre actif, staff). */
  onEditRole?: () => void
  /** Libellés (i18n). Chaque clé absente retombe sur son défaut FR. */
  labels?: MemberActionsMenuLabels
  className?: string
}

const ITEM_CLASS = cn(
  'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2',
  'text-[14px] outline-none data-[highlighted]:bg-neutral-100'
)

/** Menu contextuel d'actions sur un membre. Trigger icône, items Radix. */
export function MemberActionsMenu({
  accessStatus,
  onLock,
  onUnlock,
  onViewProfile,
  onEditEmail,
  onEditRole,
  labels,
  className,
}: MemberActionsMenuProps) {
  const t = { ...DEFAULT_LABELS, ...labels }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t.trigger}
        className={cn(
          'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter',
          'transition-shadow duration-[150ms]',
          'focus:outline-none focus-visible:shadow-[var(--sh-glow)] hover:bg-neutral-100',
          className
        )}
      >
        <Icon name="Ellipsis" size={20} aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={cn(
            'z-50 min-w-[12rem] overflow-hidden rounded-[10px] p-1',
            'bg-card border border-border shadow-[var(--sh-pop)]'
          )}
        >
          {accessStatus === 'active' ? (
            <DropdownMenu.Item
              onSelect={() => onLock?.()}
              className={cn(ITEM_CLASS, 'text-data-negative')}
            >
              <Icon name="Lock" size={16} aria-hidden="true" />
              <span>{t.lock}</span>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              onSelect={() => onUnlock?.()}
              className={cn(ITEM_CLASS, 'text-data-positive')}
            >
              <Icon name="LockOpen" size={16} aria-hidden="true" />
              <span>{t.unlock}</span>
            </DropdownMenu.Item>
          )}

          {onEditRole && (
            <DropdownMenu.Item
              onSelect={() => onEditRole()}
              className={cn(ITEM_CLASS, 'text-text')}
            >
              <Icon name="UserCog" size={16} aria-hidden="true" />
              <span>{t.editRole}</span>
            </DropdownMenu.Item>
          )}

          {onEditEmail && (
            <DropdownMenu.Item
              onSelect={() => onEditEmail()}
              className={cn(ITEM_CLASS, 'text-text')}
            >
              <Icon name="Mail" size={16} aria-hidden="true" />
              <span>{t.editEmail}</span>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={() => onViewProfile?.()}
            className={cn(ITEM_CLASS, 'text-text')}
          >
            <Icon name="User" size={16} aria-hidden="true" />
            <span>{t.viewProfile}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
