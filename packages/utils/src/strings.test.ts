import { describe, it, expect } from 'vitest'
import { stripAccents } from './strings'

describe('stripAccents', () => {
  it('retire les accents', () => {
    expect(stripAccents('Évolvé àâ')).toBe('Evolve aa')
  })
})
