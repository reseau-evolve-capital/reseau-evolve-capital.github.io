// POST /api/newsletter/send { slug, confirm } — envoie la campagne réelle (EDI-006).
// Garde staff. JAMAIS de service-role.
//
// Gardes d'envoi (ordre) :
//   (a) confirm !== true → 400 (déverrouillage UI : case « j'ai vérifié l'aperçu + le test ») ;
//   (b) article non PUBLIÉ / introuvable → 409 « brouillon » (l'API publique Strapi ne sert
//       que le publié ; un slug absent = brouillon ou inexistant → on refuse l'envoi) ;
//       + garde de contrat : une newsletter DOIT avoir un numeroEdition (block-contract.md) ;
//   (c) IDEMPOTENCE : nom de campagne déterministe `quote-part-n{numeroEdition}` — si
//       findCampaignByName la trouve déjà → 409 no-op (« déjà envoyée »).
// Sinon : createCampaign(listIds=[BREVO_MEMBERS_LIST_ID]) puis sendCampaignNow.
// Le CTA « Lire en ligne » est résolu sur le slug (jamais générique) via renderNewsletterHtml.

import { NextResponse } from 'next/server'
import {
  campaignName,
  createCampaign,
  findCampaignByName,
  sendCampaignNow,
} from '@evolve/data/brevo'
import { getNewsletterBySlug } from '@/lib/strapi-editorial'
import { guardStaff } from '../_guard'
import { renderNewsletterHtml, subjectFor } from '../_render'
import { membersListId, newsletterSender } from '../config'
import { captureRouteError } from '@/lib/monitoring/sentry'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const guard = await guardStaff()
  if (!guard.ok) return guard.response

  let body: { slug?: unknown; confirm?: unknown }
  try {
    body = (await request.json()) as { slug?: unknown; confirm?: unknown }
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 })
  }
  const slug = body.slug
  if (typeof slug !== 'string' || slug.trim() === '') {
    return NextResponse.json({ error: 'slug requis.' }, { status: 400 })
  }

  // (a) Confirmation obligatoire (déverrouillage UI).
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'confirm', message: 'Confirmation requise.' },
      { status: 400 }
    )
  }

  const listId = membersListId()
  if (listId === null) {
    return NextResponse.json({ error: 'BREVO_MEMBERS_LIST_ID non configuré.' }, { status: 500 })
  }

  // (b) L'article doit être publié (l'API publique ne sert que le publié) + numeroEdition requis.
  const article = await getNewsletterBySlug(slug)
  if (!article) {
    return NextResponse.json(
      { error: 'draft', message: "Édition en brouillon ou introuvable — publiez-la d'abord." },
      { status: 409 }
    )
  }
  if (typeof article.numeroEdition !== 'number') {
    return NextResponse.json(
      { error: 'no_edition', message: "Numéro d'édition manquant sur la newsletter." },
      { status: 409 }
    )
  }

  const name = campaignName(article.numeroEdition)

  // (c) Idempotence : si une campagne du même nom existe déjà → no-op.
  try {
    const existing = await findCampaignByName(name)
    if (existing) {
      return NextResponse.json(
        {
          error: 'already_sent',
          message: 'Cette édition a déjà été envoyée.',
          campaignId: existing.id,
        },
        { status: 409 }
      )
    }
  } catch (error) {
    captureRouteError(error, { endpoint: '/api/newsletter/send', extra: { step: 'verify-brevo' } })
    return NextResponse.json({ error: 'Erreur de vérification Brevo.' }, { status: 502 })
  }

  try {
    const html = await renderNewsletterHtml(article)
    const campaign = await createCampaign({
      name,
      subject: subjectFor(article),
      sender: newsletterSender(),
      htmlContent: html,
      listIds: [listId],
    })
    await sendCampaignNow(campaign.id)
    return NextResponse.json({ ok: true, campaignId: campaign.id, name })
  } catch (error) {
    captureRouteError(error, { endpoint: '/api/newsletter/send', extra: { step: 'send-campaign' } })
    return NextResponse.json({ error: "Échec de l'envoi de la campagne." }, { status: 502 })
  }
}
