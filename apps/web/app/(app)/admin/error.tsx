'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@evolve/ui'

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations()
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center flex flex-col items-center gap-4">
      <h2 className="font-display font-bold text-[18px] text-text">
        {t('errors.admin.dashboard.title')}
      </h2>
      <Button onClick={() => reset()}>{t('common.retry')}</Button>
    </div>
  )
}
