import type { ImageBloc as ImageBlocType } from '@/lib/api'
import { getStrapiMediaUrl } from '@/lib/api'

/**
 * Image éditoriale. Light/dark via `<picture>` : la `source` ciblée par
 * `prefers-color-scheme: dark` sert la variante sombre (`imageDark`) si présente ;
 * le `<img>` par défaut reste la variante claire. Pas de toggle global (la vitrine
 * n'en a pas) — on respecte la préférence système, scopé au bloc.
 * `alt` est requis par le contrat.
 */
export default function ImageBloc({ block }: { block: ImageBlocType }) {
  const lightUrl = getStrapiMediaUrl(block.image)
  if (!lightUrl) return null
  const darkUrl = block.imageDark ? getStrapiMediaUrl(block.imageDark) : ''

  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-lg">
        <picture>
          {darkUrl ? <source srcSet={darkUrl} media="(prefers-color-scheme: dark)" /> : null}
          <img
            src={lightUrl}
            alt={block.alt}
            width={block.image.width ?? undefined}
            height={block.image.height ?? undefined}
            className="h-auto w-full"
            loading="lazy"
          />
        </picture>
      </div>
      {block.legende ? (
        <figcaption className="mt-2 text-center text-sm text-gray-600">{block.legende}</figcaption>
      ) : null}
    </figure>
  )
}
