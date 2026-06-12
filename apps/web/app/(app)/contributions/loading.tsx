import { Skeleton } from '@evolve/ui'

// PAS de wrapper largeur/padding ici : le layout (app) fournit déjà
// `px-4 pt-6 … max-w-[1280px]` — un wrapper dupliqué décale le skeleton
// par rapport au contenu réel (saut visuel skeleton → page). Ticket C.
export default function ContributionsLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Titre + Pill statut */}
      <Skeleton height={32} width="50%" radius="8px" />
      {/* SyncBanner */}
      <Skeleton height={48} radius="10px" />
      {/* 3 KPICard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
      </div>
      {/* Carte pénalités */}
      <Skeleton height={64} radius="10px" />
      {/* Timeline mensuelle */}
      <Skeleton height={160} radius="10px" />
    </div>
  )
}
