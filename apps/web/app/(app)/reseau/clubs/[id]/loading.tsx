import { Skeleton } from '@evolve/ui'

// Skeleton du chargement RSC de la fiche club /reseau/clubs/[id] (en-tête + KPI + sections).
// Pas de wrapper largeur/padding : les layouts (app) + /reseau fournissent déjà centrage/padding.
export default function ReseauClubDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton height={28} width="30%" radius="8px" />
      <Skeleton height={96} radius="12px" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton height={92} radius="10px" />
        <Skeleton height={92} radius="10px" />
        <Skeleton height={92} radius="10px" />
        <Skeleton height={92} radius="10px" />
      </div>
      <Skeleton height={260} radius="10px" />
      <Skeleton height={200} radius="10px" />
    </div>
  )
}
