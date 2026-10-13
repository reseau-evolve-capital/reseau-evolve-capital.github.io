const CODE_ROUTES = ['blog', 'clubs']

export function resolveLinks<T extends { href: string }>(links: T[], knownSlugs: string[]): T[] {
  return links.filter((link) => {
    if (/^https?:|^mailto:|^tel:/.test(link.href)) return true
    const path = link.href.split(/[?#]/)[0].replace(/^\/|\/$/g, '')
    if (path === '' || CODE_ROUTES.includes(path.split('/')[0])) return true
    const ok = knownSlugs.includes(path)
    if (!ok) console.warn(`[contenu] lien ignore, page non publiee : ${link.href}`)
    return ok
  })
}
