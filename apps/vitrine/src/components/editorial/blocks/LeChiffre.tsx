import type { LeChiffreBloc } from '@/lib/api'
import { getStrapiMediaUrl } from '@/lib/api'

/**
 * « Le chiffre » : visuel data clair/sombre via `<picture>` + légende + source.
 * Si aucune image n'est disponible, on affiche `fallbackTexte` (toujours rendu
 * en texte accessible, pas de visuel vide). `alt` dérivé du texte alternatif
 * de l'image claire, fallback sur la légende.
 */
export default function LeChiffre({ block }: { block: LeChiffreBloc }) {
  const lightUrl = getStrapiMediaUrl(block.imageClaire)
  const darkUrl = block.imageSombre ? getStrapiMediaUrl(block.imageSombre) : ''
  const alt = block.imageClaire?.alternativeText || block.legende || block.fallbackTexte || ''

  return (
    <figure className="my-8 rounded-lg bg-[#F4F4F2] p-4 sm:p-6">
      {lightUrl ? (
        <picture>
          {darkUrl ? <source srcSet={darkUrl} media="(prefers-color-scheme: dark)" /> : null}
          <img
            src={lightUrl}
            alt={alt}
            width={block.imageClaire.width ?? undefined}
            height={block.imageClaire.height ?? undefined}
            className="mx-auto h-auto w-full"
            loading="lazy"
          />
        </picture>
      ) : block.fallbackTexte ? (
        <p className="text-center text-2xl font-bold text-[#231F20]">{block.fallbackTexte}</p>
      ) : null}

      {(block.legende || block.source) && (
        <figcaption className="mt-3 text-center text-sm text-gray-600">
          {block.legende ? <span>{block.legende}</span> : null}
          {block.source ? (
            <span className="mt-1 block text-xs italic text-gray-500">{block.source}</span>
          ) : null}
        </figcaption>
      )}
    </figure>
  )
}
