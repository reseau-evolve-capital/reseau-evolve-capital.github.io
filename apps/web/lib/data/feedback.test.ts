import { describe, it, expect } from 'vitest'
import type { Database } from '@evolve/data'
import {
  deriveAuthorName,
  mapFeedbackRow,
  deriveFeedbackKpis,
  deriveByCategory,
  deriveByClub,
  deriveByWeek,
  isoWeek,
  filterFeedback,
  OTHER_CATEGORY_KEY,
  NO_CLUB_KEY,
  type FeedbackItem,
  type FeedbackFilters,
} from './feedback'

type FeedbackRow = Database['public']['Tables']['feedback']['Row']

function row(over: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: 'f1',
    created_at: '2026-06-01T10:00:00Z',
    user_id: 'u1',
    user_email: 'lea.martin@club.fr',
    club_id: 'club-a',
    type: 'bug',
    message: 'Ça plante',
    screenshot_urls: null,
    page_url: 'http://x/dashboard',
    page_route: '/dashboard',
    user_agent: 'jsdom',
    ai_title: 'Crash au login',
    ai_severity: 'blocking',
    ai_summary: 'Le login échoue',
    ai_category: 'UX',
    github_issue_url: null,
    notion_page_id: null,
    discord_notified: false,
    email_sent: false,
    status: 'received',
    ...over,
  }
}

function item(over: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    id: 'f',
    createdAt: '2026-06-01T10:00:00Z',
    type: 'bug',
    severity: null,
    status: 'received',
    aiTitle: null,
    aiSummary: null,
    aiCategory: null,
    message: 'm',
    screenshotUrls: [],
    pageRoute: '/x',
    userAgent: null,
    authorName: 'Lea',
    clubId: 'club-a',
    clubName: 'Club A',
    githubIssueUrl: null,
    notionPageId: null,
    ...over,
  }
}

describe('deriveAuthorName — RGPD (prénom dérivé de l’email)', () => {
  it('extrait et capitalise le prénom', () => {
    expect(deriveAuthorName('lea.martin@club.fr')).toBe('Lea')
    expect(deriveAuthorName('BOB@x.com')).toBe('Bob')
    expect(deriveAuthorName('marie-claire@x.com')).toBe('Marie')
  })
  it('fallback « Membre » si email vide/illisible', () => {
    expect(deriveAuthorName(null)).toBe('Membre')
    expect(deriveAuthorName('')).toBe('Membre')
    expect(deriveAuthorName('@x.com')).toBe('Membre')
  })
})

describe('mapFeedbackRow', () => {
  const clubNames = new Map([['club-a', 'Club Alpha']])

  it('mappe une ligne complète + résout le nom du club', () => {
    const m = mapFeedbackRow(row(), clubNames)
    expect(m.id).toBe('f1')
    expect(m.type).toBe('bug')
    expect(m.severity).toBe('blocking')
    expect(m.aiTitle).toBe('Crash au login')
    expect(m.clubId).toBe('club-a')
    expect(m.clubName).toBe('Club Alpha')
    expect(m.authorName).toBe('Lea')
    expect(m.screenshotUrls).toEqual([])
  })

  it('club_id null → clubName null (feedback antérieur)', () => {
    const m = mapFeedbackRow(row({ club_id: null }), clubNames)
    expect(m.clubId).toBeNull()
    expect(m.clubName).toBeNull()
  })

  it('valeurs hors-enum → fallback sûrs (type→question, severity→null, status→received)', () => {
    const m = mapFeedbackRow(
      row({ type: 'weird', ai_severity: 'nope', status: 'bogus' }),
      clubNames
    )
    expect(m.type).toBe('question')
    expect(m.severity).toBeNull()
    expect(m.status).toBe('received')
  })

  it('aiTitle/aiSummary/aiCategory vides → null (jamais chaîne vide)', () => {
    const m = mapFeedbackRow(row({ ai_title: '  ', ai_summary: '', ai_category: null }), clubNames)
    expect(m.aiTitle).toBeNull()
    expect(m.aiSummary).toBeNull()
    expect(m.aiCategory).toBeNull()
  })
})

describe('deriveFeedbackKpis', () => {
  it('compte total, bugs, bloquants, idées et taux de traitement', () => {
    const items = [
      item({ type: 'bug', severity: 'blocking', status: 'done' }),
      item({ type: 'bug', severity: 'minor', status: 'received' }),
      item({ type: 'feature', status: 'closed' }),
      item({ type: 'question', status: 'in_progress' }),
    ]
    const k = deriveFeedbackKpis(items)
    expect(k.total).toBe(4)
    expect(k.bugs).toBe(2)
    expect(k.blockingBugs).toBe(1)
    expect(k.ideas).toBe(1)
    // done + closed = 2 / 4
    expect(k.treatmentRate).toBeCloseTo(0.5, 5)
  })

  it('taux null sur liste vide (jamais NaN)', () => {
    expect(deriveFeedbackKpis([]).treatmentRate).toBeNull()
  })
})

describe('deriveByCategory', () => {
  it('agrège par catégorie, bucket « autre » pour les absentes, tri décroissant', () => {
    const slices = deriveByCategory([
      item({ aiCategory: 'UX' }),
      item({ aiCategory: 'UX' }),
      item({ aiCategory: 'Perf' }),
      item({ aiCategory: null }),
    ])
    expect(slices[0]).toEqual({ category: 'UX', count: 2 })
    expect(slices.find((s) => s.category === OTHER_CATEGORY_KEY)?.count).toBe(1)
  })
})

describe('deriveByClub', () => {
  it('agrège par club, top N, bucket « sans club » relégué en dernier', () => {
    const bars = deriveByClub(
      [
        item({ clubId: 'a', clubName: 'A' }),
        item({ clubId: 'a', clubName: 'A' }),
        item({ clubId: 'b', clubName: 'B' }),
        item({ clubId: null, clubName: null }),
      ],
      5
    )
    expect(bars[0]).toMatchObject({ clubId: 'a', clubName: 'A', count: 2 })
    // Le bucket « sans club » est en dernier.
    expect(bars[bars.length - 1]).toMatchObject({ clubId: null, clubName: NO_CLUB_KEY, count: 1 })
  })

  it('respecte topN', () => {
    const bars = deriveByClub(
      [
        item({ clubId: 'a', clubName: 'A' }),
        item({ clubId: 'b', clubName: 'B' }),
        item({ clubId: 'c', clubName: 'C' }),
      ],
      2
    )
    expect(bars).toHaveLength(2)
  })
})

describe('isoWeek — numéro de semaine ISO-8601', () => {
  it('calcule la semaine ISO (lundi premier jour, jeudi détermine l’année)', () => {
    // 2026-06-15 (lundi) = semaine ISO 25 de 2026.
    expect(isoWeek(new Date('2026-06-15T00:00:00Z'))).toEqual({ isoYear: 2026, isoWeek: 25 })
    // 2026-06-21 (dimanche) reste dans la semaine 25.
    expect(isoWeek(new Date('2026-06-21T23:59:00Z'))).toEqual({ isoYear: 2026, isoWeek: 25 })
    // 2026-06-22 (lundi) bascule en semaine 26.
    expect(isoWeek(new Date('2026-06-22T00:00:00Z'))).toEqual({ isoYear: 2026, isoWeek: 26 })
  })

  it('gère le bord d’année (1ᵉʳ janvier appartient parfois à la dernière semaine de l’an passé)', () => {
    // 2021-01-01 (vendredi) = semaine ISO 53 de 2020 (le jeudi de cette semaine est en 2020).
    expect(isoWeek(new Date('2021-01-01T00:00:00Z'))).toEqual({ isoYear: 2020, isoWeek: 53 })
  })
})

describe('deriveByWeek — volume par semaine (console club ADM-009)', () => {
  it('agrège par semaine ISO, libellé « Sxx », tri chronologique', () => {
    const weeks = deriveByWeek([
      item({ createdAt: '2026-06-15T10:00:00Z' }), // S25
      item({ createdAt: '2026-06-16T10:00:00Z' }), // S25
      item({ createdAt: '2026-06-22T10:00:00Z' }), // S26
    ])
    expect(weeks).toEqual([
      { weekKey: '2026-W25', label: 'S25', count: 2 },
      { weekKey: '2026-W26', label: 'S26', count: 1 },
    ])
  })

  it('ne retient que les `lastN` dernières semaines (ordre chronologique)', () => {
    const weeks = deriveByWeek(
      [
        item({ createdAt: '2026-06-01T10:00:00Z' }), // S23
        item({ createdAt: '2026-06-08T10:00:00Z' }), // S24
        item({ createdAt: '2026-06-15T10:00:00Z' }), // S25
      ],
      2
    )
    expect(weeks.map((w) => w.label)).toEqual(['S24', 'S25'])
  })

  it('ignore les dates invalides (jamais NaN), liste vide → []', () => {
    expect(deriveByWeek([])).toEqual([])
    expect(deriveByWeek([item({ createdAt: 'not-a-date' })])).toEqual([])
  })
})

describe('filterFeedback', () => {
  const noFilter: FeedbackFilters = {
    type: 'all',
    severity: 'all',
    status: 'all',
    club: 'all',
    search: '',
  }
  const items = [
    item({
      id: '1',
      type: 'bug',
      severity: 'blocking',
      status: 'received',
      clubId: 'a',
      aiTitle: 'Crash login',
    }),
    item({
      id: '2',
      type: 'feature',
      status: 'done',
      clubId: 'b',
      aiTitle: 'Export CSV',
      authorName: 'Bob',
    }),
    item({
      id: '3',
      type: 'question',
      status: 'received',
      clubId: null,
      message: 'Comment voter ?',
    }),
  ]

  it('sans filtre → tout', () => {
    expect(filterFeedback(items, noFilter)).toHaveLength(3)
  })
  it('filtre par type', () => {
    expect(filterFeedback(items, { ...noFilter, type: 'bug' }).map((i) => i.id)).toEqual(['1'])
  })
  it('filtre par sévérité', () => {
    expect(filterFeedback(items, { ...noFilter, severity: 'blocking' }).map((i) => i.id)).toEqual([
      '1',
    ])
  })
  it('filtre par statut', () => {
    expect(filterFeedback(items, { ...noFilter, status: 'done' }).map((i) => i.id)).toEqual(['2'])
  })
  it('filtre par club (id)', () => {
    expect(filterFeedback(items, { ...noFilter, club: 'a' }).map((i) => i.id)).toEqual(['1'])
  })
  it('recherche insensible à la casse (titre, message, auteur)', () => {
    expect(filterFeedback(items, { ...noFilter, search: 'CRASH' }).map((i) => i.id)).toEqual(['1'])
    expect(filterFeedback(items, { ...noFilter, search: 'voter' }).map((i) => i.id)).toEqual(['3'])
    expect(filterFeedback(items, { ...noFilter, search: 'bob' }).map((i) => i.id)).toEqual(['2'])
  })
  it('combine plusieurs critères', () => {
    expect(
      filterFeedback(items, { ...noFilter, type: 'bug', club: 'a', search: 'login' }).map(
        (i) => i.id
      )
    ).toEqual(['1'])
    expect(filterFeedback(items, { ...noFilter, type: 'bug', club: 'b' })).toHaveLength(0)
  })
})
