// Parité des catalogues i18n — fr.json est la source de vérité des clés
// (cf. global.d.ts) ; en.json doit exposer EXACTEMENT le même arbre de clés.
// Garde-fou : une clé ajoutée d'un seul côté casse ce test (et le typage côté fr).

import { describe, expect, it } from 'vitest'

import en from '../../messages/en.json'
import fr from '../../messages/fr.json'

/** Aplati l'arbre de messages en chemins « a.b.c » (les tableaux sont des feuilles). */
function flattenKeys(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  )
}

describe('parité i18n fr/en', () => {
  it('en.json a exactement les mêmes clés que fr.json', () => {
    const frKeys = flattenKeys(fr).sort()
    const enKeys = flattenKeys(en).sort()
    const missingInEn = frKeys.filter((k) => !enKeys.includes(k))
    const extraInEn = enKeys.filter((k) => !frKeys.includes(k))
    expect(missingInEn, `clés absentes de en.json`).toEqual([])
    expect(extraInEn, `clés en trop dans en.json`).toEqual([])
  })
})
