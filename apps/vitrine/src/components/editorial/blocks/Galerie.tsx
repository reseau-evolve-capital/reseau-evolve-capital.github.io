import type { GalerieBloc } from '@/lib/api'
import { getStrapiMediaUrl } from '@/lib/api'

/**
 * Galerie d'images. `disposition: "grille"` → grille responsive
 * (1 col mobile → 2/3 cols desktop) ; `"colonne"` → pile verticale.
 * `alt` dérivé du texte alternatif Strapi (légende globale en complément).
 */
export default function Galerie({ block }: { block: GalerieBloc }) {
  const images = (block.images ?? []).filter((img) => img && img.url)
  if (images.length === 0) return null

  const isGrille = block.disposition === 'grille'
  const containerClass = isGrille
    ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
    : 'flex flex-col gap-4'

  return (
    <figure className="my-8">
      <div className={containerClass}>
        {images.map((img, index) => (
          <div key={`${img.url}-${index}`} className="overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getStrapiMediaUrl(img)}
              alt={img.alternativeText ?? ''}
              width={img.width ?? undefined}
              height={img.height ?? undefined}
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      {block.legende ? (
        <figcaption className="mt-2 text-center text-sm text-gray-600">{block.legende}</figcaption>
      ) : null}
    </figure>
  )
}
