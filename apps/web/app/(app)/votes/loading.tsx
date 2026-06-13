import { Skeleton } from '@evolve/ui'

// Pas de wrapper largeur/padding (fourni par le layout (app)) — évite le saut visuel.
export default function VotesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton height={32} width="40%" radius="8px" />
      <Skeleton height={40} width="60%" radius="8px" />
      <div className="flex flex-col gap-3">
        <Skeleton height={96} radius="12px" />
        <Skeleton height={96} radius="12px" />
        <Skeleton height={96} radius="12px" />
      </div>
    </div>
  )
}
