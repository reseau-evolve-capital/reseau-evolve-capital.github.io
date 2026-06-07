import * as React from 'react'

import { cn } from '../../../lib/cn'

/**
 * Illustration étape 2 — menu Partager iOS : liste d'actions (Copier, Ajouter aux
 * favoris, « Sur l'écran d'accueil » SURLIGNÉE, Marquer), chaque ligne avec son
 * glyphe à droite. La ligne cible est surlignée avec l'unique rgba accent autorisé
 * par la spec : rgba(253,199,12,0.20). Adaptée du HTML standalone (Row 05, étape 2).
 *
 * Le libellé de la ligne cible est passé en prop (i18n) ; les autres lignes sont
 * schématisées par des barres (pas de texte → pas de traduction nécessaire).
 * Monochrome `currentColor` + accent unique `var(--accent)`. Décorative (aria-hidden).
 */
export function ShareMenuStep({
  highlightLabel,
  className,
}: {
  highlightLabel: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-hidden="true"
      className={cn('h-auto w-full text-text', className)}
      fill="none"
    >
      {/* Feuille du menu Partager (remonte du bas). */}
      <rect x="20" y="20" width="200" height="170" rx="14" fill="currentColor" opacity="0.04" />
      <rect
        x="20"
        y="20"
        width="200"
        height="170"
        rx="14"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.18"
      />
      {/* Poignée du menu. */}
      <rect x="108" y="30" width="24" height="4" rx="2" fill="currentColor" opacity="0.30" />

      {/* Ligne 1 — Copier (barre + glyphe copie). */}
      <rect x="36" y="56" width="90" height="8" rx="4" fill="currentColor" opacity="0.30" />
      <rect
        x="186"
        y="50"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity="0.45"
      />
      <rect
        x="182"
        y="54"
        width="14"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        opacity="0.45"
      />

      {/* Ligne 2 — Ajouter aux favoris (barre + étoile). */}
      <rect x="36" y="84" width="110" height="8" rx="4" fill="currentColor" opacity="0.30" />
      <path
        d="M192 80 l2.5 5 5.5 .8 -4 3.9 .9 5.5 -4.9 -2.6 -4.9 2.6 .9 -5.5 -4 -3.9 5.5 -.8 z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.45"
      />

      {/* Ligne 3 — « Sur l'écran d'accueil » SURLIGNÉE (rgba accent autorisé).
          Texte/glyphe en var(--text) (auto-swap light/dark) : lisible sur le tint
          translucide jaune posé sur --card dans les deux thèmes. */}
      <rect x="28" y="106" width="184" height="30" rx="9" fill="rgba(253,199,12,0.20)" />
      <text x="40" y="125" fontSize="12" fontWeight="600" fill="var(--text)">
        {highlightLabel}
      </text>
      {/* Glyphe « + dans un carré » (ajouter à l'écran d'accueil). */}
      <rect x="186" y="113" width="16" height="16" rx="3" stroke="var(--text)" strokeWidth="1.8" />
      <path
        d="M194 117 v8 M190 121 h8"
        stroke="var(--text)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Ligne 4 — Marquer (barre + glyphe page). */}
      <rect x="36" y="156" width="80" height="8" rx="4" fill="currentColor" opacity="0.30" />
      <path
        d="M188 150 h10 l4 4 v12 h-14 z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity="0.45"
      />
    </svg>
  )
}
