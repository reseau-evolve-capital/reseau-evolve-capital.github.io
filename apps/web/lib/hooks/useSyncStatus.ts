'use client'

// Hook de synchronisation manuelle (DSH-008).
//
// Déclenche POST /api/sync { club_id } (auth + rôle ≥ trésorier + rate-limit côté serveur).
// 429 → erreur 'rate_limited' (le bandeau l'affiche en inline). Succès → invalide toutes
// les queries affectées : dashboard, portfolio, market-prices, contributions, et vues admin.
// Réf : DSH-008, apps/web/app/api/sync/route.ts.

import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface SyncResult {
  success: boolean
  last_synced_at: string | null
}

export function useSyncStatus(clubId: string | null) {
  const queryClient = useQueryClient()
  return useMutation<SyncResult, Error>({
    mutationFn: async () => {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId }),
      })
      if (res.status === 429) throw new Error('rate_limited')
      if (!res.ok) throw new Error('sync_failed')
      return (await res.json()) as SyncResult
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      void queryClient.invalidateQueries({ queryKey: ['market-prices'] })
      void queryClient.invalidateQueries({ queryKey: ['contributions'] })
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
