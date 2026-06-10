'use client'

import { useTranslations } from 'next-intl'

import { ConsentBanner, type ConsentSide, type ConsentVariant } from '@evolve/ui'

import { useConsent } from '@/lib/consent/use-consent'

// Variante d'affichage pilotée par variable d'env (test des versions). Défaut : compact gauche.
function resolveVariant(): ConsentVariant {
  return process.env.NEXT_PUBLIC_CONSENT_BANNER_VARIANT === 'bar' ? 'bar' : 'compact'
}
function resolveSide(): ConsentSide {
  return process.env.NEXT_PUBLIC_CONSENT_BANNER_SIDE === 'droite' ? 'droite' : 'gauche'
}

/**
 * Monte la bannière de consentement RGPD tant que le visiteur n'a pas tranché.
 * Copy via i18n (next-intl) → passée en props au composant présentationnel @evolve/ui.
 * Coordination PWA : la bannière d'install (InstallBannerMount) est masquée tant que le
 * consentement n'est pas résolu (cf. useConsentResolved) → jamais de chevauchement.
 */
export function ConsentMount() {
  const { resolved, acceptAll, rejectAll, save } = useConsent()
  const t = useTranslations('cookieConsent')

  if (resolved) return null

  return (
    <ConsentBanner
      variant={resolveVariant()}
      side={resolveSide()}
      onAcceptAll={acceptAll}
      onRejectAll={rejectAll}
      onSave={(c) => save(c.analytics)}
      copy={{
        title: t('title'),
        description: t('description'),
        privacyLabel: t('privacyLabel'),
        privacyHref: '/legal/privacy',
        acceptAll: t('acceptAll'),
        rejectAll: t('rejectAll'),
        rejectAllLong: t('rejectAllLong'),
        customize: t('customize'),
        customizeChoices: t('customizeChoices'),
        save: t('save'),
        close: t('close'),
        back: t('back'),
        necessaryTitle: t('necessaryTitle'),
        necessaryDesc: t('necessaryDesc'),
        necessaryState: t('necessaryState'),
        analyticsTitle: t('analyticsTitle'),
        analyticsDesc: t('analyticsDesc'),
        regionLabel: t('regionLabel'),
      }}
    />
  )
}
