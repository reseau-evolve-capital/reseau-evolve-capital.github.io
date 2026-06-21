'use client'

// RelanceModal (T5 — cotisations V2) — modale de relance cotisation.
//
// Ouvre une boîte de dialogue Radix avec un message pré-rempli (buildRelanceMessage),
// éditable par le trésorier. Envoi via Server Action sendRelanceEmail.
// Désactivé si memberEmail est absent (placeholder synthétique ou email manquant).
//
// Pattern : Radix Dialog, copie exacte de ChangeRoleModal (structure, tokens, a11y).
// Toast via useToast() (ToastProvider monté dans le layout (app)).
// Réf : ChangeRoleModal, T5 brief, CLAUDE.md (a11y AA, no hex, Button ≥ 44px).

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button, Icon, TextArea, useToast } from '@evolve/ui'
import { buildRelanceMessage, type LateMonth } from '@/lib/data/admin'
import { sendRelanceEmail } from '@/app/(app)/admin/cotisations/actions'

export interface RelanceModalProps {
  open: boolean
  onClose: () => void
  memberName: string
  membershipId: string
  lateMonths: LateMonth[]
  amountDue: number
  currency?: string
  memberEmail?: string | null
}

/** Formate un LateMonth en label FR "juin 2024". */
function formatLateMonthLabel(lm: LateMonth): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(lm.year, lm.month - 1)
  )
}

/**
 * Construit le message initial à partir des props.
 * Mémoïsé à l'ouverture (useState initial value) — non recomputé à chaque render.
 */
function buildInitialMessage(
  memberName: string,
  lateMonths: LateMonth[],
  amountDue: number,
  currency: string
): string {
  return buildRelanceMessage({
    memberName,
    lateMonthLabels: lateMonths.map(formatLateMonthLabel),
    amountDue,
    currency,
  })
}

/**
 * Modale de relance cotisation (Radix Dialog).
 *
 * - Textarea pré-rempli avec buildRelanceMessage (calculé UNE fois à l'ouverture).
 * - Bouton « Envoyer par email » désactivé si memberEmail est null/vide.
 * - Toast success → fermeture ; erreur inline sinon.
 * - Bouton « Annuler » + croix de fermeture (≥ 44px, focus visible).
 */
export function RelanceModal({
  open,
  onClose,
  memberName,
  membershipId,
  lateMonths,
  amountDue,
  currency = 'EUR',
  memberEmail,
}: RelanceModalProps) {
  const toast = useToast()
  const descId = React.useId()

  // Message initial calculé ONCE (useState lazy initializer via fonction inline).
  // On le recalcule à chaque (ré)ouverture via l'effet ci-dessous.
  const [message, setMessage] = React.useState<string>(() =>
    buildInitialMessage(memberName, lateMonths, amountDue, currency)
  )
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Réinitialise le message et l'erreur à chaque (ré)ouverture.
  React.useEffect(() => {
    if (open) {
      setMessage(buildInitialMessage(memberName, lateMonths, amountDue, currency))
      setError(null)
    }
  }, [open, memberName, lateMonths, amountDue, currency])

  const hasEmail = typeof memberEmail === 'string' && memberEmail.trim() !== ''

  // Le clubId vient du contexte admin — on le lit depuis l'URL plutôt que de le passer en prop
  // (évite de coupler la modale au layout). La Server Action le résout côté serveur via le cookie.
  // Mais pour la V1, on récupère le clubId depuis les params de la route (passé implicitement).
  // Hack pragmatique V1 : la Server Action lit le club actif du cookie si clubId = ''.
  // Le guard dans actions.ts vérifie toujours via resolveAdminContext.
  //
  // Pour une intégration propre, le parent peut passer clubId en prop supplémentaire.
  // Pour la V1, on ne passe pas clubId depuis ici — la Server Action résout via cookie.
  const handleSend = async () => {
    if (!hasEmail || !memberEmail) return
    if (isPending) return

    setIsPending(true)
    setError(null)

    try {
      // Résolution du clubId côté serveur via le cookie evolve_active_club.
      // La Server Action vérifie toujours via resolveAdminContext(clubId).
      // On passe un clubId vide ici — le guard côté action lira le cookie.
      // Remarque : pour une sécurité maximale, passer le clubId en prop depuis le parent.
      const result = await sendRelanceEmail({
        membershipId,
        memberEmail,
        memberName,
        message,
        clubId: '', // résolu côté serveur via cookie evolve_active_club
      })

      if (result.success) {
        toast.success({
          title: 'Relance envoyée',
          message: `Email envoyé à ${memberName}.`,
        })
        onClose()
      } else {
        const errorMsg = mapErrorMessage(result.error)
        setError(errorMsg)
      }
    } catch {
      setError('Une erreur inattendue est survenue. Veuillez réessayer.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content
          aria-describedby={descId}
          className={[
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2',
            'rounded-[16px] bg-card p-6 shadow-[var(--sh-modal)]',
            'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[220ms]',
            'focus:outline-none max-h-[90vh] overflow-y-auto',
          ].join(' ')}
        >
          {/* Icône relance dans une pastille tintée (non destructif). */}
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-brand-yellow/15 text-text">
            <Icon name="Mail" size={20} aria-hidden="true" />
          </span>

          <Dialog.Title className="mt-4 font-display font-bold text-[18px] text-text">
            Relancer {memberName}
          </Dialog.Title>

          <Dialog.Description id={descId} className="mt-2 text-[14px] text-text-sec">
            {hasEmail
              ? `Un email sera envoyé à ${memberEmail}. Vous pouvez modifier le message ci-dessous.`
              : 'Aucun email disponible pour ce membre. Transmettez ce message par un autre canal.'}
          </Dialog.Description>

          {/* Textarea du message — éditable. */}
          <div className="mt-5 flex flex-col gap-2">
            <label
              htmlFor="relance-message"
              className="text-[12px] font-semibold uppercase tracking-wide text-text-ter"
            >
              Message
            </label>
            <TextArea
              id="relance-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              disabled={isPending}
              aria-label="Message de relance"
              className="min-h-[200px]"
            />
          </div>

          {/* Avertissement email manquant. */}
          {!hasEmail && (
            <div
              role="note"
              className="mt-4 flex items-start gap-2 rounded-[10px] p-3 bg-data-warning-50 text-data-warning-strong"
            >
              <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="text-[13px]">
                Email manquant — ce membre n&apos;a pas d&apos;email renseigné. L&apos;envoi par
                email est désactivé.
              </span>
            </div>
          )}

          {/* Erreur inline. */}
          {error && (
            <p role="alert" className="mt-3 text-[13px] text-data-negative">
              {error}
            </p>
          )}

          {/* Actions. */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={isPending}>
                Annuler
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleSend}
              isLoading={isPending}
              disabled={!hasEmail || isPending}
              aria-disabled={!hasEmail || undefined}
            >
              Envoyer par email
            </Button>
          </div>

          {/* Bouton fermer (croix) — ≥ 44×44px, focus visible. */}
          <Dialog.Close
            aria-label="Fermer"
            className="absolute top-4 right-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none"
          >
            <Icon name="X" size={16} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Traduit les codes d'erreur de la Server Action en messages FR. */
function mapErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'unauthorized':
      return 'Vous devez être connecté pour effectuer cette action.'
    case 'forbidden':
      return "Vous n'avez pas les droits pour envoyer une relance dans ce club."
    case 'missing_email':
      return "L'adresse email du membre est manquante."
    case 'missing_message':
      return 'Le message ne peut pas être vide.'
    default:
      return code ?? 'Une erreur est survenue. Veuillez réessayer.'
  }
}
