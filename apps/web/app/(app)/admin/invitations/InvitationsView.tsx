'use client'

// Vue invitations (ADM-007). InviteForm + InvitationsTable + panneau « lien copiable » (V0 :
// pas d'envoi auto — E-NTF). Mutations via Server Actions (RPC staff-scopées) + invalidation
// de la clé TanStack ['admin','invitations',clubId]. Dates formatées via @evolve/utils.
// Réf : ADM-007-PLAN.md, CLAUDE.md (a11y, formatage @evolve/utils, copy i18n).

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { formatDate } from '@evolve/utils'
import {
  Heading,
  Text,
  Button,
  Icon,
  InviteForm,
  InvitationsTable,
  type InvitationRow,
} from '@evolve/ui'
import type { Invitation } from '@/lib/data/invitations'
import { useClubInvitations, type ClubInvitationsPayload } from '@/lib/hooks/useClubInvitations'
import { createInvitationAction, resendInvitationAction, revokeInvitationAction } from '../actions'

/** Invitation (data, ISO) → InvitationRow (présentationnel, dates formatées). */
function toRow(inv: Invitation): InvitationRow {
  return {
    id: inv.id,
    email: inv.email,
    sentAt: formatDate(inv.invitedAt),
    expiresAt: formatDate(inv.expiresAt),
    status: inv.status,
  }
}

export function InvitationsView({ initialData }: { initialData: ClubInvitationsPayload }) {
  const t = useTranslations('admin.invitations')
  const tAdmin = useTranslations('admin')
  const queryClient = useQueryClient()
  const { data, isError } = useClubInvitations(initialData)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function mapError(code: string): string {
    if (code === 'invalid_email') return t('form.errorInvalid')
    if (code === 'duplicate') return t('form.errorDuplicate')
    return t('form.errorGeneric')
  }

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['admin', 'invitations', data.clubId] })
  }

  function handleInvite(email: string) {
    setFormError(null)
    setCopied(false)
    startTransition(async () => {
      const res = await createInvitationAction(email)
      if (res.ok) {
        setLink(res.link)
        await invalidate()
      } else {
        setFormError(mapError(res.error))
      }
    })
  }

  function handleResend(id: string) {
    setCopied(false)
    startTransition(async () => {
      const res = await resendInvitationAction(id)
      if (res.ok) {
        setLink(res.link)
        await invalidate()
      }
    })
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const res = await revokeInvitationAction(id)
      if (res.ok) await invalidate()
    })
  }

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Le presse-papiers peut être indisponible (contexte non sécurisé) — le lien reste lisible.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level="h1" className="text-[20px]">
          {t('title')}
        </Heading>
        <Text className="text-[14px] text-text-sec">{t('subtitle')}</Text>
      </div>

      <InviteForm
        onSubmit={handleInvite}
        isPending={isPending}
        error={formError}
        labels={{
          placeholder: t('form.placeholder'),
          submit: t('form.submit'),
          note: t('form.note'),
          invalidEmail: t('form.errorInvalid'),
        }}
      />

      {link && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-[10px] border border-border bg-card p-4"
        >
          <Text className="text-[13px] font-semibold">{t('linkLabel')}</Text>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={link}
              aria-label={t('linkLabel')}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
            />
            <Button variant="secondary" onClick={() => void copyLink()}>
              <Icon name={copied ? 'Check' : 'Copy'} size={16} aria-hidden="true" />
              {copied ? t('actions.linkCopied') : t('actions.copyLink')}
            </Button>
          </div>
          <Text className="text-[12px] text-text-ter">{t('linkNote')}</Text>
        </div>
      )}

      {isError && (
        <p role="status" className="text-[12px] text-text-ter">
          {tAdmin('staleData')}
        </p>
      )}

      <InvitationsTable
        invitations={data.invitations.map(toRow)}
        onResend={handleResend}
        onRevoke={handleRevoke}
        labels={{
          columns: {
            email: t('columns.email'),
            sentAt: t('columns.sentAt'),
            expiresAt: t('columns.expiresAt'),
            status: t('columns.status'),
            actions: t('columns.actions'),
          },
          tableLabel: t('tableLabel'),
          statuses: {
            pending: t('status.pending'),
            accepted: t('status.accepted'),
            expired: t('status.expired'),
            revoked: t('status.revoked'),
          },
          emptyTitle: t('empty.title'),
          emptyDescription: t('empty.description'),
          resendLabel: (email) => `${t('actions.resend')} (${email})`,
          revokeLabel: (email) => `${t('actions.revoke')} (${email})`,
        }}
      />
    </div>
  )
}
