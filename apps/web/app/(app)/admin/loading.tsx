import { Skeleton } from '@evolve/ui'

// PAS de wrapper largeur/padding ici : le layout (app) + le layout admin fournissent
// déjà centrage/padding — un wrapper dupliqué décale le skeleton (saut visuel). Ticket C.
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton height={32} width="40%" radius="8px" />
      <Skeleton height={48} radius="10px" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
      </div>
    </div>
  )
}
