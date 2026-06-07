'use client'

import { useEffect } from 'react'

import { clearPwaDataCaches } from '@/lib/pwa/register-sw'

/**
 * Purge le cache de données du service worker au montage de l'espace auth (PWA-001, sécurité).
 *
 * Monté dans le layout `(auth)` : toute fin de session — bouton de déconnexion, Server Action
 * `/acces-suspendu`, ou expiration redirigée par le middleware — atterrit sur `/login`, donc ce
 * composant garantit qu'aucune donnée financière mise en cache ne survit à la déconnexion sur un
 * appareil partagé (filet universel, en plus du clear immédiat du bouton de déconnexion).
 */
export function PwaCacheCleaner() {
  useEffect(() => {
    clearPwaDataCaches()
  }, [])
  return null
}
