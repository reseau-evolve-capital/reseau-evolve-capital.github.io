import { describe, it, expect } from 'vitest'

import { shouldShowPushPrePrompt } from './use-push-opt-in'

// Décision PURE d'affichage du pre-prompt Web Push (PUSH-001 ; spec §6.3/§6.4).
// Règle clé corrigée : on ne re-prompte JAMAIS une fois la permission décidée
// (accordée OU refusée). Seul `permission === 'default'` autorise l'affichage.

describe('shouldShowPushPrePrompt', () => {
  const base = {
    capability: 'ready' as const,
    permission: 'default' as NotificationPermission,
    eligibleByCooldown: true,
    hidden: false,
  }

  it('affiche le pre-prompt quand ready + permission default + cooldown ok + non masqué', () => {
    expect(shouldShowPushPrePrompt(base)).toBe(true)
  })

  it('ne re-prompte JAMAIS quand la permission est déjà accordée (bug corrigé)', () => {
    // Régression : auparavant capability='ready' suffisait, donc le pre-prompt
    // se ré-affichait à chaque reload après acceptation (aucun cooldown posé).
    expect(shouldShowPushPrePrompt({ ...base, permission: 'granted' })).toBe(false)
  })

  it('ne re-prompte pas quand la permission est refusée', () => {
    expect(shouldShowPushPrePrompt({ ...base, permission: 'denied' })).toBe(false)
  })

  it('masqué si capability ≠ ready', () => {
    expect(shouldShowPushPrePrompt({ ...base, capability: 'blocked' })).toBe(false)
    expect(shouldShowPushPrePrompt({ ...base, capability: 'unsupported' })).toBe(false)
  })

  it('masqué si cooldown non expiré', () => {
    expect(shouldShowPushPrePrompt({ ...base, eligibleByCooldown: false })).toBe(false)
  })

  it('masqué si déjà masqué localement (action terminée dans la session)', () => {
    expect(shouldShowPushPrePrompt({ ...base, hidden: true })).toBe(false)
  })
})
