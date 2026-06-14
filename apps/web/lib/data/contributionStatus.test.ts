import { describe, it, expect } from 'vitest'

import {
  deriveContributionStatus,
  joinedAtToYM,
  type MonthForStatus,
  type ContributionStatus,
} from './contributionStatus'

// Indice ordinal absolu (year*12 + month-1), même convention que la couche data.
const ym = (year: number, month: number) => year * 12 + (month - 1)
const NOW = ym(2026, 6) // juin 2026
// nowYM très bas → utilisé pour forcer des mois en « futur » dans un cas dédié.

const month = (year: number, m: number, status: MonthForStatus['status']): MonthForStatus => ({
  year,
  month: m,
  status,
})

describe('joinedAtToYM', () => {
  it('convertit une date ISO en indice ordinal (mois 0-based interne)', () => {
    expect(joinedAtToYM('2018-06-01')).toBe(ym(2018, 6))
  })
  it('null / chaîne vide / date invalide → null', () => {
    expect(joinedAtToYM(null)).toBeNull()
    expect(joinedAtToYM('')).toBeNull()
    expect(joinedAtToYM('pas-une-date')).toBeNull()
  })
})

describe('deriveContributionStatus — fallback (le statut feuille prime)', () => {
  const months = [month(2026, 4, 'late'), month(2026, 5, 'late')] // 2 arriérés évidents

  it.each(['ok', 'late', 'exempt'] as ContributionStatus[])(
    'statut feuille explicite « %s » → conservé tel quel, AUCUNE dérivation',
    (sheet) => {
      expect(deriveContributionStatus(sheet, months, null, NOW)).toBe(sheet)
    }
  )

  it('statut feuille `pending` → on dérive (ne reste pas bloqué sur pending)', () => {
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('late')
  })
})

describe('deriveContributionStatus — dérivation depuis les mois (sheet = pending)', () => {
  it('au moins un mois passé en retard → late (CAS DU BUG : 2 mois non cotisés)', () => {
    const months = [month(2026, 1, 'paid'), month(2026, 4, 'late'), month(2026, 5, 'late')]
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('late')
  })

  it('que des mois payés (aucun arriéré) → ok', () => {
    const months = [month(2026, 3, 'paid'), month(2026, 4, 'paid'), month(2026, 5, 'paid')]
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('ok')
  })

  it('arriéré ET paiements → late prime (un seul retard suffit)', () => {
    const months = [month(2026, 3, 'paid'), month(2026, 4, 'late')]
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('late')
  })

  it('aucun mois → reste pending (on n’invente pas un « à jour »)', () => {
    expect(deriveContributionStatus('pending', [], null, NOW)).toBe('pending')
  })

  it('que des mois `due` (mois courant non encore payé) → pending', () => {
    const months = [month(2026, 6, 'due')]
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('pending')
  })
})

describe('deriveContributionStatus — contexte adhésion + mois courant (cohérent avec la frise)', () => {
  it('mois `late` ANTÉRIEUR à l’adhésion → ignoré (jamais d’arriéré pré-adhésion)', () => {
    const joinedAt = ym(2026, 3) // adhésion mars 2026
    const months = [month(2026, 1, 'late'), month(2026, 2, 'late')] // avant adhésion
    expect(deriveContributionStatus('pending', months, joinedAt, NOW)).toBe('pending')
  })

  it('arriéré APRÈS l’adhésion → late ; ceux d’avant restent ignorés', () => {
    const joinedAt = ym(2026, 3)
    const months = [month(2026, 1, 'late'), month(2026, 4, 'late')]
    expect(deriveContributionStatus('pending', months, joinedAt, NOW)).toBe('late')
  })

  it('mois `late` STRICTEMENT FUTUR (année courante) → ignoré (pas encore dû)', () => {
    // nowYM = juin 2026 ; un mois d’août 2026 marqué late en DB ne doit pas compter.
    const months = [month(2026, 8, 'late')]
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('pending')
  })

  it('mois payé futur → ignoré (n’est pas un signal « à jour » du mois courant)', () => {
    const months = [month(2026, 9, 'paid')]
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('pending')
  })

  it('mois courant (== nowYM) payé → ok (limite incluse)', () => {
    const months = [month(2026, 6, 'paid')]
    expect(deriveContributionStatus('pending', months, null, NOW)).toBe('ok')
  })
})
