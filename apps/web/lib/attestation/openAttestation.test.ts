import { describe, expect, it, vi } from 'vitest'

import { openAttestation } from './openAttestation'

// RT-04 — Régression du faux popup « génération échouée ».
//
// Contexte : `window.open(url, '_blank', 'noopener')` renvoie `null` MÊME EN CAS DE SUCCÈS
// (un contexte sans `opener` n'est pas retournable au code appelant). L'ancien code traitait
// ce `null` comme « popup bloquée » → faux toast d'erreur persistant rejoué à chaque clic.
//
// Le helper isole la décision « opened | blocked » de la couche présentation : on retire
// `'noopener'` pour que le handle redevienne truthy en succès, et `null` ne survienne QUE
// si l'ouverture est réellement bloquée par le navigateur.
describe('openAttestation', () => {
  const url = '/api/attestation/detention?clubId=abc'

  it('renvoie "opened" quand window.open retourne un handle truthy (succès)', () => {
    // Typé comme `Window['open']` pour préserver l'arité du tuple `mock.calls`
    // (sinon TS déduit un tuple vide sous noUncheckedIndexedAccess).
    const open = vi.fn<Window['open']>(() => ({}) as Window)

    const result = openAttestation(open, url)

    expect(result).toBe('opened')
  })

  it('renvoie "blocked" quand window.open retourne null (popup réellement bloquée)', () => {
    const open = vi.fn<Window['open']>(() => null)

    const result = openAttestation(open, url)

    expect(result).toBe('blocked')
  })

  it("ouvre la bonne URL dans un nouvel onglet SANS 'noopener'", () => {
    const open = vi.fn<Window['open']>(() => ({}) as Window)

    openAttestation(open, url)

    expect(open).toHaveBeenCalledTimes(1)
    const args = open.mock.calls[0]!
    // URL exacte + cible nouvel onglet.
    expect(args[0]).toBe(url)
    expect(args[1]).toBe('_blank')
    // Garde-fou anti-régression : aucune feature ne doit réintroduire 'noopener'
    // (cause du faux "blocked" + handle non retournable). On accepte soit 2 args,
    // soit un 3e arg qui ne contient pas 'noopener'.
    const features = args[2]
    if (features !== undefined) {
      expect(features).not.toContain('noopener')
    }
  })
})
