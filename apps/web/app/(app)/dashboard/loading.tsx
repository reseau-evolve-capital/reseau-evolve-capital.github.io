import { Skeleton } from '@evolve/ui'

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-col gap-4">
      <Skeleton height={128} radius="14px" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton height={112} radius="10px" />
        <Skeleton height={112} radius="10px" />
        <Skeleton height={112} radius="10px" />
      </div>
    </div>
  )
}
