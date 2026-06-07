import type { CSSProperties } from 'react'
import { Fragment } from 'react'
import { Heading, Hr, Link, Section, Text } from '@react-email/components'
import { brand, font, semantic } from '@evolve/design-system'
import { formatMonth } from '@evolve/utils'
import type { EditorialArticle } from '@evolve/types'
import { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'
import { renderEmailBlock } from './blocks/index.tsx'

/**
 * NewsletterEmail — newsletter éditoriale « La Quote-Part » (EDI-005).
 *
 * Monté sur `EvolveEmailShell` avec `hideUnsubscribe={false}` : une newsletter est un
 * email NON-ESSENTIEL → le lien de désinscription du footer reste actif (obligation
 * marketing, cf. shell). Structure (réf. PROMPT_email_template.md) :
 *   1. Mast « LA QUOTE-PART » (caps, tracking) + filet doré.
 *   2. « Édition n°{numeroEdition} — {mois année} ».
 *   3. Titre de l'édition (héro centré) + filet doré dessous.
 *   4. Itération de `article.corps[]` via les renderers de blocs (parité de contenu web/email).
 *   5. Signature (auteurNom / auteurRole).
 *   6. CTA bulletproof « LIRE EN LIGNE » (VML MSO + fallback <a>) → `articleUrl`.
 *
 * Rendu CLAIR baked (pas de variante sombre). System fonts via tokens, aucune webfont,
 * aucun emoji, aucun script, jamais `#FFF33B` (le bandeau accent du shell utilise
 * `#FDC70C`/dégradé). Le footer RGPD provient du shell.
 */
export interface NewsletterEmailProps {
  /** Article éditorial canonique (type 'newsletter'), médias déjà en URLs absolues. */
  article: EditorialArticle
  /** URL publique de l'édition en ligne (vitrine) — cible du CTA « Lire en ligne ». */
  articleUrl: string
  /** Nom du club, transmis au footer. */
  clubName?: string
  /** Base URL de l'app membre (réservé à d'éventuels usages futurs). */
  webUrl?: string
}

const FALLBACK = '—'

/** Période d'édition lisible FR : `datePublication` ISO → « juin 2026 » ; sinon vide. */
function editionPeriod(datePublication: string | null | undefined): string {
  const value = (datePublication ?? '').trim()
  if (value === '') return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return formatMonth(d)
}

export function NewsletterEmail({ article, articleUrl, clubName }: NewsletterEmailProps) {
  const title = (article.title ?? '').trim() || FALLBACK
  const numero = typeof article.numeroEdition === 'number' ? article.numeroEdition : null
  const period = editionPeriod(article.datePublication)
  const editionLine = [
    numero !== null ? `Édition n°${String(numero).padStart(2, '0')}` : null,
    period !== '' ? period : null,
  ]
    .filter(Boolean)
    .join(' — ')

  const auteurNom = (article.auteurNom ?? '').trim()
  const auteurRole = (article.auteurRole ?? '').trim()
  const corps = Array.isArray(article.corps) ? article.corps : []
  const href = (articleUrl ?? '').trim()

  const preview =
    (article.excerpt ?? '').trim() || (editionLine !== '' ? `${editionLine} · ${title}` : title)

  return (
    <EvolveEmailShell preview={preview} clubName={clubName} hideUnsubscribe={false}>
      {/* 1 · Mast */}
      <Section style={mastWrap}>
        <Text style={mast}>LA QUOTE-PART</Text>
        <Hr style={mastRule} />
        {editionLine !== '' ? <Text style={editionMeta}>{editionLine}</Text> : null}
      </Section>

      {/* 3 · Titre héro + filet doré */}
      <Section style={heroWrap}>
        <Heading as="h1" style={heroTitle}>
          {title}
        </Heading>
        <Hr style={heroRule} />
      </Section>

      {/* 4 · Corps : itération des blocs (parité de contenu web/email) */}
      <Section>
        {corps.map((bloc, i) => (
          <Fragment key={`bloc-${bloc.id ?? i}`}>{renderEmailBlock(bloc)}</Fragment>
        ))}
      </Section>

      {/* 5 · Signature */}
      {auteurNom !== '' || auteurRole !== '' ? (
        <Section style={signatureWrap}>
          <Hr style={signatureRule} />
          {auteurNom !== '' ? <Text style={signatureName}>{auteurNom}</Text> : null}
          {auteurRole !== '' ? <Text style={signatureRole}>{auteurRole}</Text> : null}
        </Section>
      ) : null}

      {/* 6 · CTA bulletproof « LIRE EN LIGNE » (VML MSO + fallback <a>) */}
      {href !== '' ? (
        <Section style={ctaWrap}>
          {/* eslint-disable-next-line react/no-danger */}
          <div
            dangerouslySetInnerHTML={{
              __html: bulletproofButton(href, 'LIRE EN LIGNE'),
            }}
          />
        </Section>
      ) : null}
    </EvolveEmailShell>
  )
}

/**
 * Bouton « bulletproof » : VML (`v:roundrect`) pour Outlook desktop (moteur Word, qui
 * ignore `border-radius`/`padding` CSS) entre commentaires conditionnels MSO, + un
 * fallback `<a>` stylé inline pour tous les autres clients. Fond `brand.yellow`, encre
 * `accentInk` (jamais blanc, jamais `#FFF33B`). Réf. PROMPT_email_template.md §221.
 */
function bulletproofButton(href: string, label: string): string {
  const yellow = brand.yellow
  const ink = semantic.accentInk
  return `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="20%" stroke="f" fillcolor="${yellow}">
<w:anchorlock/>
<center style="color:${ink};font-family:sans-serif;font-size:15px;font-weight:bold;letter-spacing:1px;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<a href="${href}" style="background-color:${yellow};color:${ink};display:inline-block;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.06em;line-height:50px;text-align:center;text-decoration:none;width:280px;border-radius:10px;">${label}</a>
<!--<![endif]-->`
}

/* — Styles inline (miroir TS des tokens) — */

const mastWrap: CSSProperties = {
  textAlign: 'center',
  margin: '0 0 22px',
}

const mast: CSSProperties = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '15px',
  letterSpacing: '0.32em',
  textTransform: 'uppercase',
  color: semantic.text,
}

const mastRule: CSSProperties = {
  width: '54px',
  borderTop: `2px solid ${semantic.accent}`,
  borderBottom: 'none',
  margin: '10px auto 12px',
}

const editionMeta: CSSProperties = {
  margin: 0,
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

const heroWrap: CSSProperties = {
  textAlign: 'center',
  margin: '0 0 28px',
}

const heroTitle: CSSProperties = {
  margin: '0 auto',
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '30px',
  lineHeight: '1.14',
  letterSpacing: '-0.02em',
  color: semantic.text,
}

const heroRule: CSSProperties = {
  width: '54px',
  borderTop: `2px solid ${semantic.accent}`,
  borderBottom: 'none',
  margin: '16px auto 0',
}

const signatureWrap: CSSProperties = {
  margin: '8px 0 28px',
}

const signatureRule: CSSProperties = {
  borderColor: semantic.border,
  margin: '0 0 14px',
}

const signatureName: CSSProperties = {
  margin: '0 0 2px',
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '15px',
  color: semantic.text,
}

const signatureRole: CSSProperties = {
  margin: 0,
  fontFamily: font.body,
  fontSize: '13px',
  color: semantic.textTer,
}

const ctaWrap: CSSProperties = {
  textAlign: 'center',
  margin: '8px 0 4px',
}
