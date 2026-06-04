// Tests NTF-004 — mapper d'attestation (PUR) + rendu PDF (renderToBuffer).
//
// Couches : (1) le mapper en pur — structure, fallback `—`, jamais de NaN/undefined ;
// (2) un rendu réel via renderToBuffer → Buffer non vide + signature PDF.
//
// Réf : NTF-004, CLAUDE.md (jamais de NaN/undefined, fallback —, formatage @evolve/utils).

import { describe, expect, it } from 'vitest'

import {
  mapAttestation,
  renderAttestationPdf,
  sumPortfolioValue,
  sumYearInvested,
  monthEffort,
  buildReference,
  DASH,
  type AttestationInput,
} from '../pdf'

const GENERATED_AT = new Date('2026-06-05T10:00:00.000Z')

/** Entrée « complète » : toutes les sources résolues. */
function completeInput(): AttestationInput {
  return {
    identity: {
      fullName: 'AFOUDAH Ruben',
      clubName: 'Les Investisseurs Audacieux',
      clubCity: 'Paris',
      joinedAt: '2018-06-01',
      brokerAccountRef: null, // pas en DB V0 → `—`
      postalAddress: null, // pas en DB V0 → `—`
      brokerName: null, // → défaut « Bourse Direct »
    },
    contribution: {
      detentionPct: 0.12345,
      totalContributed: 8000,
      netMarketValue: 12345.67,
      status: 'ok',
      amountDue: 0,
      penalties: 0,
    },
    positions: [
      { quantity: 10, marketValue: 1500, livePrice: 160 }, // live → 1600
      { quantity: 5, marketValue: 800, livePrice: null }, // snapshot → 800
    ],
    months: [
      { year: 2026, month: 1, amount: 100, status: 'paid' },
      { year: 2026, month: 2, amount: 100, status: 'paid' },
      { year: 2026, month: 6, amount: 100, status: 'due' },
      { year: 2025, month: 12, amount: 100, status: 'paid' },
    ],
    period: '2026-06',
    generatedAt: GENERATED_AT,
  }
}

describe('mapAttestation — structure et formatage', () => {
  it('résout les 4 chiffres clés et les 3 compléments', () => {
    const data = mapAttestation(completeInput())

    // 4 chiffres clés.
    expect(data.detentionPct.value).toBeCloseTo(0.12345)
    expect(data.totalContributed.value).toBe(8000)
    expect(data.quotePartValue.value).toBeCloseTo(12345.67)
    expect(data.portfolioValue.value).toBe(2400) // 1600 (live) + 800 (snapshot)

    // 3 compléments : année investie = Σ mois payés 2026 (100+100), capacité = null (pas de plafond),
    // effort du mois = montant du mois 2026-06 (100, même si « due »).
    expect(data.yearInvested.value).toBe(200)
    expect(data.yearRemainingCapacity.value).toBeNull()
    expect(data.monthClubEffort.value).toBe(100)
  })

  it('produit un n° de référence + une URL de vérification', () => {
    const data = mapAttestation(completeInput())
    expect(data.reference).toMatch(/^REC-202606-[0-9A-Z]{4}$/)
    expect(data.verificationUrl).toContain(data.reference)
    expect(data.verificationUrl).toMatch(/^https?:\/\//)
  })

  it('le n° de référence est déterministe (même seed → même réf)', () => {
    expect(buildReference('seed', '2026-06')).toBe(buildReference('seed', '2026-06'))
    expect(buildReference('a', '2026-06')).not.toBe(buildReference('b', '2026-06'))
  })

  it('retombe sur « — »/null sur TOUTE lacune, jamais NaN/undefined', () => {
    const empty: AttestationInput = {
      identity: {
        fullName: null,
        clubName: null,
        clubCity: null,
        joinedAt: null,
        brokerAccountRef: null,
        postalAddress: null,
        brokerName: null,
      },
      contribution: null,
      positions: [],
      months: [],
      period: 'invalide',
      generatedAt: GENERATED_AT,
    }
    const data = mapAttestation(empty)

    expect(data.fullName).toBe(DASH)
    expect(data.clubName).toBe(DASH)
    expect(data.clubCity).toBe(DASH)
    expect(data.brokerAccountRef).toBe(DASH)
    expect(data.postalAddress).toBe(DASH)
    expect(data.brokerName).toBe('Bourse Direct') // défaut, jamais `—`
    expect(data.joinedAtIso).toBeNull()

    // Toutes les métriques → null (rendu `—`), jamais NaN.
    for (const m of [
      data.detentionPct,
      data.totalContributed,
      data.quotePartValue,
      data.portfolioValue,
      data.yearInvested,
      data.yearRemainingCapacity,
      data.monthClubEffort,
    ]) {
      expect(m.value).toBeNull()
      expect(Number.isNaN(m.value as number)).toBe(false)
    }
  })
})

describe('agrégats purs', () => {
  it('sumPortfolioValue : live prioritaire (>0), sinon snapshot, sinon ignore', () => {
    expect(sumPortfolioValue([])).toBeNull()
    expect(sumPortfolioValue([{ quantity: 2, marketValue: 50, livePrice: 100 }])).toBe(200)
    expect(sumPortfolioValue([{ quantity: 2, marketValue: 50, livePrice: 0 }])).toBe(50) // live 0 → snapshot
    expect(sumPortfolioValue([{ quantity: null, marketValue: null, livePrice: null }])).toBeNull()
  })

  it('sumYearInvested : Σ mois payés de l’année, null si aucun', () => {
    const months = [
      { year: 2026, month: 1, amount: 100, status: 'paid' },
      { year: 2026, month: 2, amount: 50, status: 'due' }, // ignoré (pas payé)
      { year: 2025, month: 1, amount: 999, status: 'paid' }, // autre année
    ]
    expect(sumYearInvested(months, 2026)).toBe(100)
    expect(sumYearInvested(months, 2024)).toBeNull()
  })

  it('monthEffort : montant du mois ciblé, null si absent', () => {
    const months = [{ year: 2026, month: 6, amount: 120, status: 'due' }]
    expect(monthEffort(months, 2026, 6)).toBe(120)
    expect(monthEffort(months, 2026, 5)).toBeNull()
  })
})

describe('renderAttestationPdf — rendu réel', () => {
  it('produit un Buffer PDF non vide (signature %PDF)', async () => {
    const data = mapAttestation(completeInput())
    const buffer = await renderAttestationPdf(data)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(1000)
    // Tout PDF commence par la signature « %PDF- ».
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-')
  }, 30_000)

  it('rend même avec des lacunes, sans NaN/undefined dans le flux', async () => {
    const data = mapAttestation({
      ...completeInput(),
      contribution: null,
      positions: [],
      months: [],
    })
    const buffer = await renderAttestationPdf(data)
    const ascii = buffer.toString('latin1')
    expect(ascii.startsWith('%PDF-')).toBe(true)
    expect(ascii).not.toContain('NaN')
    expect(ascii).not.toContain('undefined')
  }, 30_000)
})
