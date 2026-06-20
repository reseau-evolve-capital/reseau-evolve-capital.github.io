'use client'
// ClubSwitcher — sélecteur de club actif pour les membres appartenant à 2+ clubs.
//
// Ne s'affiche QUE si l'utilisateur a ≥ 2 adhésions actives (sinon null).
// Au choix d'un club → appelle setActiveClub (Server Action) puis RECHARGE LA PAGE
// (window.location.reload). On force un reload COMPLET (et pas un simple router.refresh)
// car certains états client (caches React Query par écran, données hydratées du dashboard)
// ne suivaient pas le seul refresh RSC → l'utilisateur devait recharger à la main.
// Avant le reload, on pose un drapeau one-shot pour NE PAS rouvrir le pre-prompt push
// (PushOptInMount) à cause de ce reload technique de bascule de club.
//
// A11y : cibles ≥ 44px, focus visible (shadow glow), navigation clavier native
// (Radix Select gère clavier + screen reader). cursor géré globalement.

import { useTransition } from 'react'
import { SKIP_PUSH_PROMPT_ONCE_KEY } from '@/lib/push/skip-prompt'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
} from '@evolve/ui'
import { setActiveClub } from '@/app/(app)/actions'

export interface ClubSwitcherClub {
  club_id: string
  name: string
  city: string | null
}

interface ClubSwitcherProps {
  clubs: ClubSwitcherClub[]
  activeClubId: string
  /** Libellé aria du sélecteur (i18n). Par défaut : « Club actif ». */
  ariaLabel?: string
}

/**
 * Sélecteur de club pour les membres multi-clubs. Renvoie null si < 2 clubs
 * (affichage du badge statique club géré par la sidebar parente).
 */
export function ClubSwitcher({ clubs, activeClubId, ariaLabel = 'Club actif' }: ClubSwitcherProps) {
  const [isPending, startTransition] = useTransition()

  // Pas de sélecteur pour les membres mono-club.
  if (clubs.length < 2) return null

  const handleValueChange = (clubId: string) => {
    if (clubId === activeClubId) return
    startTransition(async () => {
      const result = await setActiveClub(clubId)
      if (result.ok) {
        // Drapeau one-shot : le reload de bascule ne doit pas rouvrir le pre-prompt push.
        try {
          sessionStorage.setItem(SKIP_PUSH_PROMPT_ONCE_KEY, '1')
        } catch {
          /* sessionStorage indispo (mode privé strict) : sans gravité, le cooldown 7j gère. */
        }
        // Reload COMPLET : recharge le club actif partout (RSC + état client) en une fois.
        window.location.reload()
      }
    })
  }

  return (
    <div className="w-full" aria-label={ariaLabel}>
      <SelectRoot value={activeClubId} onValueChange={handleValueChange} disabled={isPending}>
        <SelectTrigger className="min-h-[44px] w-full" aria-label={ariaLabel} aria-busy={isPending}>
          <SelectValue />
        </SelectTrigger>
        <SelectPortal>
          <SelectContent>
            {clubs.map((club) => (
              <SelectItem key={club.club_id} value={club.club_id} className="min-h-[44px]">
                <span className="font-semibold">{club.name}</span>
                {club.city ? (
                  <span className="ml-1 text-text-ter text-[12px]">· {club.city}</span>
                ) : null}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectPortal>
      </SelectRoot>
    </div>
  )
}
