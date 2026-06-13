import { describe, expect, it } from 'vitest'
import { mapPollResults } from './pollResults.mapper.ts'
import type { PollResultsDTO } from '../types.ts'

describe('mapPollResults', () => {
  it('mappe les agrégats single_choice et conserve l’ordre', () => {
    const dto: PollResultsDTO = {
      poll_id: 'p1',
      question_type: 'single_choice',
      total_responses: 3,
      eligible_members: 4,
      options: [
        { option: 'oui', count: 2, pct: 66.67 },
        { option: 'non', count: 1, pct: 33.33 },
      ],
      text_responses: [],
    }
    const r = mapPollResults(dto)
    expect(r.pollId).toBe('p1')
    expect(r.questionType).toBe('single_choice')
    expect(r.totalResponses).toBe(3)
    expect(r.eligibleMembers).toBe(4)
    expect(r.options).toEqual([
      { option: 'oui', count: 2, pct: 66.67 },
      { option: 'non', count: 1, pct: 33.33 },
    ])
    expect(r.textResponses).toEqual([])
  })

  it('garantit l’anonymat : aucun user_id ne transite (le DTO n’en a pas)', () => {
    const dto: PollResultsDTO = {
      poll_id: 'p2',
      question_type: 'short_text',
      total_responses: 1,
      eligible_members: 5,
      options: [],
      text_responses: ['Plus de visios svp'],
    }
    const r = mapPollResults(dto)
    expect(JSON.stringify(r)).not.toContain('user')
    expect(r.textResponses).toEqual(['Plus de visios svp'])
  })

  it('est défensif sur les valeurs sales (null → vide / 0)', () => {
    const dto = {
      poll_id: null,
      question_type: 'inconnu',
      total_responses: null,
      options: [
        { option: null, count: null, pct: null },
        { option: 'a', count: null, pct: null },
      ],
      text_responses: [null, 'ok'],
    } as unknown as PollResultsDTO
    const r = mapPollResults(dto)
    expect(r.pollId).toBe('')
    expect(r.totalResponses).toBe(0)
    // l’option sans label est ignorée ; count/pct null → 0
    expect(r.options).toEqual([{ option: 'a', count: 0, pct: 0 }])
    // les textes null sont filtrés
    expect(r.textResponses).toEqual(['ok'])
    // question_type inconnu → fallback sûr
    expect(['yes_no', 'single_choice', 'multiple_choice', 'short_text']).toContain(r.questionType)
  })
})
