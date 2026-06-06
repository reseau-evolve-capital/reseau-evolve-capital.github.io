import { describe, it, expect } from 'vitest'
import { stripAccents, slugify } from './strings'

describe('stripAccents', () => {
  it('retire les accents', () => {
    expect(stripAccents('Évolvé àâ')).toBe('Evolve aa')
  })
})

describe('slugify', () => {
  it('met en minuscule, sans accent, espaces → tiret', () => {
    expect(slugify('OURO SAMA Jalil')).toBe('ouro-sama-jalil')
    expect(slugify('NGORAN Stéphane')).toBe('ngoran-stephane')
  })
  it('borde et compacte les séparateurs', () => {
    expect(slugify('  Al  Hassan, SANOGO!! ')).toBe('al-hassan-sanogo')
  })
  it('entrée vide → ""', () => {
    expect(slugify('')).toBe('')
    expect(slugify('   ')).toBe('')
    expect(slugify('!!!')).toBe('')
  })
  it('idempotent (slugify(slugify(x)) === slugify(x))', () => {
    const x = 'ROSSI Greg'
    expect(slugify(slugify(x))).toBe(slugify(x))
  })
  it('déterministe (2 appels = même sortie)', () => {
    expect(slugify('TCHOUTA David')).toBe(slugify('TCHOUTA David'))
  })
})
