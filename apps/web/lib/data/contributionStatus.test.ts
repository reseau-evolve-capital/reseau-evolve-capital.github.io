import { describe, it, expect } from 'vitest'

import {
  deriveContributionStatus,
  deriveAmountDue,
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

describe('deriveAmountDue — montant dû (la donnée source prime ; sinon dérivation)', () => {
  const MIN = 100 // clubs.min_contribution par défaut

  it('sheetAmountDue > 0 → valeur source intacte (priorité à la donnée explicite)', () => {
    const months = [month(2026, 4, 'late'), month(2026, 5, 'late')] // 2 retards : ignorés ici
    expect(deriveAmountDue(250, months, null, NOW, MIN)).toBe(250)
  })

  it('sheetAmountDue > 0 → conservé même si la dérivation donnerait autre chose', () => {
    // 200,50 € fournis par la feuille : on ne recalcule pas, on garde la valeur source.
    expect(deriveAmountDue(200.5, [month(2026, 5, 'late')], null, NOW, MIN)).toBe(200.5)
  })

  it('sheetAmountDue = 0, 0 mois late → 0 (le garde-fou d’affichage prendra le relais)', () => {
    const months = [month(2026, 5, 'paid')]
    expect(deriveAmountDue(0, months, null, NOW, MIN)).toBe(0)
  })

  it('sheetAmountDue = 0, 1 mois late → 1 × minContribution', () => {
    const months = [month(2026, 5, 'late')]
    expect(deriveAmountDue(0, months, null, NOW, MIN)).toBe(100)
  })

  it('sheetAmountDue = 0, 2 mois late → 2 × minContribution', () => {
    const months = [month(2026, 4, 'late'), month(2026, 5, 'late')]
    expect(deriveAmountDue(0, months, null, NOW, MIN)).toBe(200)
  })

  it('sheetAmountDue = 0, 3 mois late → 3 × minContribution', () => {
    const months = [month(2026, 3, 'late'), month(2026, 4, 'late'), month(2026, 5, 'late')]
    expect(deriveAmountDue(0, months, null, NOW, MIN)).toBe(300)
  })

  it('mois `late` ANTÉRIEUR à l’adhésion → non compté', () => {
    const joinedAt = ym(2026, 3) // adhésion mars 2026
    const months = [month(2026, 1, 'late'), month(2026, 2, 'late'), month(2026, 4, 'late')]
    // seul avril (post-adhésion) compte → 1 × 100
    expect(deriveAmountDue(0, months, joinedAt, NOW, MIN)).toBe(100)
  })

  it('mois `late` STRICTEMENT FUTUR → non compté', () => {
    // nowYM = juin 2026 ; un retard d’août 2026 ne doit pas gonfler le montant dû.
    const months = [month(2026, 5, 'late'), month(2026, 8, 'late')]
    expect(deriveAmountDue(0, months, null, NOW, MIN)).toBe(100)
  })

  it('minContribution = 0 (indispo) → 0 même avec des mois late', () => {
    const months = [month(2026, 4, 'late'), month(2026, 5, 'late')]
    expect(deriveAmountDue(0, months, null, NOW, 0)).toBe(0)
  })

  it('sheetAmountDue négatif (donnée pourrie) → traité comme ≤ 0, on dérive', () => {
    const months = [month(2026, 5, 'late')]
    expect(deriveAmountDue(-5, months, null, NOW, MIN)).toBe(100)
  })
})
