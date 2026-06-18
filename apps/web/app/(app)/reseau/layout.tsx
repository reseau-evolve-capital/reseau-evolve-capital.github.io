import type { ReactNode } from 'react'
import { getSessionUser, getNetworkContext } from '@/lib/data/request'
import { Forbidden } from './Forbidden'
import { ReseauTabs } from './ReseauTabs'

// Garde RSC en défense (le middleware garde déjà la session + is_network_member()).
// Si l'utilisateur n'appartient pas à l'équipe RÉSEAU → 403 propre, sans fuite d'info.
// Identité via getClaims() + contexte réseau mémoïsés par requête (cf. lib/data/request.ts).
//
// La sous-navigation RÉSEAU (ReseauTabs : onglets desktop / drawer mobile) est montée ici,
// au-dessus des pages, comme AdminTabs dans admin/layout (NET-005).
export default async function ReseauLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) return <Forbidden />

  const ctx = await getNetworkContext(user.id)
  if (!ctx) return <Forbidden />

  return (
    <div className="flex flex-col gap-6">
      <ReseauTabs />
      {children}
    </div>
  )
}
