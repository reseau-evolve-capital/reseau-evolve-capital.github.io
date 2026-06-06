'use client'

import { useEffect } from 'react'

/**
 * Log discret de la date de build (= date de déploiement, car build + deploy sont manuels
 * en local) + commit, visible dans les devtools. La même info est aussi exposée en
 * `<meta name="build-date">` / `<meta name="build-commit">` dans le <head> (cf. layout),
 * vérifiable sans devtools : `curl -s https://reseauevolvecapital.com/ | grep build-date`.
 */
export function BuildInfo() {
  useEffect(() => {
    const date = process.env.NEXT_PUBLIC_BUILD_TIME
    if (!date) return
    const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT
    console.info(
      `%cRéseau Evolve Capital%c\nBuild / déploiement : ${new Date(date).toLocaleString('fr-FR')}\n${date}${commit ? ` · ${commit}` : ''}`,
      'font-weight:bold;color:#E93E3A',
      'color:inherit'
    )
  }, [])

  return null
}
