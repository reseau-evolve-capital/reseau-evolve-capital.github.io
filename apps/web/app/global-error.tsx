'use client'
import { useEffect } from 'react'

import * as Sentry from '@sentry/nextjs'

// Boundary racine : Next exige que global-error rende son propre <html>/<body>
// car il remplace le root layout quand celui-ci a planté. On reste sobre et FR.
// Aucune stack n'est affichée à l'utilisateur ; `error` est typé mais non rendu.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])
  return (
    <html lang="fr">
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: 'var(--color-bg-page, #f4f4f5)',
          color: 'var(--color-text, #18181b)',
          fontFamily: 'var(--font-body, ui-sans-serif, system-ui, -apple-system, sans-serif)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '28rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'var(--font-display, inherit)',
              margin: 0,
            }}
          >
            Une erreur est survenue. On est dessus.
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-sec, #52525b)',
              margin: 0,
            }}
          >
            Tes données restent en sécurité. Tu peux réessayer dans un instant.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '0 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              backgroundColor: 'var(--color-brand-yellow, #f4c20d)',
              color: 'var(--color-accent-ink, #18181b)',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
