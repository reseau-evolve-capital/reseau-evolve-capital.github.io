import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { listNewsletters, type NewsletterSummary } from '@/lib/strapi-editorial'
import { getSessionUser, getNetworkContext } from '@/lib/data/request'
import { Forbidden } from '../Forbidden'
import { NewsletterView } from './NewsletterView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reseau.meta')
  return { title: t('newsletterTitle') }
}

// RSC gardée RÉSEAU (la newsletter « La Quote-Part » est éditée par le bureau du réseau, pas
// par le staff d'un club). Même pattern de garde que les autres pages /reseau (cf. layout) :
// session + contexte réseau, sinon 403 propre sans fuite d'info. La liste Strapi est tolérante :
// CMS indisponible → liste vide, jamais de crash (l'UI affiche un état vide/erreur).
// Identité + contexte réseau mémoïsés par requête — cf. lib/data/request.ts.
export default async function ReseauNewsletterPage() {
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getNetworkContext(user.id)
  if (!ctx) return <Forbidden />

  let editions: NewsletterSummary[] = []
  let loadError = false
  try {
    editions = await listNewsletters()
  } catch (err) {
    // Log serveur pour diagnostic (env STRAPI manquante, CMS down, 4xx…) ; l'UI reste tolérante.
    Sentry.captureException(err, {
      tags: { endpoint: 'reseau/newsletter' },
    })
    console.error('[newsletter] échec du chargement des éditions depuis le CMS :', err)
    loadError = true
  }

  return <NewsletterView editions={editions} loadError={loadError} />
}
