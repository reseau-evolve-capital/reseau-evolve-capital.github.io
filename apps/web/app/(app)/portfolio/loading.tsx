import { Skeleton } from '@evolve/ui'

// PAS de wrapper largeur/padding ici : le layout (app) fournit déjà
// `px-4 pt-6 … max-w-[1280px]` — un wrapper dupliqué décale le skeleton
// par rapport au contenu réel (saut visuel skeleton → page). Ticket C.
export default function PortfolioLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* SyncBanner */}
      <Skeleton height={48} radius="10px" />
      {/* Donut d'allocation */}
      <Skeleton height={200} radius="14px" />
      {/* FilterBar */}
      <Skeleton height={44} radius="10px" />
      {/* Lignes de positions */}
      <Skeleton height={56} radius="10px" />
      <Skeleton height={56} radius="10px" />
      <Skeleton height={56} radius="10px" />
    </div>
  )
}
