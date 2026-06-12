import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { listNewsletters, type NewsletterSummary } from '@/lib/strapi-editorial'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { Forbidden } from '../Forbidden'
import { NewsletterView } from './NewsletterView'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta')
  return { title: t('newsletterTitle') }
}

// RSC gardée staff (même pattern que /admin/invitations). La liste Strapi est tolérante :
// CMS indisponible → liste vide, jamais de crash (l'UI affiche un état vide/erreur).
// Identité + contexte admin mémoïsés par requête — cf. lib/data/request.ts (ticket C).
export default async function AdminNewsletterPage() {
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />

  let editions: NewsletterSummary[] = []
  let loadError = false
  try {
    editions = await listNewsletters()
  } catch (err) {
    // Log serveur pour diagnostic (env STRAPI manquante, CMS down, 4xx…) ; l'UI reste tolérante.
    console.error('[newsletter] échec du chargement des éditions depuis le CMS :', err)
    loadError = true
  }

  return <NewsletterView editions={editions} loadError={loadError} />
}
