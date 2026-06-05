'use client'

// Hook de synchronisation manuelle (DSH-008 + B3 feedback).
//
// Déclenche POST /api/sync { club_id } (auth + rôle ≥ trésorier + rate-limit côté serveur).
// La route renvoie TOUJOURS 200 quand le transport réussit, en reflétant le vrai état métier
// de l'Edge : { success, last_synced_at, errors[], warnings[] } (B3). 429 → erreur 'rate_limited'.
//
// Feedback CENTRALISÉ ici (B3) pour ne pas dupliquer la logique dans les 4 vues :
//   - succès net (success && !warnings)        → toast success « Synchronisation réussie »
//   - succès avec anomalies molles (warnings)  → toast warning « Synchronisé avec des anomalies »
//   - échec (!success, ou !res.ok hors 429)    → toast error « La synchronisation a échoué »
//   - rate-limit (429)                         → throw 'rate_limited' (affiché inline dans le bandeau)
// Le toast est OPTIONNEL : passe `feedback` (API toast + libellés i18n) pour l'activer. Les
// vues qui surfacent déjà l'erreur inline (SyncBanner) restent compatibles via mutation.isError.
//
// Succès → invalide toutes les queries affectées : dashboard, portfolio, market-prices,
// contributions, et vues admin. Réf : DSH-008, B3, apps/web/app/api/sync/route.ts.

import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ToastApi } from '@evolve/ui'

export interface SyncResult {
  success: boolean
  last_synced_at: string | null
  /** Erreurs DURES remontées par l'Edge (feuilles en échec). Vide quand success=true. */
  errors: string[]
  /** Anomalies MOLLES récupérables (lignes ignorées, en-têtes non résolus). N'empêchent pas success. */
  warnings: string[]
}

/** Libellés i18n du feedback de sync (fournis par la vue, le hook reste découplé de next-intl). */
export interface SyncFeedbackLabels {
  successTitle: string
  warningTitle: string
  /** Message optionnel sous le titre warning (ex. « Certaines lignes ont été ignorées. »). */
  warningMessage?: string
  errorTitle: string
}

export interface SyncFeedback {
  toast: ToastApi
  labels: SyncFeedbackLabels
}

export function useSyncStatus(clubId: string | null, feedback?: SyncFeedback) {
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
      const json = (await res.json()) as Partial<SyncResult>
      // Normalisation défensive : la route garantit ces champs, mais on ne crashe jamais.
      return {
        success: json.success === true,
        last_synced_at: json.last_synced_at ?? null,
        errors: Array.isArray(json.errors) ? json.errors : [],
        warnings: Array.isArray(json.warnings) ? json.warnings : [],
      }
    },
    onSuccess: (result) => {
      // L'invalidation a lieu DANS TOUS les cas de transport réussi (même success:false) :
      // l'Edge a pu écrire partiellement, les vues doivent refléter l'état réel de la DB.
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      void queryClient.invalidateQueries({ queryKey: ['market-prices'] })
      void queryClient.invalidateQueries({ queryKey: ['contributions'] })
      void queryClient.invalidateQueries({ queryKey: ['admin'] })

      // Feedback centralisé (opt-in via `feedback`).
      if (!feedback) return
      const { toast, labels } = feedback
      if (!result.success) {
        toast.error({ title: labels.errorTitle })
      } else if (result.warnings.length > 0) {
        toast.warning({
          title: labels.warningTitle,
          ...(labels.warningMessage !== undefined ? { message: labels.warningMessage } : {}),
        })
      } else {
        toast.success({ title: labels.successTitle })
      }
    },
    onError: (error) => {
      // Le rate-limit (429) reste affiché INLINE dans le SyncBanner (pas de toast) ; les autres
      // échecs de transport remontent un toast d'erreur si le feedback est activé.
      if (!feedback || error.message === 'rate_limited') return
      feedback.toast.error({ title: feedback.labels.errorTitle })
    },
  })
}
