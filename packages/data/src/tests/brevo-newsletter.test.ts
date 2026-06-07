import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { EditorialArticle } from '@evolve/types'
import { NewsletterEmail, mapArticleToEmail, renderEmailHtml } from '../emails/index.ts'
import {
  campaignName,
  createCampaign,
  findCampaignByName,
  sendCampaignNow,
  sendTestEmail,
  TEST_SUBJECT_PREFIX,
} from '../brevo/index.ts'

/**
 * EDI-006 — wrapper Brevo (fetch mocké, clé injectée).
 *
 * Couvre : sujet de test préfixé « [TEST] » + transactionnel, payload de campagne correct
 * (sender/subject/htmlContent/listIds), idempotence (findCampaignByName), clé en header
 * `api-key`, et présence de l'URL d'article EXACTE dans le HTML rendu.
 */

const API_KEY = 'test-key-xxxx'
const SENDER = { name: 'Evolve Capital', email: 'newsletter@reseauevolvecapital.com' }
const ARTICLE_URL = 'https://app.reseauevolvecapital.com/blog/evitons-l-empressement'
const MEDIA_BASE = 'https://cms.reseauevolvecapital.com'

/** Réponse fetch minimale OK. */
function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function loadArticle(): EditorialArticle {
  const path = fileURLToPath(
    new URL('../../../../docs/editorial/fixtures/edition-01.json', import.meta.url)
  )
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
  return mapArticleToEmail(raw, { mediaBase: MEDIA_BASE })
}

function renderEdition(): Promise<string> {
  const article = loadArticle()
  return renderEmailHtml(createElement(NewsletterEmail, { article, articleUrl: ARTICLE_URL }))
}

describe('Brevo — envoi de test', () => {
  it('POST /v3/smtp/email avec sujet préfixé [TEST] et clé en header api-key', async () => {
    const html = await renderEdition()
    const fetchMock = vi.fn(async () => okJson({ messageId: '<abc@brevo>' }))
    const res = await sendTestEmail(
      { html, subject: "Évitons l'empressement", sender: SENDER, to: ['qa@evolve.test'] },
      { fetch: fetchMock as unknown as typeof fetch, apiKey: API_KEY }
    )

    expect(res.messageId).toBe('<abc@brevo>')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect((init.headers as Record<string, string>)['api-key']).toBe(API_KEY)
    const body = JSON.parse(init.body as string)
    expect(body.subject).toBe(`${TEST_SUBJECT_PREFIX}Évitons l'empressement`)
    expect(body.subject.startsWith('[TEST] ')).toBe(true)
    expect(body.to).toEqual([{ email: 'qa@evolve.test' }])
    // L'URL d'article EXACTE doit être présente dans le HTML envoyé (CTA résolu).
    expect(body.htmlContent).toContain(ARTICLE_URL)
  })

  it('refuse un envoi de test sans destinataire', async () => {
    const fetchMock = vi.fn(async () => okJson({}))
    await expect(
      sendTestEmail(
        { html: '<p/>', subject: 's', sender: SENDER, to: [] },
        { fetch: fetchMock as unknown as typeof fetch, apiKey: API_KEY }
      )
    ).rejects.toThrow(/destinataire/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('Brevo — campagne (idempotence)', () => {
  it('nom de campagne déterministe quote-part-n{numero}', () => {
    expect(campaignName(1)).toBe('quote-part-n1')
    expect(campaignName(12)).toBe('quote-part-n12')
  })

  it('findCampaignByName renvoie la campagne existante (no-op futur)', async () => {
    const fetchMock = vi.fn(async () =>
      okJson({ campaigns: [{ id: 7, name: 'quote-part-n1', status: 'sent' }] })
    )
    const found = await findCampaignByName('quote-part-n1', {
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: API_KEY,
    })
    expect(found).toEqual({ id: 7, name: 'quote-part-n1', status: 'sent' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v3/emailCampaigns')
    expect((init.headers as Record<string, string>)['api-key']).toBe(API_KEY)
  })

  it('findCampaignByName renvoie null si absente', async () => {
    const fetchMock = vi.fn(async () => okJson({ campaigns: [{ id: 1, name: 'autre' }] }))
    const found = await findCampaignByName('quote-part-n1', {
      fetch: fetchMock as unknown as typeof fetch,
      apiKey: API_KEY,
    })
    expect(found).toBeNull()
  })

  it('createCampaign poste le bon payload (sender/subject/htmlContent/listIds)', async () => {
    const html = await renderEdition()
    const fetchMock = vi.fn(async () => okJson({ id: 42 }))
    const campaign = await createCampaign(
      {
        name: campaignName(1),
        subject: "Évitons l'empressement",
        sender: SENDER,
        htmlContent: html,
        listIds: [9],
      },
      { fetch: fetchMock as unknown as typeof fetch, apiKey: API_KEY }
    )
    expect(campaign).toEqual({ id: 42, name: 'quote-part-n1' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.brevo.com/v3/emailCampaigns')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.name).toBe('quote-part-n1')
    expect(body.subject).toBe("Évitons l'empressement")
    expect(body.sender).toEqual(SENDER)
    expect(body.recipients).toEqual({ listIds: [9] })
    expect(body.htmlContent).toContain(ARTICLE_URL)
  })

  it('sendCampaignNow appelle /sendNow', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    await sendCampaignNow(42, { fetch: fetchMock as unknown as typeof fetch, apiKey: API_KEY })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.brevo.com/v3/emailCampaigns/42/sendNow')
    expect(init.method).toBe('POST')
  })

  it('propage une erreur HTTP Brevo (status non-OK)', async () => {
    const fetchMock = vi.fn(async () => okJson({ code: 'unauthorized' }, 401))
    await expect(
      sendCampaignNow(1, { fetch: fetchMock as unknown as typeof fetch, apiKey: API_KEY })
    ).rejects.toThrow(/401/)
  })

  it('exige BREVO_API_KEY (server-only) si non injectée et absente de env', async () => {
    const prev = process.env.BREVO_API_KEY
    delete process.env.BREVO_API_KEY
    try {
      await expect(
        findCampaignByName('x', { fetch: vi.fn() as unknown as typeof fetch })
      ).rejects.toThrow(/BREVO_API_KEY/)
    } finally {
      if (prev !== undefined) process.env.BREVO_API_KEY = prev
    }
  })
})
