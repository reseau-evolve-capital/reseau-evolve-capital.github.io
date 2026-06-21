import * as React from 'react'
import { Icon, type IconName } from '../../atoms/Icon'
import { cn } from '../../lib/cn'

export interface ComingSoonCardProps {
  /** Titre du panneau (ex. « Synthèse IA »). */
  title: string
  /** Texte explicatif sobre de ce qui arrive (jamais un faux résumé). */
  description: string
  /** Libellé du badge « Bientôt » (défaut FR). */
  badgeLabel?: string
  /** Icône d'accent (défaut « Sparkles » — pastille IA). */
  icon?: IconName
  /**
   * Si vrai, affiche 3 lignes de skeleton estompées sous le texte pour évoquer le futur contenu
   * (utile pour un panneau « Synthèse IA » pleine largeur). Décoratif (aria-hidden).
   */
  withSkeleton?: boolean
  className?: string
}

/**
 * Panneau « Bientôt » réutilisable (pattern ComingSoon). Annonce une fonctionnalité à venir SANS
 * jamais afficher de faux contenu/chiffre (cf. CLAUDE.md : jamais de NaN/placeholder trompeur).
 *
 * Usage NET-019 : panneau « Synthèse IA » de la console feedbacks — le digest IA agrégé arrive en
 * NET-C / NET-017 ; ici on rend uniquement la promesse, estompée, avec un badge « Bientôt ».
 * Sobre par construction : `bg-card` + accent discret, tokens uniquement (jamais de hex en dur).
 */
export function ComingSoonCard({
  title,
  description,
  badgeLabel = 'Bientôt',
  icon = 'Sparkles',
  withSkeleton = false,
  className,
}: ComingSoonCardProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'relative overflow-hidden rounded-[14px] border border-border bg-card p-5 shadow-[var(--sh-card)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Pastille d'accent discrète (token brand-yellow à faible opacité — pas criard). */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/15 text-text">
            <Icon name={icon} size={20} aria-hidden="true" />
          </span>
          <h2 className="font-display text-[16px] font-extrabold tracking-[-0.01em] text-text">
            {title}
          </h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card-sub px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-text-ter">
          <Icon name="Clock" size={16} className="h-3.5 w-3.5" aria-hidden="true" />
          {badgeLabel}
        </span>
      </div>

      <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-text-sec">{description}</p>

      {withSkeleton && (
        // Lignes estompées : suggèrent le futur contenu sans rien affirmer. Décoratif.
        <div className="mt-4 flex flex-col gap-2.5 opacity-50" aria-hidden="true">
          <div className="h-3 w-[92%] rounded bg-card-sub" />
          <div className="h-3 w-[78%] rounded bg-card-sub" />
          <div className="h-3 w-[64%] rounded bg-card-sub" />
        </div>
      )}
    </section>
  )
}
