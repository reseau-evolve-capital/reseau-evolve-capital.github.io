// POST /api/newsletter/send-test { slug } — envoie un email de TEST (EDI-006).
// Garde réseau. Rend la newsletter puis sendTestEmail (transactionnel, sujet préfixé [TEST])
// vers NEWSLETTER_TEST_RECIPIENTS (CSV). BREVO_API_KEY server-only. Pas de service-role.

import { NextResponse } from 'next/server'
import { sendTestEmail } from '@evolve/data/brevo'
import { getNewsletterBySlug } from '@/lib/strapi-editorial'
import { guardNetwork } from '../_guard'
import { renderNewsletterHtml, subjectFor } from '../_render'
import { newsletterSender, testRecipients } from '../config'
import { captureRouteError } from '@/lib/monitoring/sentry'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await guardNetwork()
  if (!guard.ok) return guard.response

  let slug: unknown
  try {
    ;({ slug } = (await request.json()) as { slug?: unknown })
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  if (typeof slug !== 'string' || slug.trim() === '') {
    return NextResponse.json({ error: 'slug requis.' }, { status: 400 })
  }

  const recipients = testRecipients()
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'NEWSLETTER_TEST_RECIPIENTS non configuré.' },
      { status: 500 }
    )
  }

  const article = await getNewsletterBySlug(slug)
  if (!article) return NextResponse.json({ error: 'Édition introuvable.' }, { status: 404 })

  try {
    const html = await renderNewsletterHtml(article)
    await sendTestEmail({
      html,
      subject: subjectFor(article),
      sender: newsletterSender(),
      to: recipients,
    })
  } catch (error) {
    captureRouteError(error, { endpoint: '/api/newsletter/send-test' })
    return NextResponse.json({ error: "Échec de l'envoi du test." }, { status: 502 })
  }

  return NextResponse.json({ ok: true, recipients: recipients.length })
}
