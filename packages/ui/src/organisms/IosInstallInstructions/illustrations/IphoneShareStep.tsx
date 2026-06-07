import * as React from 'react'

import { cn } from '../../../lib/cn'

/**
 * Illustration étape 1 — iPhone : barre d'outils Safari en bas (retour, avance,
 * Partager surligné, signets, onglets) + flèche jaune pointillée qui descend vers
 * l'icône Partager (centre). Adaptée du HTML standalone (Row 05).
 *
 * Monochrome `currentColor` + accent unique `var(--accent)`. Décorative (aria-hidden) :
 * l'information textuelle vit dans le titre/caption de la modale.
 */
export function IphoneShareStep({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-hidden="true"
      className={cn('h-auto w-full text-text', className)}
      fill="none"
    >
      {/* Flèche jaune pointillée, courbée, pointant vers l'icône Partager. */}
      <path
        d="M150 70 C 168 96, 150 130, 122 150"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 8"
      />
      <path
        d="M112 142 L122 152 L132 142"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Barre d'outils Safari (bas). */}
      <rect x="20" y="160" width="200" height="34" rx="10" fill="currentColor" opacity="0.06" />
      <line
        x1="20"
        y1="160"
        x2="220"
        y2="160"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.18"
      />

      {/* Retour ‹ */}
      <path
        d="M48 171 l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* Avance › */}
      <path
        d="M78 171 l6 6 -6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />

      {/* Anneau d'accent autour du bouton Partager (centre, surligné). */}
      <circle cx="120" cy="177" r="15" stroke="var(--accent)" strokeWidth="2.5" />
      {/* Glyphe « Partager » iOS : carré + flèche vers le haut. */}
      <path
        d="M120 169 v11 M120 169 l-4 4 M120 169 l4 4"
        stroke="var(--accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M114 176 h-2 a2 2 0 0 0 -2 2 v5 a2 2 0 0 0 2 2 h16 a2 2 0 0 0 2 -2 v-5 a2 2 0 0 0 -2 -2 h-2"
        stroke="var(--accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Signets (livre) */}
      <path
        d="M158 170 h10 v14 l-5 -3 -5 3 z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* Onglets (carrés) */}
      <rect
        x="188"
        y="170"
        width="9"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.45"
      />
      <rect
        x="193"
        y="175"
        width="9"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.45"
      />
    </svg>
  )
}
