import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getSessionUser, getAdminContext } from '@/lib/data/request'
import { AdminPollCreateView } from './AdminPollCreateView'
import { Forbidden } from '../../../admin/Forbidden'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('votes.meta')
  return { title: t('createTitle') }
}

export default async function AdminVotesNewPage() {
  // Garde staff (le layout admin garde déjà ; défense en profondeur, sans fuite).
  const user = await getSessionUser()
  if (!user) return <Forbidden />
  const ctx = await getAdminContext(user.id)
  if (!ctx) return <Forbidden />
  // Création d'un vote = ÉCRITURE : le secrétaire (LECTURE SEULE) n'y accède pas, même en lien direct.
  if (!ctx.canManage) return <Forbidden />

  return <AdminPollCreateView />
}
