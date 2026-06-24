'use client'

// Vue client de l'écran « Vérification migration » (OPS-106). Rôle UNIQUE : injecter les chaînes
// i18n (next-intl) dans le composant présentationnel MigrationVerifyTable (@evolve/ui), qui ne
// dépend jamais de next-intl (copy passée par props — règle CLAUDE.md). Les agrégats (deltas, ok)
// sont calculés côté serveur (page.tsx → lib/data/migrationVerify.ts).

import { useTranslations } from 'next-intl'
import { MigrationVerifyTable, type ClubVerifyData } from '@evolve/ui'

export function MigrationVerifyView({
  clubs,
  isError,
}: {
  clubs: ClubVerifyData[]
  isError: boolean
}) {
  const t = useTranslations('admin.operations.verification')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-[20px] font-bold text-text">{t('title')}</h2>
        <p className="text-[14px] text-text-sec">{t('subtitle')}</p>
      </header>

      <MigrationVerifyTable
        clubs={clubs}
        isError={isError}
        labels={{
          okLabel: t('status.ok'),
          mismatchLabel: t('status.mismatch'),
          clubOkSummary: t('summary.ok'),
          clubMismatchSummary: (count) => t('summary.mismatch', { count }),
          columns: {
            metric: t('columns.metric'),
            legacy: t('columns.legacy'),
            operations: t('columns.operations'),
            delta: t('columns.delta'),
            status: t('columns.status'),
          },
          emptyTitle: t('empty.title'),
          emptyDescription: t('empty.description'),
          errorTitle: t('error.title'),
          errorDescription: t('error.description'),
        }}
      />
    </div>
  )
}
