'use client'
import { useTranslations } from 'next-intl'

import { Button } from '@evolve/ui'

import { RouteErrorReporter } from '@/components/RouteErrorReporter'

// Erreur de chargement de /reseau/clubs (ex. RPC network_list_clubs en échec). État error
// explicite (jamais d'écran vide / crash) + bouton réessayer. Cf. CLAUDE.md (états error/empty).
export default function ReseauClubsError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations()
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <RouteErrorReporter error={error} routeSegment="reseau/clubs" />
      <h2 className="font-display text-[18px] font-bold text-text">
        {t('reseau.clubs.error.title')}
      </h2>
      <Button onClick={() => reset()}>{t('common.retry')}</Button>
    </div>
  )
}
