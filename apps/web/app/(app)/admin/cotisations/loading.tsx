import { Skeleton } from '@evolve/ui'

export default function AdminCotisationsLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 flex flex-col gap-6">
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
