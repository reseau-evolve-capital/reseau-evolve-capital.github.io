// GET /api/newsletter/preview?slug=… — aperçu HTML de la newsletter (EDI-006).
// Garde réseau. Renvoie le HTML brut (text/html) pour affichage en <iframe srcDoc>.
// Pas de service-role. La lecture Strapi ne renvoie que le publié (draftAndPublish).

import { NextResponse } from 'next/server'
import { getNewsletterBySlug } from '@/lib/strapi-editorial'
import { guardNetwork } from '../_guard'
import { renderNewsletterHtml } from '../_render'
import { captureRouteError } from '@/lib/monitoring/sentry'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const guard = await guardNetwork()
  if (!guard.ok) return guard.response

  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug requis.' }, { status: 400 })

  let html: string
  try {
    const article = await getNewsletterBySlug(slug)
    if (!article) return NextResponse.json({ error: 'Édition introuvable.' }, { status: 404 })
    html = await renderNewsletterHtml(article)
  } catch (error) {
    captureRouteError(error, { endpoint: '/api/newsletter/preview', extra: { slug } })
    return NextResponse.json({ error: "Erreur de rendu de l'aperçu." }, { status: 500 })
  }

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
  })
}
