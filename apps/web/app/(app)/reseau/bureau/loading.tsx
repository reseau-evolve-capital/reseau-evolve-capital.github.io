import { Skeleton } from '@evolve/ui'

// Skeleton du chargement RSC de /reseau/bureau (en-tête + tableau du bureau). Pas de wrapper
// largeur/padding : les layouts (app) + /reseau fournissent déjà le centrage.
export default function ReseauBureauLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Skeleton height={32} width="40%" radius="8px" />
        <Skeleton height={44} width={180} radius="10px" />
      </div>
      <Skeleton height={280} radius="14px" />
    </div>
  )
}
