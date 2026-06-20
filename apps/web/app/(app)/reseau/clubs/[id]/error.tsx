'use client'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { Button, useToast } from '@evolve/ui'

import { RouteErrorReporter } from '@/components/RouteErrorReporter'

// Erreur de chargement de la fiche club (ex. RPC réseau en échec). État error explicite (jamais
// d'écran vide / crash) + bouton réessayer + toast avec raison. Cf. CLAUDE.md (états error/empty).
export default function ReseauClubDetailError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const t = useTranslations()
  const toast = useToast()

  useEffect(() => {
    // Dérive un message lisible selon la nature de l'erreur Supabase/Postgres.
    const msg = error.message ?? ''
    let detail: string
    if (msg.includes('insufficient_privilege') || msg.includes('acces refuse')) {
      detail = t('reseau.clubDetail.error.forbidden')
    } else if (msg.includes('club introuvable') || msg.includes('no_data_found')) {
      detail = t('reseau.clubDetail.error.notFound')
    } else {
      detail = t('reseau.clubDetail.error.generic')
    }
    toast.error({ title: t('reseau.clubDetail.error.title'), message: detail })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <RouteErrorReporter error={error} routeSegment="reseau/clubs/[id]" />
      <h2 className="font-display text-[18px] font-bold text-text">
        {t('reseau.clubDetail.error.title')}
      </h2>
      <Button onClick={() => reset()}>{t('common.retry')}</Button>
    </div>
  )
}
