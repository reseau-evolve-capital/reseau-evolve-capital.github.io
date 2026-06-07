import type { ReactElement } from 'react'
import type { EditorialBloc } from '@evolve/types'
import { LabelRubriqueBlock } from './LabelRubriqueBlock.tsx'
import { RichTextBlock } from './RichTextBlock.tsx'
import { CitationBlock } from './CitationBlock.tsx'
import { ImageBlock } from './ImageBlock.tsx'
import { GalerieBlock } from './GalerieBlock.tsx'
import { LeChiffreBlock } from './LeChiffreBlock.tsx'
import { EtagereBlock } from './EtagereBlock.tsx'
import { CtaBlock } from './CtaBlock.tsx'
import { SeparateurBlock } from './SeparateurBlock.tsx'

/**
 * EmailBlockRenderer — dispatch email d'un bloc de `Article.corps[]` selon `__component`.
 *
 * Switch exhaustif sur l'union discriminée `EditorialBloc`. Un `__component` inconnu →
 * RIEN rendu + `console.warn` (résilience, JAMAIS de throw — cf. block-contract.md §discriminant).
 */
export function renderEmailBlock(bloc: EditorialBloc): ReactElement | null {
  switch (bloc.__component) {
    case 'blocs.label-rubrique':
      return <LabelRubriqueBlock bloc={bloc} />
    case 'blocs.rich-text':
      return <RichTextBlock bloc={bloc} />
    case 'blocs.citation':
      return <CitationBlock bloc={bloc} />
    case 'blocs.image':
      return <ImageBlock bloc={bloc} />
    case 'blocs.galerie':
      return <GalerieBlock bloc={bloc} />
    case 'blocs.le-chiffre':
      return <LeChiffreBlock bloc={bloc} />
    case 'blocs.etagere':
      return <EtagereBlock bloc={bloc} />
    case 'blocs.cta':
      return <CtaBlock bloc={bloc} />
    case 'blocs.separateur':
      return <SeparateurBlock bloc={bloc} />
    default: {
      // Bloc inconnu : on n'affiche rien et on signale sans crasher.
      const unknown = bloc as { __component?: string }
      // eslint-disable-next-line no-console
      console.warn(
        `[email] Bloc éditorial inconnu, ignoré : ${unknown.__component ?? '(sans type)'}`
      )
      return null
    }
  }
}

export { LabelRubriqueBlock } from './LabelRubriqueBlock.tsx'
export { RichTextBlock } from './RichTextBlock.tsx'
export { CitationBlock } from './CitationBlock.tsx'
export { ImageBlock } from './ImageBlock.tsx'
export { GalerieBlock } from './GalerieBlock.tsx'
export { LeChiffreBlock } from './LeChiffreBlock.tsx'
export { EtagereBlock } from './EtagereBlock.tsx'
export { CtaBlock } from './CtaBlock.tsx'
export { SeparateurBlock } from './SeparateurBlock.tsx'
export { resolveCtaHref, APP_URL, VITRINE_URL } from './_shared.tsx'
