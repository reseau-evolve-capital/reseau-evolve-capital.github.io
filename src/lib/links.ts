import type { Locale } from './content-types'

const CODE_ROUTES = ['blog', 'clubs']

export const isExternal = (href: string) => /^(https?:|mailto:|tel:)/i.test(href)

const withLeadingSlash = (href: string) => (href.startsWith('/') ? href : `/${href}`)

// URL saisie en CMS rendue telle quelle : schemas surs ou chemin interne, sinon null (jamais `javascript:`).
export const safeHref = (href: string | null | undefined): string | null =>
  href && (isExternal(href) || /^\/(?![/\\])/.test(href)) ? href : null

// Lien saisi dans Strapi (CTA) : externe tel quel, interne prefixe par la langue.
export const localeHref = (locale: Locale, href: string) => (isExternal(href) ? href : `/${locale}${withLeadingSlash(href)}`)

export function resolveLinks<T extends { href: string }>(links: T[], knownSlugs: string[]): T[] {
  return links
    .map((link) => (isExternal(link.href) ? link : { ...link, href: withLeadingSlash(link.href) }))
    .filter((link) => {
      if (isExternal(link.href)) return true
      const path = link.href.split(/[?#]/)[0].replace(/^\/|\/$/g, '')
      if (path === '' || CODE_ROUTES.includes(path.split('/')[0])) return true
      const ok = knownSlugs.includes(path)
      if (!ok) console.warn(`[contenu] lien ignore, page non publiee : ${link.href}`)
      return ok
    })
}
