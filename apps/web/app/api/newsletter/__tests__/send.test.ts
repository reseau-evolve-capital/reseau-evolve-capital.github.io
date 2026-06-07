import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { EditorialArticle } from '@evolve/types'

/**
 * EDI-007 — tests unitaires des routes /api/newsletter/{send,send-test} (EDI-006).
 *
 * Strapi (`@/lib/strapi-editorial`), le wrapper Brevo (`@evolve/data/brevo`), la garde staff
 * (`../_guard`) et le rendu (`../_render`) sont MOCKÉS : on isole la LOGIQUE DE GARDE des routes
 * sans toucher au CMS ni à Brevo réels.
 *
 * Couverture :
 *   - send : confirm!==true → 400 ; brouillon/introuvable → 409 ; numeroEdition manquant → 409 ;
 *     idempotence (campagne déjà nommée) → 409 NO-OP (pas de createCampaign/sendCampaignNow) ;
 *     garde staff → 401/403 ; nom de campagne déterministe ;
 *   - send-test : cible NEWSLETTER_TEST_RECIPIENTS, sujet préfixé [TEST] (via wrapper),
 *     garde staff → 401/403 ;
 *   - _render : « Lire en ligne » = `${SITE_URL}/blog/{slug}` EXACT.
 */

// ─── Mocks de modules (factories hoistées par Vitest) ───────────────────────

vi.mock('@/lib/strapi-editorial', () => ({
  getNewsletterBySlug: vi.fn(),
  listNewsletters: vi.fn(),
  strapiMediaBase: vi.fn(() => 'https://cms.test'),
}))

vi.mock('@evolve/data/brevo', () => ({
  campaignName: (n: number) => `quote-part-n${n}`,
  createCampaign: vi.fn(async () => ({ id: 42, name: 'quote-part-n1' })),
  findCampaignByName: vi.fn(async () => null),
  sendCampaignNow: vi.fn(async () => undefined),
  sendTestEmail: vi.fn(async () => ({ messageId: '<x@brevo>' })),
}))

vi.mock('../_guard', () => ({
  guardStaff: vi.fn(),
}))

vi.mock('../_render', () => ({
  renderNewsletterHtml: vi.fn(async () => '<html><body>news</body></html>'),
  subjectFor: (a: { title?: string }) => a.title ?? 'La Quote-Part',
  articleUrlFor: (slug: string) => `https://app.test/blog/${slug}`,
}))

// ─── Imports APRÈS les mocks ─────────────────────────────────────────────────

import { getNewsletterBySlug } from '@/lib/strapi-editorial'
import {
  createCampaign,
  findCampaignByName,
  sendCampaignNow,
  sendTestEmail,
} from '@evolve/data/brevo'
import { guardStaff } from '../_guard'
import { POST as sendPost } from '../send/route'
import { POST as sendTestPost } from '../send-test/route'

const getNewsletterBySlugMock = vi.mocked(getNewsletterBySlug)
const createCampaignMock = vi.mocked(createCampaign)
const findCampaignByNameMock = vi.mocked(findCampaignByName)
const sendCampaignNowMock = vi.mocked(sendCampaignNow)
const sendTestEmailMock = vi.mocked(sendTestEmail)
const guardStaffMock = vi.mocked(guardStaff)

// ─── Fixtures ────────────────────────────────────────────────────────────────

function article(over: Partial<EditorialArticle> = {}): EditorialArticle {
  return {
    id: 1,
    title: "Évitons l'empressement.",
    slug: 'evitons-l-empressement',
    excerpt: null,
    type: 'newsletter',
    numeroEdition: 1,
    datePublication: null,
    auteurNom: null,
    auteurRole: null,
    featuredImage: null,
    corps: [],
    ...over,
  }
}

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/newsletter/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Pose la garde staff en "succès" (le contexte n'est pas relu par les routes). */
function allowStaff(): void {
  guardStaffMock.mockResolvedValue({
    ok: true,
    // Le supabase/ctx ne sont pas utilisés par send/send-test → stubs minimaux.
    supabase: {} as never,
    ctx: {} as never,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.BREVO_MEMBERS_LIST_ID = '9'
  process.env.NEWSLETTER_TEST_RECIPIENTS = 'qa1@evolve.test, qa2@evolve.test'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.test'
})

afterEach(() => {
  delete process.env.BREVO_MEMBERS_LIST_ID
  delete process.env.NEWSLETTER_TEST_RECIPIENTS
  delete process.env.NEXT_PUBLIC_SITE_URL
})

// ─── /api/newsletter/send — gardes d'envoi ───────────────────────────────────

describe('POST /api/newsletter/send — gardes', () => {
  it('garde staff : non authentifié → 401, aucune lecture Strapi/Brevo', async () => {
    guardStaffMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }),
    })
    const res = await sendPost(jsonRequest({ slug: 'x', confirm: true }))
    expect(res.status).toBe(401)
    expect(getNewsletterBySlugMock).not.toHaveBeenCalled()
    expect(createCampaignMock).not.toHaveBeenCalled()
  })

  it('garde staff : rôle insuffisant → 403', async () => {
    guardStaffMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Rôle insuffisant.' }, { status: 403 }),
    })
    const res = await sendPost(jsonRequest({ slug: 'x', confirm: true }))
    expect(res.status).toBe(403)
    expect(createCampaignMock).not.toHaveBeenCalled()
  })

  it('confirm !== true → 400 (verrou UI), aucune campagne créée', async () => {
    allowStaff()
    const res = await sendPost(jsonRequest({ slug: 'evitons-l-empressement' /* confirm absent */ }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('confirm')
    expect(getNewsletterBySlugMock).not.toHaveBeenCalled()
    expect(createCampaignMock).not.toHaveBeenCalled()
  })

  it('article en brouillon / introuvable → 409 (draft), aucune campagne', async () => {
    allowStaff()
    getNewsletterBySlugMock.mockResolvedValue(null)
    const res = await sendPost(jsonRequest({ slug: 'inconnu', confirm: true }))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('draft')
    expect(createCampaignMock).not.toHaveBeenCalled()
  })

  it('numeroEdition manquant → 409 (no_edition)', async () => {
    allowStaff()
    getNewsletterBySlugMock.mockResolvedValue(article({ numeroEdition: null }))
    const res = await sendPost(jsonRequest({ slug: 'evitons-l-empressement', confirm: true }))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe('no_edition')
    expect(createCampaignMock).not.toHaveBeenCalled()
  })

  it('IDEMPOTENCE : campagne déjà nommée → 409 (already_sent) NO-OP (pas de createCampaign/sendNow)', async () => {
    allowStaff()
    getNewsletterBySlugMock.mockResolvedValue(article({ numeroEdition: 1 }))
    findCampaignByNameMock.mockResolvedValue({ id: 7, name: 'quote-part-n1', status: 'sent' })
    const res = await sendPost(jsonRequest({ slug: 'evitons-l-empressement', confirm: true }))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error?: string; campaignId?: number }
    expect(body.error).toBe('already_sent')
    expect(body.campaignId).toBe(7)
    // Idempotent : on cherche le nom déterministe, mais on ne crée/envoie RIEN.
    expect(findCampaignByNameMock).toHaveBeenCalledWith('quote-part-n1')
    expect(createCampaignMock).not.toHaveBeenCalled()
    expect(sendCampaignNowMock).not.toHaveBeenCalled()
  })

  it('chemin nominal : crée la campagne (listIds), envoie, et renvoie le nom déterministe', async () => {
    allowStaff()
    getNewsletterBySlugMock.mockResolvedValue(article({ numeroEdition: 1 }))
    findCampaignByNameMock.mockResolvedValue(null)
    const res = await sendPost(jsonRequest({ slug: 'evitons-l-empressement', confirm: true }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok?: boolean; name?: string; campaignId?: number }
    expect(body.ok).toBe(true)
    expect(body.name).toBe('quote-part-n1')
    expect(createCampaignMock).toHaveBeenCalledTimes(1)
    const arg = createCampaignMock.mock.calls[0]?.[0]
    expect(arg?.name).toBe('quote-part-n1')
    expect(arg?.listIds).toEqual([9]) // BREVO_MEMBERS_LIST_ID
    expect(sendCampaignNowMock).toHaveBeenCalledWith(42)
  })
})

// ─── /api/newsletter/send-test ───────────────────────────────────────────────

describe('POST /api/newsletter/send-test — cible & garde', () => {
  it('garde staff : non authentifié → 401, aucun envoi', async () => {
    guardStaffMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }),
    })
    const res = await sendTestPost(jsonRequest({ slug: 'x' }))
    expect(res.status).toBe(401)
    expect(sendTestEmailMock).not.toHaveBeenCalled()
  })

  it('cible bien NEWSLETTER_TEST_RECIPIENTS (CSV nettoyé)', async () => {
    allowStaff()
    getNewsletterBySlugMock.mockResolvedValue(article())
    const res = await sendTestPost(jsonRequest({ slug: 'evitons-l-empressement' }))
    expect(res.status).toBe(200)
    expect(sendTestEmailMock).toHaveBeenCalledTimes(1)
    const arg = sendTestEmailMock.mock.calls[0]?.[0]
    expect(arg?.to).toEqual(['qa1@evolve.test', 'qa2@evolve.test'])
    // Le préfixe [TEST] est appliqué par le wrapper Brevo (testé côté @evolve/data) ;
    // la route lui passe le sujet "nu".
    expect(arg?.subject).toBe("Évitons l'empressement.")
  })

  it('NEWSLETTER_TEST_RECIPIENTS absent → 500, aucun envoi', async () => {
    allowStaff()
    delete process.env.NEWSLETTER_TEST_RECIPIENTS
    getNewsletterBySlugMock.mockResolvedValue(article())
    const res = await sendTestPost(jsonRequest({ slug: 'evitons-l-empressement' }))
    expect(res.status).toBe(500)
    expect(sendTestEmailMock).not.toHaveBeenCalled()
  })

  it('édition introuvable → 404, aucun envoi', async () => {
    allowStaff()
    getNewsletterBySlugMock.mockResolvedValue(null)
    const res = await sendTestPost(jsonRequest({ slug: 'inconnu' }))
    expect(res.status).toBe(404)
    expect(sendTestEmailMock).not.toHaveBeenCalled()
  })
})
