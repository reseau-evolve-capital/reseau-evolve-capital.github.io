'use client'

// Wrapper client de SuspendedScreen (@evolve/ui). Fournit les libellés i18n + la déconnexion
// (Server Action). Aucune dépendance à SupabaseProvider (route hors (app)/(auth)).

import { useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { SuspendedScreen } from '@evolve/ui'
import { signOutAction } from './actions'

export function SuspendedScreenClient({ treasurerMailto }: { treasurerMailto?: string }) {
  const t = useTranslations('accessSuspended')
  const [, startTransition] = useTransition()

  // L'écran « accès suspendu » est sombre par design (rupture volontaire). Les tokens dark sont
  // scopés sur <html data-theme="dark"> (un data-theme sur un div imbriqué ne suffit pas car
  // --color-bg est résolu à :root). On force donc le thème au niveau document tant que l'écran
  // est monté, et on restaure le thème précédent à la sortie (navigation client).
  useEffect(() => {
    const html = document.documentElement
    const previous = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'dark')
    return () => {
      if (previous) html.setAttribute('data-theme', previous)
      else html.removeAttribute('data-theme')
    }
  }, [])

  return (
    <SuspendedScreen
      treasurerMailto={treasurerMailto}
      onSignOut={() => startTransition(() => void signOutAction())}
      labels={{
        title: t('title'),
        description: t('description'),
        contactCta: t('contactCta'),
        signOut: t('signOut'),
      }}
    />
  )
}
