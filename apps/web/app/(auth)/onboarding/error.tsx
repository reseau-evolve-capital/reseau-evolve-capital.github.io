'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@evolve/ui'

export default function OnboardingError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors.onboarding')
  const tCommon = useTranslations('common')

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center flex flex-col items-center gap-4">
      <h2 className="font-display font-bold text-[18px] text-text">{t('title')}</h2>
      <p className="text-[14px] text-text-sec">{t('body')}</p>
      <Button onClick={() => reset()}>{tCommon('retry')}</Button>
    </div>
  )
}
