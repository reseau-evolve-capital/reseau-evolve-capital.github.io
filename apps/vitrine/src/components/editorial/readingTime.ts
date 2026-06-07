import type { EditorialBloc } from '@/lib/api'

/** Extrait récursivement le texte brut d'un noeud de blocks Strapi. */
function extractBlocksText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const obj = node as { text?: unknown; children?: unknown }
  let text = typeof obj.text === 'string' ? obj.text + ' ' : ''
  if (Array.isArray(obj.children)) {
    for (const child of obj.children) text += extractBlocksText(child)
  }
  return text
}

/** Compte les mots de tout le contenu textuel de `corps`. */
function countWords(corps: EditorialBloc[]): number {
  let text = ''
  for (const block of corps) {
    switch (block.__component) {
      case 'blocs.rich-text':
        for (const node of block.contenu) text += extractBlocksText(node)
        break
      case 'blocs.citation':
        text += `${block.texte} ${block.attribution ?? ''} `
        break
      case 'blocs.label-rubrique':
        text += `${block.texte} `
        break
      case 'blocs.etagere':
        for (const item of block.items ?? []) {
          text += `${item.titre} ${item.auteur ?? ''} ${item.pourquoi ?? ''} `
        }
        break
      case 'blocs.le-chiffre':
        text += `${block.legende ?? ''} ${block.fallbackTexte ?? ''} `
        break
      default:
        break
    }
  }
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.length
}

/**
 * Temps de lecture estimé en minutes (≈ 200 mots/min, minimum 1).
 */
export function estimateReadingTime(corps?: EditorialBloc[] | null): number {
  if (!corps || corps.length === 0) return 1
  const words = countWords(corps)
  return Math.max(1, Math.round(words / 200))
}
