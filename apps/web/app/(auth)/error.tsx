'use client'
import { useTranslations } from 'next-intl'

import { Button } from '@evolve/ui'

import { RouteErrorReporter } from '@/components/RouteErrorReporter'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations()
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center flex flex-col items-center gap-4">
      <RouteErrorReporter error={error} routeSegment="auth" />
      <h2 className="font-display font-bold text-[18px] text-text">{t('errors.auth.title')}</h2>
      <p className="text-[14px] text-text-sec">{t('errors.auth.body')}</p>
      <Button onClick={() => reset()}>{t('common.retry')}</Button>
    </div>
  )
}
