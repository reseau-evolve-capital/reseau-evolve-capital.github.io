import Link from 'next/link'
import type { CtaBloc } from '@/lib/api'
import { resolveCtaUrl, isExternalUrl } from '@/components/editorial/resolveUrl'

/**
 * CTA éditorial. Résolution d'URL : `url` explicite prioritaire, sinon `urlInterne`
 * mappé (cf. docs/editorial/block-contract.md). Bouton doré, focus visible (AA).
 * Si aucune URL n'est résolvable, on ne rend rien (pas de bouton mort).
 */
export default function Cta({ block, locale }: { block: CtaBloc; locale: string }) {
  if (!block.libelle) return null
  const href = resolveCtaUrl(block.url, block.urlInterne, locale)
  if (!href) return null

  const external = isExternalUrl(href)
  const className =
    'inline-flex min-h-[44px] items-center justify-center rounded-md bg-[#FDC70C] px-6 py-3 text-sm font-semibold text-[#231F20] no-underline transition-colors hover:bg-[#e6b40a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#231F20]'

  return (
    <div className="my-8 flex justify-center">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {block.libelle}
        </a>
      ) : (
        <Link href={href} className={className}>
          {block.libelle}
        </Link>
      )}
    </div>
  )
}
