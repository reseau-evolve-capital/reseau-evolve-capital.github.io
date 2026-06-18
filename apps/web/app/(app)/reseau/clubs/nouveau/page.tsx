import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getSessionUser, getNetworkContext } from '@/lib/data/request'
import { Forbidden } from '../../Forbidden'
import { getServiceAccountEmail } from '../../actions'
import { AddClubWizard } from './AddClubWizard'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reseau.addClub')
  return { title: t('meta.title') }
}

// Assistant « Ajouter un club » (NET-006). Réservé aux network_admin : le layout /reseau garde
// déjà l'appartenance réseau (Forbidden) + le middleware, on re-vérifie ici en défense et on
// restreint au rôle ADMIN (un network_board ne crée pas de club). L'email du Service Account
// (encart de partage, étape 2) est dérivé côté serveur — JAMAIS de service-role exposé.
export default async function AddClubPage() {
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getNetworkContext(user.id)
  if (!ctx || ctx.role !== 'network_admin') return <Forbidden />

  const serviceAccountEmail = await getServiceAccountEmail()

  return <AddClubWizard serviceAccountEmail={serviceAccountEmail} />
}
