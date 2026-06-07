// GET /api/newsletter/preview?slug=… — aperçu HTML de la newsletter (EDI-006).
// Garde staff. Renvoie le HTML brut (text/html) pour affichage en <iframe srcDoc>.
// Pas de service-role. La lecture Strapi ne renvoie que le publié (draftAndPublish).

import { NextResponse } from 'next/server'
import { getNewsletterBySlug } from '@/lib/strapi-editorial'
import { guardStaff } from '../_guard'
import { renderNewsletterHtml } from '../_render'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const guard = await guardStaff()
  if (!guard.ok) return guard.response

  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug requis.' }, { status: 400 })

  let html: string
  try {
    const article = await getNewsletterBySlug(slug)
    if (!article) return NextResponse.json({ error: 'Édition introuvable.' }, { status: 404 })
    html = await renderNewsletterHtml(article)
  } catch {
    return NextResponse.json({ error: "Erreur de rendu de l'aperçu." }, { status: 500 })
  }

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
  })
}
