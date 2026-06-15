import { describe, expect, it } from 'vitest'
import { getStrapiOgImage, resolveBlogOgImage, BLOG_OG_FALLBACK } from './api'
import type { StrapiMedia, StrapiMediaRef } from './api'

// RT-07 — couvre le helper og:image (choix du dérivé Strapi + dimensions + type).
// Premier test du workspace apps/vitrine (SSG sans runner jusqu'ici) : ciblé sur
// la logique pure de sélection de format, sans toucher la config de build.

const fmt = (url: string, width: number, height: number) => ({ url, width, height })

describe('getStrapiOgImage', () => {
  it('choisit le dérivé `large` quand il existe', () => {
    const media = {
      url: '/uploads/original.jpg',
      width: 5616,
      height: 2592,
      formats: {
        thumbnail: fmt('/uploads/thumbnail_x.jpg', 245, 113),
        small: fmt('/uploads/small_x.jpg', 500, 231),
        medium: fmt('/uploads/medium_x.jpg', 750, 346),
        large: fmt('/uploads/large_x.jpg', 1000, 462),
      },
    } as unknown as StrapiMedia

    expect(getStrapiOgImage(media)).toEqual({
      url: 'http://localhost:1337/uploads/large_x.jpg',
      width: 1000,
      height: 462,
      type: 'image/jpeg',
    })
  })

  it('retombe sur `medium` quand `large` est absent', () => {
    const media = {
      url: '/uploads/original.jpg',
      width: 2000,
      height: 924,
      formats: {
        small: fmt('/uploads/small_x.jpg', 500, 231),
        medium: fmt('/uploads/medium_x.jpg', 750, 346),
      },
    } as unknown as StrapiMedia

    expect(getStrapiOgImage(media)).toEqual({
      url: 'http://localhost:1337/uploads/medium_x.jpg',
      width: 750,
      height: 346,
      type: 'image/jpeg',
    })
  })

  it('retombe sur `small` quand seul `small` existe', () => {
    const media = {
      url: '/uploads/original.jpg',
      width: 800,
      height: 369,
      formats: {
        small: fmt('/uploads/small_x.jpg', 500, 231),
      },
    } as unknown as StrapiMedia

    expect(getStrapiOgImage(media)).toEqual({
      url: 'http://localhost:1337/uploads/small_x.jpg',
      width: 500,
      height: 231,
      type: 'image/jpeg',
    })
  })

  it("retombe sur l'original quand aucun dérivé n'existe", () => {
    const media: StrapiMediaRef = {
      url: '/uploads/original.jpg',
      width: 400,
      height: 185,
    }

    expect(getStrapiOgImage(media)).toEqual({
      url: 'http://localhost:1337/uploads/original.jpg',
      width: 400,
      height: 185,
      type: 'image/jpeg',
    })
  })

  it('renvoie 0 en dimensions quand un StrapiMediaRef sans formats ni width/height', () => {
    const media: StrapiMediaRef = { url: '/uploads/original.jpg' }

    expect(getStrapiOgImage(media)).toEqual({
      url: 'http://localhost:1337/uploads/original.jpg',
      width: 0,
      height: 0,
      type: 'image/jpeg',
    })
  })

  it('renvoie null pour un média absent', () => {
    expect(getStrapiOgImage(null)).toBeNull()
    expect(getStrapiOgImage(undefined)).toBeNull()
    expect(getStrapiOgImage({ url: '' } as StrapiMediaRef)).toBeNull()
  })

  it('préfixe les URLs relatives et laisse les URLs absolues intactes', () => {
    const relative: StrapiMediaRef = { url: '/uploads/rel.jpg', width: 10, height: 5 }
    expect(getStrapiOgImage(relative)?.url).toBe('http://localhost:1337/uploads/rel.jpg')

    const absolute = {
      url: 'https://cdn.example.com/original.jpg',
      width: 5616,
      height: 2592,
      formats: {
        large: fmt('https://cdn.example.com/large_x.jpg', 1000, 462),
      },
    } as unknown as StrapiMedia
    expect(getStrapiOgImage(absolute)?.url).toBe('https://cdn.example.com/large_x.jpg')
  })
})

// RT-07 option b — un article SANS featuredImage doit quand même émettre une
// og:image (fallback local), pour ne plus jamais partager une preview vide.
describe('resolveBlogOgImage', () => {
  it('dérive le dérivé Strapi quand une featuredImage existe', () => {
    const media = {
      url: '/uploads/original.jpg',
      width: 5616,
      height: 2592,
      formats: {
        large: fmt('/uploads/large_x.jpg', 1000, 462),
      },
    } as unknown as StrapiMedia

    expect(resolveBlogOgImage(media)).toEqual({
      url: 'http://localhost:1337/uploads/large_x.jpg',
      secureUrl: 'http://localhost:1337/uploads/large_x.jpg',
      width: 1000,
      height: 462,
      type: 'image/jpeg',
    })
  })

  it('retombe sur le fallback local /og-blog-fallback.png quand featuredImage est absente', () => {
    expect(resolveBlogOgImage(null)).toEqual({
      url: '/og-blog-fallback.png',
      secureUrl: '/og-blog-fallback.png',
      width: 1200,
      height: 630,
      type: 'image/png',
    })
    expect(resolveBlogOgImage(undefined)).toEqual(BLOG_OG_FALLBACK)
    expect(resolveBlogOgImage({ url: '' } as StrapiMediaRef)).toEqual(BLOG_OG_FALLBACK)
  })
})
