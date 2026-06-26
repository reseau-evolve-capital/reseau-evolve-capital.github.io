'use client'

// ChangeRoleModal (ADM-008) — modale « Modifier le rôle » d'un membre du club.
//
// Radix Dialog (focus-trap, Escape, Title + Description requis). Select de rôle CLUB
// (Membre / Trésorier / Président) + encart d'avertissement data-warning expliquant que le rôle
// défini ici ne sera PLUS écrasé par la synchronisation Google Sheets (matérialise role_source='manual').
//
// ANTI-ESCALADE visuelle : l'option « Président » n'apparaît que si `canPromotePresident` est vrai
// (un trésorier ne voit pas l'option). La règle est aussi appliquée côté RPC (défense en profondeur).
//
// Présentationnel : zéro logique métier ni i18n. Modèle = LockMemberModal. Réf : CLAUDE.md (a11y AA,
// copy FR, zéro hex, token data-warning jamais le rouge brand).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
} from '../../atoms/Select'
import { cn } from '../../lib/cn'

/** Rôles club éditables depuis la modale (network_admin = scope réseau, jamais ici).
 *  `secretary` = accès LECTURE SEULE (aucune escalade : attribuable par tout staff). */
export type EditableRole = 'member' | 'secretary' | 'treasurer' | 'president'

export interface ChangeRoleModalLabels {
  /** Gabarit du titre. Reçoit le nom du membre. */
  title?: (memberName: string) => string
  /** Paragraphe explicatif sous le titre. */
  description?: string
  /** Label du champ rôle. */
  roleLabel?: string
  /** Placeholder du Select de rôle. */
  rolePlaceholder?: string
  /** Libellés des options de rôle. */
  roles?: Partial<Record<EditableRole, string>>
  /** Texte de l'encart d'avertissement (data-warning) « ne sera plus écrasé par la sync ». */
  warning?: string
  /** Bouton « Annuler ». */
  cancel?: string
  /** Bouton de confirmation « Enregistrer ». */
  confirm?: string
  /** aria-label du bouton fermer. */
  close?: string
}

const DEFAULT_LABELS: Required<Omit<ChangeRoleModalLabels, 'roles'>> & {
  roles: Record<EditableRole, string>
} = {
  title: (name) => `Modifier le rôle de ${name}`,
  description:
    'Choisissez le rôle de ce membre dans le club. Ce changement prend effet immédiatement.',
  roleLabel: 'Rôle',
  rolePlaceholder: 'Choisir un rôle',
  roles: {
    member: 'Membre',
    secretary: 'Secrétaire',
    treasurer: 'Trésorier',
    president: 'Président',
  },
  warning:
    'Ce rôle a été défini manuellement et ne sera plus écrasé par la synchronisation Google Sheets.',
  cancel: 'Annuler',
  confirm: 'Enregistrer',
  close: 'Fermer',
}

export interface ChangeRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  /** Rôle courant du membre (pré-sélectionné). */
  currentRole: EditableRole
  /**
   * Anti-escalade : si faux, l'option « Président » est masquée (un trésorier ne peut pas
   * nommer un président). Défaut `false` (le plus restrictif).
   */
  canPromotePresident?: boolean
  /** Reçoit le rôle choisi. Appelé uniquement si le rôle a changé. */
  onConfirm: (role: EditableRole) => void
  isPending?: boolean
  /** Erreur inline (ex. « action refusée »), affichée en bas de la modale. */
  error?: string
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: ChangeRoleModalLabels
}

const ROLE_KEYS: readonly EditableRole[] = ['member', 'secretary', 'treasurer', 'president']

/**
 * Modale « Modifier le rôle » (Radix Dialog). Select de rôle borné par l'anti-escalade,
 * encart data-warning, CTA « Enregistrer ». Le rôle choisi est remonté via onConfirm.
 */
export function ChangeRoleModal({
  open,
  onOpenChange,
  memberName,
  currentRole,
  canPromotePresident = false,
  onConfirm,
  isPending = false,
  error,
  labels,
}: ChangeRoleModalProps) {
  const t = {
    ...DEFAULT_LABELS,
    ...labels,
    roles: { ...DEFAULT_LABELS.roles, ...labels?.roles },
  }

  const [role, setRole] = React.useState<EditableRole>(currentRole)

  // Réinitialise la sélection sur le rôle courant à chaque (ré)ouverture.
  React.useEffect(() => {
    if (open) setRole(currentRole)
  }, [open, currentRole])

  const descId = React.useId()

  // Options visibles : « Président » masqué si l'appelant n'est pas habilité (anti-escalade).
  // On garde toujours le rôle COURANT visible (sinon un président rétrogradant un président
  // ne verrait plus son propre point de départ) — mais un trésorier ne peut pas y monter.
  const visibleRoles = ROLE_KEYS.filter(
    (r) => r !== 'president' || canPromotePresident || currentRole === 'president'
  )

  const handleConfirm = () => {
    if (isPending) return
    if (role === currentRole) {
      onOpenChange(false)
      return
    }
    onConfirm(role)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2',
            'rounded-[16px] bg-card p-6 shadow-[var(--sh-modal)]',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[220ms]',
            'focus:outline-none max-h-[90vh] overflow-y-auto'
          )}
        >
          {/* Icône « rôle » dans une pastille brand atténuée (changement non destructif). */}
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-brand-yellow/15 text-text">
            <Icon name="UserCog" size={20} aria-hidden="true" />
          </span>

          <Dialog.Title className="mt-4 font-display font-bold text-[18px] text-text">
            {t.title(memberName)}
          </Dialog.Title>
          <Dialog.Description id={descId} className="mt-2 text-[14px] text-text-sec">
            {t.description}
          </Dialog.Description>

          <div className="mt-5 flex flex-col gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-text-ter">
              {t.roleLabel}
            </span>
            <SelectRoot value={role} onValueChange={(v) => setRole(v as EditableRole)}>
              <SelectTrigger aria-label={t.roleLabel}>
                <SelectValue placeholder={t.rolePlaceholder} />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent>
                  {visibleRoles.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t.roles[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </div>

          {/* Encart data-warning : matérialise role_source='manual' (ne sera plus écrasé par la sync). */}
          <div
            role="note"
            className={cn(
              'mt-4 flex items-start gap-2 rounded-[10px] p-3',
              'bg-data-warning-50 text-data-warning-strong'
            )}
          >
            <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="text-[13px]">{t.warning}</span>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-[13px] text-data-negative">
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={isPending}>
                {t.cancel}
              </Button>
            </Dialog.Close>
            <Button onClick={handleConfirm} isLoading={isPending} disabled={isPending}>
              {t.confirm}
            </Button>
          </div>

          <Dialog.Close
            aria-label={t.close}
            className="absolute top-4 right-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none"
          >
            <Icon name="X" size={16} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
