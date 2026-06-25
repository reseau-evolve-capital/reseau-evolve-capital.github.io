'use client'

// Vue client P0-a — Tableau de bord Opérations (E-OPS-2 §3). Injecte les chaînes i18n
// (next-intl) dans les composants présentationnels @evolve/ui. Aucun appel réseau ici : les
// données (solde + opérations récentes) sont lues côté serveur (page.tsx) et passées en props.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  CashBalanceCard,
  OperationListItem,
  OpChip,
  Icon,
  type OperationListItemData,
} from '@evolve/ui'
import type { OperationTypeKey } from '@evolve/ui'

type QuickActionKey = 'contribution' | 'buy' | 'sell' | 'dividend'

const QUICK_ACTIONS: ReadonlyArray<{ type: OperationTypeKey; key: QuickActionKey }> = [
  { type: 'contribution', key: 'contribution' },
  { type: 'buy', key: 'buy' },
  { type: 'sell', key: 'sell' },
  { type: 'dividend_cash', key: 'dividend' },
]

const QUICK_ACTION_LABEL: Record<QuickActionKey, `quickActions.${QuickActionKey}`> = {
  contribution: 'quickActions.contribution',
  buy: 'quickActions.buy',
  sell: 'quickActions.sell',
  dividend: 'quickActions.dividend',
}

export function OperationsDashboardView({
  balance,
  recentOperations,
}: {
  balance: number | null
  recentOperations: OperationListItemData[]
}) {
  const t = useTranslations('admin.operations.dashboard')
  const router = useRouter()
  const isEmpty = recentOperations.length === 0
  // Le preview du dashboard renvoie vers la liste complète (le détail vit sur /toutes).
  const openInList = () => router.push('/admin/operations/toutes')

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[26px]">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-ter">
          {t('caption')}
        </p>
        <h1 className="font-display text-[32px] font-extrabold tracking-[-0.03em] text-text">
          {t('title')}
        </h1>
      </header>

      <CashBalanceCard
        balance={balance}
        state={isEmpty ? 'empty' : 'ok'}
        captionLabel={t('cash.caption')}
        infoText={t('cash.info')}
        infoLabel={t('cash.infoLabel')}
        emptyHint={t('cash.emptyHint')}
        computedAtLabel={isEmpty ? undefined : t('cash.computedAt')}
      />

      {/* Actions rapides */}
      <section aria-labelledby="quick-actions-caption">
        <p
          id="quick-actions-caption"
          className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-ter"
        >
          {t('quickActions.caption')}
        </p>
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.key}
              href={`/admin/operations/nouvelle?type=${action.type}`}
              className="group flex min-h-16 items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-card transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-border-strong focus-visible:outline-none focus-visible:shadow-glow"
            >
              <OpChip type={action.type} size={38} />
              <span className="font-display text-[15px] font-bold text-text">
                {t(QUICK_ACTION_LABEL[action.key])}
              </span>
              <Icon
                name="Plus"
                size={20}
                aria-hidden="true"
                className="ml-auto text-text-ter transition-colors group-hover:text-text"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Carte settlement (E-OPS-4) — présente mais CTA désactivé (hors périmètre E-OPS-2). */}
      {!isEmpty && (
        <Link
          href="/admin/operations/settlement"
          className="flex flex-wrap items-center gap-5 rounded-md border border-[color-mix(in_srgb,var(--brand-yellow)_45%,var(--border))] bg-card px-[22px] py-5 shadow-card transition-[border-color,transform] duration-150 hover:-translate-y-px focus-visible:outline-none focus-visible:shadow-glow"
        >
          <span
            aria-hidden="true"
            className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-yellow)_16%,transparent)] text-accent-ink"
          >
            <Icon name="Coins" size={24} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-text">
              {t('settlement.title')}
            </span>
            <span className="text-[13.5px] text-text-sec">{t('settlement.subtitle')}</span>
          </span>
          <span className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-pill border border-border-strong bg-card px-[22px] font-body text-[14px] font-bold text-text-sec">
            {t('settlement.cta')}
            <Icon name="ArrowRight" size={16} aria-hidden="true" />
          </span>
        </Link>
      )}

      {/* Dernières opérations */}
      <section className="overflow-hidden rounded-md border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-[22px] py-4">
          <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em] text-text">
            {t('recent.title')}
          </h2>
          {!isEmpty && (
            <Link
              href="/admin/operations/toutes"
              className="inline-flex items-center gap-1 border-b border-brand-yellow text-[13px] font-semibold text-text transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:shadow-glow"
            >
              {t('recent.viewAll')}
              <Icon name="ArrowRight" size={16} aria-hidden="true" />
            </Link>
          )}
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span
              aria-hidden="true"
              className="inline-flex h-[58px] w-[58px] items-center justify-center rounded-pill bg-card-sub text-text-ter"
            >
              <Icon name="ScrollText" size={24} />
            </span>
            <div>
              <h3 className="font-display text-[18px] font-extrabold text-text">
                {t('recent.emptyTitle')}
              </h3>
              <p className="mt-1 max-w-[42ch] text-[14px] text-text-sec">{t('recent.emptyText')}</p>
            </div>
            <Link
              href="/admin/operations/nouvelle"
              className="inline-flex min-h-11 items-center justify-center rounded-pill bg-brand-yellow px-[22px] font-body text-[14px] font-bold text-neutral-900 transition-transform duration-150 hover:opacity-95 active:scale-[0.985] focus-visible:outline-none focus-visible:shadow-glow"
            >
              {t('recent.emptyCta')}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOperations.map((op) => (
              <OperationListItem key={op.id} operation={op} onSelect={openInList} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
