import { Skeleton } from '@evolve/ui'

export default function ContributionsLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 flex flex-col gap-4">
      {/* Titre + Pill statut */}
      <Skeleton height={32} width="50%" radius="8px" />
      {/* SyncBanner */}
      <Skeleton height={48} radius="10px" />
      {/* 3 KPICard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
        <Skeleton height={96} radius="10px" />
      </div>
      {/* Carte pénalités */}
      <Skeleton height={64} radius="10px" />
      {/* Timeline mensuelle */}
      <Skeleton height={160} radius="10px" />
    </div>
  )
}
