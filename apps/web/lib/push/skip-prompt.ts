// Drapeau one-shot (sessionStorage) pour supprimer UNE seule ouverture du pre-prompt push.
//
// Posé par le ClubSwitcher juste avant un reload technique (bascule de club) ; lu (peek, pur)
// pour initialiser l'état de PushOptInMount, puis effacé dans un effet au montage. Évite que
// le reload de bascule ne fasse réapparaître la modale d'opt-in push sur /dashboard.
// Clé en sessionStorage (par onglet, éphémère). peek/clear séparés pour rester pur en rendu
// (compatible React StrictMode : l'initialiseur d'état ne doit pas avoir d'effet de bord).

export const SKIP_PUSH_PROMPT_ONCE_KEY = 'evolve_skip_push_prompt_once'

/** Lecture PURE (sans effet) du drapeau, pour initialiser un état. Safe SSR / mode privé. */
export function peekSkipPushPromptOnce(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SKIP_PUSH_PROMPT_ONCE_KEY) === '1'
  } catch {
    return false
  }
}

/** Efface le drapeau (à appeler dans un effet). Idempotent. Safe SSR / mode privé. */
export function clearSkipPushPromptOnce(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SKIP_PUSH_PROMPT_ONCE_KEY)
  } catch {
    /* sessionStorage indispo : sans gravité (le cooldown 7j reste le garde-fou). */
  }
}
