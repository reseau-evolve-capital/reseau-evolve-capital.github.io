import { Skeleton } from '@evolve/ui'

// Skeleton du chargement RSC de /reseau/clubs (en-tête + bandeau KPI + tableau). Pas de wrapper
// largeur/padding : le layout (app) + le layout /reseau fournissent déjà centrage/padding.
export default function ReseauClubsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton height={32} width="40%" radius="8px" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton height={104} radius="10px" />
        <Skeleton height={104} radius="10px" />
        <Skeleton height={104} radius="10px" />
      </div>
      <Skeleton height={240} radius="10px" />
    </div>
  )
}
