import { Skeleton } from '@evolve/ui'

// PAS de wrapper largeur/padding ici : le layout (app) + le layout admin fournissent
// déjà centrage/padding — un wrapper dupliqué décale le skeleton (saut visuel). Ticket C.
export default function AdminMembersLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton height={32} width="40%" radius="8px" />
      <Skeleton height={240} radius="10px" />
    </div>
  )
}
