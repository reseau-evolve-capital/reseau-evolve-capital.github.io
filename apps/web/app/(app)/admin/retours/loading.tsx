import { Skeleton } from '@evolve/ui'

// Skeleton du chargement RSC de /admin/retours (en-tête + Synthèse IA + KPI + dataviz + tableau).
// Même structure que /reseau/retours (composant partagé) ; le layout /admin fournit le centrage.
export default function AdminRetoursLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton height={32} width="40%" radius="8px" />
      <Skeleton height={140} radius="14px" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton height={104} radius="10px" />
        <Skeleton height={104} radius="10px" />
        <Skeleton height={104} radius="10px" />
        <Skeleton height={104} radius="10px" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton height={200} radius="14px" />
        <Skeleton height={200} radius="14px" />
      </div>
      <Skeleton height={240} radius="10px" />
    </div>
  )
}
