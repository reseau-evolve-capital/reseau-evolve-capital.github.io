import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { articleUrlFor, subjectFor } from '../_render'
import type { EditorialArticle } from '@evolve/types'

/**
 * EDI-007 — _render : source unique de l'URL « Lire en ligne » et du sujet.
 *
 * L'URL doit valoir EXACTEMENT `${SITE_URL}/blog/{slug}` (CTA résolu, jamais générique),
 * avec normalisation du slash final de SITE_URL. Le sujet = titre, fallback neutre si vide.
 */

const PREV = process.env.NEXT_PUBLIC_SITE_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.reseauevolvecapital.com'
})
afterEach(() => {
  if (PREV === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = PREV
})

describe('articleUrlFor — « Lire en ligne »', () => {
  it('= ${SITE_URL}/blog/{slug} EXACT', () => {
    expect(articleUrlFor('evitons-l-empressement')).toBe(
      'https://app.reseauevolvecapital.com/blog/evitons-l-empressement'
    )
  })

  it('normalise le slash final de SITE_URL (pas de double //)', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.reseauevolvecapital.com/'
    expect(articleUrlFor('edition-02')).toBe('https://app.reseauevolvecapital.com/blog/edition-02')
  })
})

describe('subjectFor', () => {
  it('= titre de l’édition', () => {
    const a = { title: "Évitons l'empressement." } as EditorialArticle
    expect(subjectFor(a)).toBe("Évitons l'empressement.")
  })

  it('fallback neutre « La Quote-Part » si titre vide', () => {
    const a = { title: '   ' } as EditorialArticle
    expect(subjectFor(a)).toBe('La Quote-Part')
  })
})
