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
import { useTranslations } from 'next-intl'
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
  clubId: string
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
  clubId,
  currency = 'EUR',
  memberEmail,
}: RelanceModalProps) {
  const t = useTranslations('admin.cotisations.relance')
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reason: dialog reset on re-open, no cascading risk (guarded by `open`)
      setMessage(buildInitialMessage(memberName, lateMonths, amountDue, currency))
      setError(null)
    }
  }, [open, memberName, lateMonths, amountDue, currency])

  const hasEmail = typeof memberEmail === 'string' && memberEmail.trim() !== ''

  const handleSend = async () => {
    if (!hasEmail || !memberEmail) return
    if (isPending) return

    setIsPending(true)
    setError(null)

    try {
      const result = await sendRelanceEmail({
        membershipId,
        memberEmail,
        memberName,
        message,
        clubId,
      })

      if (result.success) {
        toast.success({
          title: t('successTitle'),
          message: t('successMessage', { name: memberName }),
        })
        onClose()
      } else {
        setError(mapErrorMessage(result.error, t))
      }
    } catch {
      setError(t('unexpectedError'))
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
            {t('modalTitle', { name: memberName })}
          </Dialog.Title>

          <Dialog.Description id={descId} className="mt-2 text-[14px] text-text-sec">
            {hasEmail
              ? t('descriptionHasEmail', { email: memberEmail ?? '' })
              : t('descriptionNoEmail')}
          </Dialog.Description>

          {/* Textarea du message — éditable. */}
          <div className="mt-5 flex flex-col gap-2">
            <label
              htmlFor="relance-message"
              className="text-[12px] font-semibold uppercase tracking-wide text-text-ter"
            >
              {t('messageLabel')}
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
              <span className="text-[13px]">{t('warningNoEmail')}</span>
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
                {t('cancel')}
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleSend}
              isLoading={isPending}
              disabled={!hasEmail || isPending}
              aria-disabled={!hasEmail || undefined}
            >
              {t('sendEmail')}
            </Button>
          </div>

          {/* Bouton fermer (croix) — ≥ 44×44px, focus visible. */}
          <Dialog.Close
            aria-label={t('close')}
            className="absolute top-4 right-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-ter focus-visible:shadow-[var(--sh-glow)] outline-none"
          >
            <Icon name="X" size={16} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Traduit les codes d'erreur de la Server Action via les clés i18n. */
function mapErrorMessage(
  code: string | undefined,
  t: ReturnType<typeof useTranslations<'admin.cotisations.relance'>>
): string {
  const knownCodes = [
    'unauthorized',
    'forbidden',
    'missing_email',
    'missing_message',
    'send_failed',
  ] as const
  type KnownCode = (typeof knownCodes)[number]
  if (code && (knownCodes as readonly string[]).includes(code)) {
    return t(`error.${code as KnownCode}`)
  }
  return t('errorMessage')
}
