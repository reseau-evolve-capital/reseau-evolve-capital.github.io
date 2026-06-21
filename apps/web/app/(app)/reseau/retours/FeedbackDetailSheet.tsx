'use client'

// Slide-over détail d'un retour (NET-019, écran 03 — partagé réseau & club).
//
// Desktop : panneau latéral droit ; mobile : plein écran. Radix Dialog (focus trap, Escape, overlay).
// Contenu : en-tête (titre IA + badges type/sévérité + select statut), métadonnées (auteur, club,
// date, page concernée mono, navigateur repliable), message verbatim, galerie captures, bloc
// « Analyse IA » (ai_summary + ai_category), liens externes GitHub/Notion.
//
// Tokens uniquement, RGPD (prénom, jamais de montant), a11y (Dialog.Title/Description requis).

import { useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'
import { formatDate } from '@evolve/utils'
import { Icon, Badge, type BadgeVariant } from '@evolve/ui'
import type {
  FeedbackItem,
  FeedbackType,
  FeedbackSeverity,
  FeedbackStatus,
} from '@/lib/data/feedback'
import { FEEDBACK_STATUSES } from '@/lib/data/feedback'

const TYPE_BADGE: Record<FeedbackType, BadgeVariant> = {
  bug: 'neutral',
  feature: 'brand',
  question: 'neutral',
}
const SEVERITY_BADGE: Record<FeedbackSeverity, BadgeVariant> = {
  blocking: 'error',
  annoying: 'warning',
  minor: 'neutral',
}

export function FeedbackDetailSheet({
  item,
  open,
  onOpenChange,
  onStatusChange,
  locale,
  clubLabel,
}: {
  item: FeedbackItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (item: FeedbackItem, next: FeedbackStatus) => void
  locale: string
  clubLabel: (name: string) => string
}) {
  const t = useTranslations('reseau.retours')

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 motion-safe:animate-in motion-safe:fade-in" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col overflow-y-auto bg-card shadow-[var(--sh-modal)] focus:outline-none sm:w-[480px] sm:max-w-[calc(100vw-2rem)] sm:border-l sm:border-border motion-safe:animate-in motion-safe:slide-in-from-right">
          {item ? (
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              {/* En-tête */}
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="font-display text-[18px] font-extrabold text-text">
                  {item.aiTitle ?? t('table.untitled')}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label={t('detail.close')}
                    className="shrink-0 rounded-[8px] p-1.5 text-text-ter hover:text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
                  >
                    <Icon name="X" size={20} aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">{t('detail.description')}</Dialog.Description>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={TYPE_BADGE[item.type]}>{t(`type.${item.type}`)}</Badge>
                {item.severity && (
                  <Badge variant={SEVERITY_BADGE[item.severity]}>
                    {t(`severity.${item.severity}`)}
                  </Badge>
                )}
                <label className="ml-auto inline-flex items-center gap-1.5 text-[13px]">
                  <span className="text-text-sec">{t('detail.status')}</span>
                  <select
                    value={item.status}
                    onChange={(e) => onStatusChange(item, e.target.value as FeedbackStatus)}
                    aria-label={t('table.changeStatus')}
                    className="min-h-[44px] rounded-[10px] border border-border bg-card px-2 text-[13px] text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Métadonnées */}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
                <dt className="text-text-ter">{t('detail.author')}</dt>
                <dd className="text-text">{item.authorName}</dd>
                <dt className="text-text-ter">{t('detail.club')}</dt>
                <dd className="text-text">
                  {item.clubName ? clubLabel(item.clubName) : t('table.noClub')}
                </dd>
                <dt className="text-text-ter">{t('detail.date')}</dt>
                <dd className="text-text">{formatDate(item.createdAt, locale)}</dd>
                <dt className="text-text-ter">{t('detail.page')}</dt>
                <dd className="font-mono text-[12px] text-text break-all">{item.pageRoute}</dd>
              </dl>

              {item.userAgent && (
                <details className="text-[12px] text-text-ter">
                  <summary className="cursor-pointer">{t('detail.userAgent')}</summary>
                  <p className="mt-1 break-all">{item.userAgent}</p>
                </details>
              )}

              {/* Message verbatim */}
              <section aria-label={t('detail.message')}>
                <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-text-ter">
                  {t('detail.message')}
                </h3>
                <p className="whitespace-pre-wrap rounded-[10px] bg-card-sub p-3 text-[14px] text-text">
                  {item.message}
                </p>
              </section>

              {/* Captures */}
              {item.screenshotUrls.length > 0 && (
                <section aria-label={t('detail.attachments')}>
                  <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-text-ter">
                    {t('detail.attachments')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {item.screenshotUrls.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-[8px] border border-border focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={t('detail.attachmentAlt', { n: i + 1 })}
                          className="h-20 w-20 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Analyse IA */}
              {(item.aiSummary || item.aiCategory) && (
                <section
                  aria-label={t('detail.aiAnalysis')}
                  className="rounded-[10px] border border-border bg-card-sub/40 p-3"
                >
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-text-ter">
                    <Icon name="Sparkles" size={16} className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('detail.aiAnalysis')}
                  </h3>
                  {item.aiSummary && <p className="text-[14px] text-text">{item.aiSummary}</p>}
                  {item.aiCategory && (
                    <p className="mt-1.5 text-[12px] text-text-ter">
                      {t('detail.category')} : {item.aiCategory}
                    </p>
                  )}
                </section>
              )}

              {/* Liens externes */}
              {(item.githubIssueUrl || item.notionPageId) && (
                <div className="flex flex-wrap gap-2">
                  {item.githubIssueUrl && (
                    <a
                      href={item.githubIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
                    >
                      <Icon name="Github" size={16} aria-hidden="true" />
                      {t('detail.viewGithub')}
                    </a>
                  )}
                  {item.notionPageId && (
                    <span className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-text-sec">
                      <Icon name="FileText" size={16} aria-hidden="true" />
                      {t('detail.viewNotion')}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Radix exige un Title/Description même sans item (jamais rendu visible : open=false).
            <div className="sr-only">
              <Dialog.Title>{t('detail.description')}</Dialog.Title>
              <Dialog.Description>{t('detail.description')}</Dialog.Description>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
