import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type {
  EditorialArticle,
  EditorialBloc,
  GalerieBloc,
  ImageBloc,
  CitationBloc,
  LeChiffreBloc,
} from '@evolve/types'
import { NewsletterEmail, mapArticleToEmail, renderEmailHtml } from '../emails/index.ts'
import { renderEmailBlock } from '../emails/blocks/index.tsx'

/**
 * EDI-007 — parité de contenu web/email + edge cases des renderers email.
 *
 * Garde-fou anti-divergence (#15 du contrat) : un même Article rend les MÊMES textes et
 * rubriques, DANS LE MÊME ORDRE, en web et en email. On extrait ici tous les textes du
 * fixture édition-01 (titres de rubrique, exergue de citation, items d'étagère, paragraphes
 * rich-text) et on assert leur présence + l'ordre relatif des rubriques dans le HTML rendu.
 *
 * Ces tests CASSENT si on réintroduit `#FFF33B` en fond/fill, une webfont/@font-face, ou si
 * on rompt la parité de contenu. Ils couvrent aussi : bloc inconnu (warn + null, jamais throw),
 * le-chiffre sans image (fallbackTexte), galerie en pile, et champs optionnels absents.
 */

const MEDIA_BASE = 'https://cms.reseauevolvecapital.com'
const ARTICLE_URL = 'https://reseauevolvecapital.com/blog/evitons-l-empressement'

function loadFixture(): EditorialArticle {
  const path = fileURLToPath(
    new URL('../../../../docs/editorial/fixtures/edition-01.json', import.meta.url)
  )
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
  return mapArticleToEmail(raw, { mediaBase: MEDIA_BASE })
}

function renderEdition01(): Promise<string> {
  const article = loadFixture()
  return renderEmailHtml(createElement(NewsletterEmail, { article, articleUrl: ARTICLE_URL }))
}

/** Rend un seul bloc isolé dans la newsletter (pour les edge cases). */
function renderWithCorps(corps: EditorialBloc[]): Promise<string> {
  const article: EditorialArticle = { ...loadFixture(), corps }
  return renderEmailHtml(createElement(NewsletterEmail, { article, articleUrl: ARTICLE_URL }))
}

/**
 * Décode les entités HTML que React Email produit (`&#x27;`, `&amp;`, `&#xE9;`, …) pour
 * comparer aux textes bruts du fixture sans se soucier de l'encodage. On normalise aussi les
 * espaces (React Email peut réencoder l'espace fine insécable U+202F en `&#x202F;`).
 */
function decodeEntities(html: string): string {
  return html
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

/** Retire les balises HTML → texte « visible » seul. */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
}

/** Texte visible décodé du HTml, espaces normalisés (NBSP/fine → espace simple). */
function visibleText(html: string): string {
  return decodeEntities(stripTags(html)).replace(/[   ]/g, ' ').replace(/\s+/g, ' ')
}

/** Normalise un texte de fixture de la même façon (espaces unifiés). */
function norm(s: string): string {
  return s.replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim()
}

describe('EDI-007 — parité de contenu web/email (édition 01)', () => {
  it('rend TOUS les textes du fixture (rubriques, exergue, paragraphes, étagère)', async () => {
    const text = visibleText(await renderEdition01())

    const expected = [
      // Titres de rubrique (label-rubrique).
      'ÉDITO',
      'LE CHIFFRE',
      'LA BOUSSOLE',
      "L'ÉTAGÈRE",
      'LE MOT DU RÉSEAU',
      // Édito (rich-text) — fragments significatifs.
      'Nous avons traversé deux trimestres calmes.',
      "Évitons l'empressement.",
      // Exergue (citation).
      "La vraie performance n'est pas celle qu'on regarde, c'est celle qu'on construit pendant qu'on dort.",
      // La boussole (rich-text + liste).
      'Trois principes pour traverser le bruit sans se laisser happer par le FOMO',
      'Ne jamais acheter au son du tambour.',
      'Mesurer le temps avant la vélocité.',
      'Se relire avant de réagir.',
      // L'étagère (items répétables : titre + auteur + pourquoi).
      'One Up on Wall Street',
      'Peter Lynch',
      'le portefeuille du dimanche soir bat souvent celui du lundi matin',
      'The Intelligent Investor',
      'Benjamin Graham',
      'la patience est un actif à intérêts composés',
      // Le mot du réseau (rich-text).
      'Le réseau accueille deux nouveaux membres ce semestre.',
      // CTA.
      'Voir ma quote-part',
    ]

    for (const fragment of expected) {
      expect(text, `fragment manquant : « ${fragment} »`).toContain(norm(fragment))
    }
  })

  it("respecte l'ORDRE RELATIF des rubriques (anti-divergence web/email)", async () => {
    const text = visibleText(await renderEdition01())
    const rubriques = ['ÉDITO', 'LE CHIFFRE', 'LA BOUSSOLE', "L'ÉTAGÈRE", 'LE MOT DU RÉSEAU']
    const positions = rubriques.map((r) => text.indexOf(norm(r)))
    // Toutes présentes.
    for (let i = 0; i < rubriques.length; i++) {
      expect(positions[i], `rubrique absente : ${rubriques[i]}`).toBeGreaterThanOrEqual(0)
    }
    // Strictement croissantes = même ordre que le fixture.
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `ordre rompu à ${rubriques[i]}`).toBeGreaterThan(positions[i - 1]!)
    }
  })

  it('ne réintroduit ni #FFF33B en fond/fill, ni webfont/@font-face (régression interdits email)', async () => {
    const lower = (await renderEdition01()).toLowerCase()
    // #FFF33B toléré UNIQUEMENT comme 1re étape du dégradé du bandeau accent du shell.
    expect(lower).not.toContain('background-color:#fff33b')
    expect(lower).not.toContain('fillcolor="#fff33b"')
    // Webfonts proscrites.
    expect(lower).not.toContain('@font-face')
    expect(lower).not.toContain('fonts.googleapis')
    expect(lower).not.toContain('.woff')
    expect(lower).not.toContain('.otf')
  })
})

describe('EDI-007 — résilience des renderers email (edge cases)', () => {
  it('bloc inconnu → renderEmailBlock renvoie null + console.warn (JAMAIS de throw)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // Bloc d'un __component absent du switch (cast volontaire — simule une évolution Strapi).
      const unknown = { __component: 'blocs.inconnu', id: 1 } as unknown as EditorialBloc
      let result: ReturnType<typeof renderEmailBlock> | undefined
      expect(() => {
        result = renderEmailBlock(unknown)
      }).not.toThrow()
      expect(result).toBeNull()
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('blocs.inconnu')
    } finally {
      warn.mockRestore()
    }
  })

  it('le-chiffre SANS image claire ET sans image sombre → fallbackTexte rendu, pas de crash', async () => {
    const bloc: LeChiffreBloc = {
      __component: 'blocs.le-chiffre',
      id: 77,
      imageClaire: { url: '', alternativeText: '' },
      // pas d'imageSombre
      fallbackTexte: '1 000 Md$ : un seuil, pas une cible.',
      legende: null,
      source: null,
    }
    const html = await renderWithCorps([bloc])
    const text = visibleText(html)
    expect(text).toContain(norm('1 000 Md$ : un seuil, pas une cible.'))
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('NaN')
  })

  it('galerie → images EMPILÉES (pile verticale), pas de table grille', async () => {
    const galerie: GalerieBloc = {
      __component: 'blocs.galerie',
      id: 99,
      disposition: 'grille', // demandé en grille → DOIT être ignoré (pile en mail)
      legende: 'Trois moments du réseau.',
      images: [
        { url: 'https://cdn.test/g1.png', alternativeText: 'Photo 1' },
        { url: 'https://cdn.test/g2.png', alternativeText: 'Photo 2' },
        { url: 'https://cdn.test/g3.png', alternativeText: 'Photo 3' },
      ],
    }
    const html = await renderWithCorps([galerie])
    expect(html).toContain('https://cdn.test/g1.png')
    expect(html).toContain('https://cdn.test/g2.png')
    expect(html).toContain('https://cdn.test/g3.png')
    expect(visibleText(html)).toContain('Trois moments du réseau.')
    // Chaque image pleine largeur (pile) : au moins une largeur 100% par image.
    expect((html.match(/width="100%"/g) ?? []).length).toBeGreaterThanOrEqual(3)
    // Pas de mise en grille multi-colonnes (pas d'attribut/structure de colonnes côte-à-côte).
    expect(html.toLowerCase()).not.toContain('display:flex')
    expect(html.toLowerCase()).not.toContain('grid-template-columns')
  })

  it('image SANS légende → rendu sans erreur (jamais d’undefined à l’écran)', async () => {
    const bloc: ImageBloc = {
      __component: 'blocs.image',
      id: 55,
      image: { url: 'https://cdn.test/img.png', alternativeText: 'Une photo' },
      // pas de imageDark, pas de legende
      alt: 'Une photo',
    }
    const html = await renderWithCorps([bloc])
    expect(html).toContain('https://cdn.test/img.png')
    expect(html).toContain('alt="Une photo"')
    expect(html).not.toContain('undefined')
  })

  it('citation SANS attribution → rendu sans tiret orphelin ni undefined', async () => {
    const bloc: CitationBloc = {
      __component: 'blocs.citation',
      id: 33,
      texte: 'La patience est un actif à intérêts composés.',
      attribution: null,
    }
    const html = await renderWithCorps([bloc])
    expect(visibleText(html)).toContain(norm('La patience est un actif à intérêts composés.'))
    expect(html).not.toContain('undefined')
    expect(html).not.toContain('null')
  })
})
