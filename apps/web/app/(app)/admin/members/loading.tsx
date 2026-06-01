import { Skeleton } from '@evolve/ui'

export default function AdminMembersLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 flex flex-col gap-4">
      <Skeleton height={32} width="40%" radius="8px" />
      <Skeleton height={240} radius="10px" />
    </div>
  )
}
