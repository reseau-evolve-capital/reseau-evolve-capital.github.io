'use client'
import { useTranslations } from 'next-intl'

import { Button } from '@evolve/ui'

import { RouteErrorReporter } from '@/components/RouteErrorReporter'

// Erreur de chargement de /reseau/retours (ex. lecture feedback / RPC en échec). État error
// explicite (jamais d'écran vide / crash) + bouton réessayer. Cf. CLAUDE.md (états error/empty).
export default function ReseauRetoursError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations()
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <RouteErrorReporter error={error} routeSegment="reseau/retours" />
      <h2 className="font-display text-[18px] font-bold text-text">
        {t('reseau.retours.error.title')}
      </h2>
      <Button onClick={() => reset()}>{t('common.retry')}</Button>
    </div>
  )
}
