import { getStrapiMediaUrl, type StrapiMediaRef } from '@/lib/api'

const ORDER = ['large', 'medium', 'small'] as const

// next/image n'optimise rien en export statique : on sert toujours le derive Strapi le plus grand raisonnable.
export function imageUrl(media: StrapiMediaRef | null | undefined): string | null {
  if (!media?.url) return null
  const format = ORDER.map((k) => media.formats?.[k]).find((f) => f?.url)
  return getStrapiMediaUrl(format ?? media) || null
}
