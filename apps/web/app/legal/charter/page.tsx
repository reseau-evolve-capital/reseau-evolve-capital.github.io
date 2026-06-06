// Page PUBLIQUE — Charte du réseau Evolve (BUG 3).
//
// Cible du lien [lire] de la 1re case de consentement de /onboarding/step-3. Aucune auth
// (lue pendant l'onboarding). Contenu i18n fr/en (namespace `legal.charter`), thémée
// clair/sombre via la coquille LegalLayout. Le contenu reprend/adapte les mentions
// légales de la vitrine (apps/vitrine/src/config/legal-config.ts → termsOfService).

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { formatDate } from '@evolve/utils'

import { LegalLayout, type LegalSection } from '../LegalLayout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.charter')
  return { title: t('metaTitle') }
}

export default async function CharterPage() {
  const t = await getTranslations('legal.charter')
  const sections = t.raw('sections') as readonly LegalSection[]
  const updatedDate = formatDate(t('lastUpdated'))

  return (
    <LegalLayout
      title={t('title')}
      updatedLabel={t('updatedLabel')}
      updatedDate={updatedDate}
      sections={sections}
      backLabel={t('back')}
      backHref="/onboarding/step-3"
    />
  )
}
