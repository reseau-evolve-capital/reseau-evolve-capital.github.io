// Rendu newsletter partagé par preview / send-test / send (EDI-006).
//
// Source unique de l'URL d'article (CTA « Lire en ligne ») et du sujet : on les calcule
// au même endroit pour que l'aperçu, le test et la campagne soient strictement identiques.

import { createElement } from 'react'
import { NewsletterEmail, renderEmailHtml } from '@evolve/data/emails'
import type { EditorialArticle } from '@evolve/types'

/** URL publique de l'édition en ligne (CTA « Lire en ligne ») — résolue, jamais générique. */
export function articleUrlFor(slug: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')
  return `${site}/blog/${slug}`
}

/** Sujet de l'email = titre de l'édition (fallback neutre si vide). */
export function subjectFor(article: EditorialArticle): string {
  const title = (article.title ?? '').trim()
  return title !== '' ? title : 'La Quote-Part'
}

/** Rend le HTML de la newsletter pour un article donné (CTA résolu sur son slug). */
export function renderNewsletterHtml(article: EditorialArticle): Promise<string> {
  return renderEmailHtml(
    createElement(NewsletterEmail, { article, articleUrl: articleUrlFor(article.slug) })
  )
}
