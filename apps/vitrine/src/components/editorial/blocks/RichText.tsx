import type { RichTextBloc } from '@/lib/api'
import BlocksRenderer from '@/components/blog/BlocksRenderer'

/**
 * Texte riche éditorial : réutilise le renderer Strapi blocks legacy
 * (`@strapi/blocks-react-renderer`) déjà câblé dans la vitrine. La prose de
 * marque est appliquée par le conteneur parent (`.prose`).
 */
export default function RichText({ block }: { block: RichTextBloc }) {
  if (!block.contenu || block.contenu.length === 0) return null
  return (
    <div className="my-4">
      <BlocksRenderer content={block.contenu} />
    </div>
  )
}
