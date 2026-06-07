import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { brand, dataViz } from '@evolve/design-system'
import type { EditorialArticle, GalerieBloc, LeChiffreBloc } from '@evolve/types'
import { NewsletterEmail, mapArticleToEmail, renderEmailHtml } from '../emails/index.ts'

/**
 * EDI-005 — NewsletterEmail + renderers email par bloc + mapper.
 *
 * On charge le fixture édition 01 (16 blocs), on le mappe en `EditorialArticle`
 * (URLs média absolutisées), on rend l'email et on assert :
 *   - HTML table-based + styles inline + CTA bulletproof MSO/VML ;
 *   - interdits email (#FFF33B, webfont/@font-face, emoji, <script>, #E93E3A près d'un chiffre) ;
 *   - textes clés de l'édition 01 (parité de contenu — EDI-007 complétera) ;
 *   - galerie en pile + fallbackTexte du-chiffre.
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

describe('NewsletterEmail — édition 01', () => {
  it('produit un HTML email table-based avec styles inline', async () => {
    const html = await renderEdition01()
    expect(html).toMatch(/<table/i)
    expect(html).toMatch(/style="/i)
    // Rendu via le shell : logo + bandeau accent.
    expect(html).toMatch(/EVOLVE/i)
  })

  it('expose le CTA bulletproof « LIRE EN LIGNE » (VML MSO + fallback)', async () => {
    const html = await renderEdition01()
    expect(html).toContain('LIRE EN LIGNE')
    // Commentaire conditionnel MSO + VML roundrect pour Outlook.
    expect(html).toMatch(/\[if mso\]/i)
    expect(html).toMatch(/v:roundrect/i)
    expect(html).toContain(ARTICLE_URL)
  })

  it('utilise le jaune brand sûr (#FDC70C) — jamais #FFF33B en fill/CTA', async () => {
    const html = await renderEdition01()
    const lower = html.toLowerCase()
    expect(lower).toContain(brand.yellow.toLowerCase()) // #FDC70C
    // #FFF33B n'apparaît QUE comme 1ère étape du dégradé du bandeau accent du shell
    // (cf. email.accentGradient) — jamais comme couleur de fond plat / fill de CTA.
    const yellowLight = brand.yellowLight.toLowerCase() // #fff33b
    expect(lower).not.toContain(`background-color:${yellowLight}`)
    expect(lower).not.toContain(`fillcolor="${yellowLight}"`)
    // La seule occurrence tolérée est dans le linear-gradient du bandeau accent.
    const occurrences = lower.split(yellowLight).length - 1
    const inGradient = lower.split(`linear-gradient(90deg, ${yellowLight}`).length - 1
    expect(occurrences).toBe(inGradient)
  })

  it('ne contient aucune webfont / @font-face (system fonts uniquement)', async () => {
    const html = await renderEdition01()
    expect(html.toLowerCase()).not.toContain('@font-face')
    expect(html.toLowerCase()).not.toContain('fonts.googleapis')
    expect(html.toLowerCase()).not.toContain('.woff')
    expect(html.toLowerCase()).not.toContain('.otf')
  })

  it('ne contient ni emoji ni <script>', async () => {
    const html = await renderEdition01()
    expect(html.toLowerCase()).not.toContain('<script')
    // Aucun emoji (plages Unicode pictogrammes/symboles).
    expect(html).not.toMatch(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F6FF}]/u)
  })

  it("n'utilise jamais le rouge brand (#E93E3A) près d'un chiffre", async () => {
    const html = await renderEdition01()
    // Le rouge perte autorisé est dataViz.negative (#C53030) ; le rouge brand ne doit
    // jamais apparaître (a fortiori près d'un chiffre comme « 1 000 Md$ »).
    expect(html.toLowerCase()).not.toContain(brand.red.toLowerCase())
    void dataViz
  })

  it("contient les textes clés de l'édition 01 (parité de contenu)", async () => {
    const html = await renderEdition01()
    // React Email encode l'apostrophe en entité (&#x27;) → on tolère les deux formes.
    const apos = "(?:'|&#x27;|&apos;|&#39;)"
    expect(html).toMatch(new RegExp(`Évitons l${apos}empressement`))
    expect(html).toContain('LA QUOTE-PART')
    expect(html).toMatch(/Édition n°01/)
    // Rubriques.
    expect(html).toContain('ÉDITO')
    expect(html).toContain('LE CHIFFRE')
    expect(html).toContain('LA BOUSSOLE')
    expect(html).toMatch(new RegExp(`L${apos}ÉTAGÈRE`))
    // Étagère : auteurs cités.
    expect(html).toContain('Peter Lynch')
    expect(html).toContain('Benjamin Graham')
    // Signature.
    expect(html).toContain('Olivier Ouedraogo')
  })

  it('rend le fallbackTexte du bloc le-chiffre (chiffre lisible si image bloquée)', async () => {
    const html = await renderEdition01()
    expect(html).toContain('1 000 Md$ : le seuil le plus exclusif du capitalisme.')
  })

  it('absolutise les URLs média relatives via mediaBase', async () => {
    const html = await renderEdition01()
    // /uploads/le_chiffre_01_clair.png → https://cms…/uploads/le_chiffre_01_clair.png
    expect(html).toContain(`${MEDIA_BASE}/uploads/le_chiffre_01_clair.png`)
    expect(html).not.toContain('"/uploads/')
  })

  it('rend une galerie en PILE verticale (plusieurs <img> empilées)', async () => {
    const article = loadFixture()
    const galerie: GalerieBloc = {
      __component: 'blocs.galerie',
      id: 99,
      disposition: 'grille', // demandé en grille → DOIT être ignoré (pile en mail)
      legende: 'Trois moments du réseau.',
      images: [
        { url: 'https://cdn.test/g1.png', alternativeText: 'Photo 1' },
        { url: 'https://cdn.test/g2.png', alternativeText: 'Photo 2' },
      ],
    }
    const withGallery: EditorialArticle = { ...article, corps: [galerie] }
    const html = await renderEmailHtml(
      createElement(NewsletterEmail, { article: withGallery, articleUrl: ARTICLE_URL })
    )
    expect(html).toContain('https://cdn.test/g1.png')
    expect(html).toContain('https://cdn.test/g2.png')
    expect(html).toContain('Trois moments du réseau.')
    // Pas de table multi-colonnes de grille : chaque image pleine largeur.
    expect((html.match(/width="100%"/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('rend un bloc le-chiffre seul avec son fallback même sans image', async () => {
    const article = loadFixture()
    const bloc: LeChiffreBloc = {
      __component: 'blocs.le-chiffre',
      id: 77,
      imageClaire: { url: '', alternativeText: '' },
      fallbackTexte: '42 % de patience composée',
      legende: null,
      source: null,
    }
    const withChiffre: EditorialArticle = { ...article, corps: [bloc] }
    const html = await renderEmailHtml(
      createElement(NewsletterEmail, { article: withChiffre, articleUrl: ARTICLE_URL })
    )
    expect(html).toContain('42 % de patience composée')
    expect(html).not.toContain('undefined')
  })
})
