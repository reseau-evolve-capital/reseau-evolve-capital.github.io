import { Skeleton } from '@evolve/ui'

export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 flex flex-col gap-6">
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
