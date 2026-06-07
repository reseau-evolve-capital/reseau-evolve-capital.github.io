import type { CSSProperties, ReactNode } from 'react'
import { Fragment } from 'react'
import { Link, Section, Text } from '@react-email/components'
import { font, semantic } from '@evolve/design-system'
import type { RichTextBloc, StrapiBlocksContent } from '@evolve/types'

/**
 * RichTextBlock — renderer email du bloc `blocs.rich-text`.
 *
 * Convertit les blocks Strapi (`contenu`) en HTML email inline : paragraphes,
 * listes (ordonnées / non ordonnées), texte gras et liens. Aucune classe Tailwind,
 * aucune webfont — system fonts via tokens. Résilient : un nœud inconnu est ignoré
 * (pas de crash, jamais d'`undefined` à l'écran).
 */

/** Nœud texte feuille Strapi : `{ type: 'text', text, bold?, italic?, ... }`. */
interface TextLeaf {
  type: 'text'
  text?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

/** Nœud lien Strapi : `{ type: 'link', url, children: TextLeaf[] }`. */
interface LinkNode {
  type: 'link'
  url?: string
  children?: unknown[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Rend les enfants inline d'un paragraphe / item de liste (texte + gras/italique + liens). */
function renderInline(children: unknown[] | undefined, keyPrefix: string): ReactNode {
  if (!Array.isArray(children)) return null
  return children.map((child, i) => {
    const key = `${keyPrefix}-${i}`
    if (!isRecord(child)) return null

    if (child.type === 'link') {
      const link = child as unknown as LinkNode
      const href = (link.url ?? '').trim()
      const inner = renderInline(link.children, `${key}-l`)
      if (href === '') return <Fragment key={key}>{inner}</Fragment>
      return (
        <Link key={key} href={href} style={anchor}>
          {inner}
        </Link>
      )
    }

    if (child.type === 'text') {
      const leaf = child as unknown as TextLeaf
      const text = leaf.text ?? ''
      if (text === '') return null
      let node: ReactNode = text
      if (leaf.bold) node = <strong style={strong}>{node}</strong>
      if (leaf.italic) node = <em>{node}</em>
      return <Fragment key={key}>{node}</Fragment>
    }

    return null
  })
}

export function RichTextBlock({ bloc }: { bloc: RichTextBloc }) {
  const blocks: StrapiBlocksContent = Array.isArray(bloc.contenu) ? bloc.contenu : []

  return (
    <Section style={wrapper}>
      {blocks.map((node, i) => {
        const key = `rt-${bloc.id}-${i}`
        if (!isRecord(node)) return null

        if (node.type === 'paragraph') {
          return (
            <Text key={key} style={paragraph}>
              {renderInline(node.children as unknown[], key)}
            </Text>
          )
        }

        if (node.type === 'list') {
          const ordered = (node as { format?: string }).format === 'ordered'
          const items = Array.isArray(node.children) ? node.children : []
          const lis = items.map((item, j) => {
            if (!isRecord(item)) return null
            return (
              <li key={`${key}-${j}`} style={listItem}>
                {renderInline(item.children as unknown[], `${key}-${j}`)}
              </li>
            )
          })
          return ordered ? (
            <ol key={key} style={list}>
              {lis}
            </ol>
          ) : (
            <ul key={key} style={list}>
              {lis}
            </ul>
          )
        }

        // Nœud inconnu : on l'ignore silencieusement (résilience, cf. block-contract.md).
        return null
      })}
    </Section>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const wrapper: CSSProperties = { margin: '0 0 8px' }

const paragraph: CSSProperties = {
  margin: '0 0 16px',
  fontFamily: font.body,
  fontSize: '15px',
  lineHeight: '1.65',
  color: semantic.textSec,
}

const list: CSSProperties = {
  margin: '0 0 16px',
  paddingLeft: '22px',
  fontFamily: font.body,
  fontSize: '15px',
  lineHeight: '1.65',
  color: semantic.textSec,
}

const listItem: CSSProperties = {
  marginBottom: '8px',
}

const strong: CSSProperties = {
  color: semantic.text,
  fontWeight: 700,
}

const anchor: CSSProperties = {
  color: semantic.text,
  textDecoration: 'underline',
}
