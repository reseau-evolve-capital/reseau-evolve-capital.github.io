import { Skeleton } from '@evolve/ui'

// PAS de wrapper largeur/padding ici : le layout (app) fournit déjà
// `px-4 pt-6 … max-w-[1280px]` — un wrapper dupliqué décale le skeleton
// par rapport au contenu réel (saut visuel skeleton → page). Ticket C.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton height={128} radius="14px" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton height={112} radius="10px" />
        <Skeleton height={112} radius="10px" />
        <Skeleton height={112} radius="10px" />
      </div>
    </div>
  )
}
