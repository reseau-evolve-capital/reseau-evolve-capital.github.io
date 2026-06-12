import { Skeleton } from '@evolve/ui'

// PAS de wrapper largeur/padding ici : le layout (app) + le layout admin fournissent
// déjà centrage/padding — un wrapper dupliqué décale le skeleton (saut visuel). Ticket C.
export default function AdminCotisationsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton height={32} width="50%" radius="8px" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
      </div>
      <Skeleton height={160} radius="10px" />
    </div>
  )
}
