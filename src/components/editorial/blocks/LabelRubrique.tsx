import type { LabelRubriqueBloc } from '@/lib/api'

/**
 * Marqueur de rubrique : carré doré + texte sombre, en capitales mono.
 * JAMAIS jaune-sur-blanc (contraste RGAA + design system). Le carré doré est
 * purement décoratif (aria-hidden) ; le texte porte la sémantique.
 */
export default function LabelRubrique({ block }: { block: LabelRubriqueBloc }) {
  if (!block.texte) return null
  return (
    <div className="mb-4 mt-10 flex items-center gap-3">
      <span aria-hidden="true" className="inline-block h-3 w-3 flex-shrink-0 bg-[#FDC70C]" />
      <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#231F20]">
        {block.texte}
      </span>
    </div>
  )
}
