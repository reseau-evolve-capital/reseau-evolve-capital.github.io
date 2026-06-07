import * as React from 'react'

import { cn } from '../../../lib/cn'

/**
 * Illustration étape 1 — iPad : sur iPadOS, l'icône Partager est en HAUT À DROITE
 * de la barre d'adresse (≠ iPhone où elle est en bas). Flèche jaune pointillée qui
 * monte vers le coin haut-droit. Adaptée du HTML standalone (Row 05, variante iPad).
 *
 * Monochrome `currentColor` + accent unique `var(--accent)`. Décorative (aria-hidden).
 */
export function IpadShareStep({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-hidden="true"
      className={cn('h-auto w-full text-text', className)}
      fill="none"
    >
      {/* Barre d'adresse Safari (haut). */}
      <rect x="20" y="16" width="200" height="30" rx="9" fill="currentColor" opacity="0.06" />
      <line
        x1="20"
        y1="46"
        x2="220"
        y2="46"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.18"
      />
      {/* Champ URL (pilule centrale). */}
      <rect
        x="56"
        y="24"
        width="120"
        height="14"
        rx="7"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.30"
      />

      {/* Anneau d'accent autour du bouton Partager (haut-droite, surligné). */}
      <circle cx="200" cy="31" r="13" stroke="var(--accent)" strokeWidth="2.5" />
      <path
        d="M200 24 v9 M200 24 l-3.5 3.5 M200 24 l3.5 3.5"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M195 30 h-1.5 a1.5 1.5 0 0 0 -1.5 1.5 v4 a1.5 1.5 0 0 0 1.5 1.5 h13 a1.5 1.5 0 0 0 1.5 -1.5 v-4 a1.5 1.5 0 0 0 -1.5 -1.5 h-1.5"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flèche jaune pointillée qui monte vers le coin haut-droit. */}
      <path
        d="M150 120 C 188 116, 200 90, 200 56"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 8"
      />
      <path
        d="M192 62 L200 50 L208 62"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Contour de la dalle iPad (cadre). */}
      <rect
        x="20"
        y="16"
        width="200"
        height="160"
        rx="14"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.18"
      />
    </svg>
  )
}
