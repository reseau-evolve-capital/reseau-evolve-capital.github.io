import { describe, expect, it } from 'vitest'
import { buildNotificationContent } from './templates.ts'
import type { NotificationEvent } from './types.ts'

// Détecte une PII potentielle dans le contenu push : email, UUID (id user/poll dans le corps),
// ou phrasé de comptage/participation de votants. Le pollId N'apparaît QUE dans l'url/tag.
// NB : un « % » seul est légitime (il peut figurer dans le titre du vote) ; on traque le
// PHRASÉ de participation (« X membres ont voté », « participation », « a voté »). On évite
// le motif « 8/18 » brut car il entre en collision avec une date FR « 30/06/2026 » légitime.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const PARTICIPATION_RE = /\bmembres?\s+ont\s+vot|\bparticipation\b|\ba\s+voté\b|\d+\s+votants?\b/i

function expectNoPii(content: { title: string; body: string }) {
  const text = `${content.title} ${content.body}`
  expect(text).not.toMatch(EMAIL_RE)
  expect(text).not.toMatch(UUID_RE)
  expect(text).not.toMatch(PARTICIPATION_RE)
}

const POLL_ID = '11111111-2222-3333-4444-555555555555'
// Titre SANS « % » ni chiffre, pour que les assertions no-PII testent vraiment l'absence
// d'ajout par le template (un titre piégé masquerait un faux négatif).
const TITLE = 'Réallouer vers les ETF obligataires'
// Midi UTC : évite tout passage de minuit dépendant du fuseau de la machine de test.
const CLOSES_AT = '2026-06-30T12:00:00Z'

describe('buildNotificationContent', () => {
  describe('poll.opened', () => {
    const base: NotificationEvent = {
      type: 'poll.opened',
      clubId: 'club-1',
      payload: { pollId: POLL_ID, title: TITLE, closesAt: CLOSES_AT },
    }

    it('produit le copy « Nouveau vote » avec la date FR quand closesAt est fourni', () => {
      const c = buildNotificationContent(base)
      expect(c.body).toContain('Nouveau vote :')
      expect(c.body).toContain(TITLE)
      // Date FR courte (30/06/2026) présente dans la clause d'échéance.
      expect(c.body).toMatch(/répondez avant le 30\/06\/2026/)
    })

    it('omet la clause d’échéance quand closesAt est null', () => {
      const c = buildNotificationContent({ ...base, payload: { ...base.payload, closesAt: null } })
      expect(c.body).toContain('Nouveau vote :')
      expect(c.body).not.toContain('répondez avant')
      expect(c.body).not.toContain('—')
    })

    it('omet la clause d’échéance quand closesAt est absent (undefined)', () => {
      const c = buildNotificationContent({
        type: 'poll.opened',
        clubId: 'club-1',
        payload: { pollId: POLL_ID, title: TITLE },
      })
      expect(c.body).not.toContain('répondez avant')
    })

    it('pointe vers /votes/{pollId} avec un tag stable', () => {
      const c = buildNotificationContent(base)
      expect(c.url).toBe(`/votes/${POLL_ID}`)
      expect(c.tag).toBe(`poll-opened-${POLL_ID}`)
    })

    it('ne contient aucune PII (email / uuid dans le corps / participation)', () => {
      expectNoPii(buildNotificationContent(base))
    })
  })

  describe('poll.closed', () => {
    const event: NotificationEvent = {
      type: 'poll.closed',
      clubId: 'club-1',
      payload: { pollId: POLL_ID, title: TITLE, closesAt: null },
    }

    it('produit « Résultats disponibles » sans participation ni date', () => {
      const c = buildNotificationContent(event)
      expect(c.body).toContain('Résultats disponibles :')
      expect(c.body).toContain(TITLE)
      expect(c.body).not.toMatch(PARTICIPATION_RE)
      expect(c.body).not.toMatch(/avant le/)
    })

    it('pointe vers /votes/{pollId} (résultats) avec tag poll-closed', () => {
      const c = buildNotificationContent(event)
      expect(c.url).toBe(`/votes/${POLL_ID}`)
      expect(c.tag).toBe(`poll-closed-${POLL_ID}`)
    })

    it('ne contient aucune PII', () => {
      expectNoPii(buildNotificationContent(event))
    })
  })

  describe('poll.reminder', () => {
    const event: NotificationEvent = {
      type: 'poll.reminder',
      clubId: 'club-1',
      payload: { pollId: POLL_ID, title: TITLE, closesAt: CLOSES_AT },
    }

    it('produit le rappel « Il vous reste 24 h pour voter »', () => {
      const c = buildNotificationContent(event)
      expect(c.body).toContain('Il vous reste 24 h pour voter :')
      expect(c.body).toContain(TITLE)
    })

    it('pointe vers /votes/{pollId} avec tag poll-reminder', () => {
      const c = buildNotificationContent(event)
      expect(c.url).toBe(`/votes/${POLL_ID}`)
      expect(c.tag).toBe(`poll-reminder-${POLL_ID}`)
    })

    it('ne contient aucune PII', () => {
      expectNoPii(buildNotificationContent(event))
    })
  })

  describe('system.test', () => {
    const event: NotificationEvent = {
      type: 'system.test',
      clubId: 'club-1',
      payload: { title: 'Test' },
    }

    it('produit un contenu générique pointant vers /dashboard', () => {
      const c = buildNotificationContent(event)
      expect(c.title).toBe('Evolve Capital')
      expect(c.url).toBe('/dashboard')
      expect(c.tag).toBe('system-test')
    })

    it('ne contient aucune PII', () => {
      expectNoPii(buildNotificationContent(event))
    })
  })

  it('retombe sur le titre marque si le payload.title est vide', () => {
    const c = buildNotificationContent({
      type: 'poll.closed',
      clubId: 'club-1',
      payload: { pollId: POLL_ID, title: '   ', closesAt: null },
    })
    expect(c.body).toContain('Evolve Capital')
  })

  it('laisse passer un « % » légitime présent dans le titre du vote (pas une PII)', () => {
    const c = buildNotificationContent({
      type: 'poll.opened',
      clubId: 'club-1',
      payload: { pollId: POLL_ID, title: 'Réallouer 15 % du portefeuille ?', closesAt: null },
    })
    expect(c.body).toContain('15 %')
    // Le « % » du titre ne déclenche PAS le détecteur de participation.
    expect(c.body).not.toMatch(PARTICIPATION_RE)
  })
})
