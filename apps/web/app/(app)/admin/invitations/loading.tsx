import { Skeleton } from '@evolve/ui'

export default function AdminInvitationsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton height={32} width="40%" radius="8px" />
      <Skeleton height={56} radius="10px" />
      <Skeleton height={200} radius="10px" />
    </div>
  )
}
