// Page PUBLIQUE — Politique de confidentialité (BUG 3).
//
// Cible du lien [lire] de la case « confidentialité » de /onboarding/step-3. Aucune auth
// (lue pendant l'onboarding). Contenu i18n fr/en (namespace `legal.privacy`), thémée
// clair/sombre via la coquille LegalLayout. Le contenu reprend/adapte la politique de
// confidentialité de la vitrine (apps/vitrine/src/config/legal-config.ts → privacyPolicy).

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { formatDate } from '@evolve/utils'

import { LegalLayout, type LegalSection } from '../LegalLayout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.privacy')
  return { title: t('metaTitle') }
}

export default async function PrivacyPage() {
  const t = await getTranslations('legal.privacy')
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
