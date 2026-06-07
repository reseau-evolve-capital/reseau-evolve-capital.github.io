import type { EditorialBloc } from '@/lib/api'
import LabelRubrique from '@/components/editorial/blocks/LabelRubrique'
import RichText from '@/components/editorial/blocks/RichText'
import Citation from '@/components/editorial/blocks/Citation'
import ImageBloc from '@/components/editorial/blocks/ImageBloc'
import Galerie from '@/components/editorial/blocks/Galerie'
import LeChiffre from '@/components/editorial/blocks/LeChiffre'
import Etagere from '@/components/editorial/blocks/Etagere'
import Cta from '@/components/editorial/blocks/Cta'
import Separateur from '@/components/editorial/blocks/Separateur'

interface BlockRendererProps {
  corps?: EditorialBloc[] | null
  locale: string
}

/**
 * Itère la dynamic zone `corps[]` et délègue chaque entrée à son composant via
 * `__component`. Bloc inconnu → rien rendu + `console.warn` (jamais de throw,
 * jamais de crash). `corps` vide → état empty neutre.
 * Cf. docs/editorial/block-contract.md.
 */
export default function BlockRenderer({ corps, locale }: BlockRendererProps) {
  if (!corps || corps.length === 0) {
    return (
      <p className="my-8 text-center text-gray-500">
        Le contenu de cette édition n&apos;est pas encore disponible.
      </p>
    )
  }

  return (
    <div data-testid="editorial-block-renderer">
      {corps.map((block) => {
        const key = `${block.__component}-${block.id}`
        switch (block.__component) {
          case 'blocs.label-rubrique':
            return <LabelRubrique key={key} block={block} />
          case 'blocs.rich-text':
            return <RichText key={key} block={block} />
          case 'blocs.citation':
            return <Citation key={key} block={block} />
          case 'blocs.image':
            return <ImageBloc key={key} block={block} />
          case 'blocs.galerie':
            return <Galerie key={key} block={block} />
          case 'blocs.le-chiffre':
            return <LeChiffre key={key} block={block} />
          case 'blocs.etagere':
            return <Etagere key={key} block={block} />
          case 'blocs.cta':
            return <Cta key={key} block={block} locale={locale} />
          case 'blocs.separateur':
            return <Separateur key={key} block={block} />
          default: {
            // Bloc inconnu : résilience, on log et on ne rend rien.
            const unknown = block as { __component?: string }
            console.warn(
              `[BlockRenderer] Bloc inconnu ignoré : ${unknown.__component ?? '(sans __component)'}`
            )
            return null
          }
        }
      })}
    </div>
  )
}
