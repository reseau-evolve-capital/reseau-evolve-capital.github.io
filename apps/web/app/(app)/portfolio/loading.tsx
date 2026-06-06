import { Skeleton } from '@evolve/ui'

export default function PortfolioLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-col gap-4">
      {/* SyncBanner */}
      <Skeleton height={48} radius="10px" />
      {/* Donut d'allocation */}
      <Skeleton height={200} radius="14px" />
      {/* FilterBar */}
      <Skeleton height={44} radius="10px" />
      {/* Lignes de positions */}
      <Skeleton height={56} radius="10px" />
      <Skeleton height={56} radius="10px" />
      <Skeleton height={56} radius="10px" />
    </div>
  )
}
