import { Skeleton } from '@evolve/ui'

export default function AdminSettingsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton height={32} width="40%" radius="8px" />
      <Skeleton height={300} radius="10px" />
      <Skeleton height={160} radius="10px" />
    </div>
  )
}
