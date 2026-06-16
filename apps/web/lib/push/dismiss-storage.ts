// Cooldown du pre-prompt Web Push (PUSH-001 ; spec §2.3) — miroir du pattern
// `lib/pwa/dismiss-storage.ts`, par-appareil (localStorage), clé `'evolve.push.v1'`.
//
// Un seul niveau de cooldown : 7 jours après « Plus tard ». Une fois abonné sur l'appareil,
// on n'a plus besoin du pre-prompt (la permission OS est persistée par le navigateur ; le
// profil reste le point de réglage). Toute lecture/écriture est gardée : si le storage
// throw (Safari privé/incognito, quota) → état vide → on n'affiche pas le pre-prompt, et
// JAMAIS d'exception côté React.

const STORAGE_KEY = 'evolve.push.v1'
const DAY = 86_400_000
/** Cooldown après un « Plus tard ». */
const DISMISS_COOLDOWN_DAYS = 7

export type PushDismissState = {
  dismissCount: number
  lastDismissedAt: string | null // ISO
  nextEligibleAt: string | null // ISO
}

function emptyState(): PushDismissState {
  return { dismissCount: 0, lastDismissedAt: null, nextEligibleAt: null }
}

/** Narrowing prudent d'un objet inconnu (storage potentiellement corrompu). */
function coerceState(raw: unknown): PushDismissState {
  if (typeof raw !== 'object' || raw === null) return emptyState()
  const r = raw as Record<string, unknown>
  const base = emptyState()
  return {
    dismissCount: typeof r.dismissCount === 'number' ? r.dismissCount : base.dismissCount,
    lastDismissedAt: typeof r.lastDismissedAt === 'string' ? r.lastDismissedAt : null,
    nextEligibleAt: typeof r.nextEligibleAt === 'string' ? r.nextEligibleAt : null,
  }
}

export type PushDismissStore = {
  read: () => PushDismissState
  recordDismiss: () => void
  /** Timestamp (ms) en deçà duquel le pre-prompt ne doit pas réapparaître. 0 si jamais refusé. */
  getCooldownUntil: () => number
}

export type CreatePushDismissStoreOptions = {
  storage: Storage
  now: () => number
}

/**
 * Crée le store de persistance des refus du pre-prompt push (injectable pour les tests).
 * Storage/horloge injectables ; toute erreur dégrade vers l'état vide sans throw.
 */
export function createPushDismissStore({
  storage,
  now,
}: CreatePushDismissStoreOptions): PushDismissStore {
  function read(): PushDismissState {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return emptyState()
      return coerceState(JSON.parse(raw))
    } catch {
      return emptyState()
    }
  }

  function write(state: PushDismissState): void {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage indispo → on ignore : l'état restera « vide » à la prochaine lecture */
    }
  }

  return {
    read,

    recordDismiss() {
      const s = read()
      const t = now()
      write({
        dismissCount: s.dismissCount + 1,
        lastDismissedAt: new Date(t).toISOString(),
        nextEligibleAt: new Date(t + DISMISS_COOLDOWN_DAYS * DAY).toISOString(),
      })
    },

    getCooldownUntil() {
      const at = read().nextEligibleAt
      if (!at) return 0
      const ms = Date.parse(at)
      return Number.isNaN(ms) ? 0 : ms
    },
  }
}

/**
 * Storage SSR-safe : `window.localStorage` côté client, sinon un no-op qui ne throw jamais.
 */
function safeBrowserStorage(): Storage {
  if (typeof window !== 'undefined') {
    try {
      const ls = window.localStorage
      if (ls) return ls
    } catch {
      /* accès localStorage bloqué (incognito strict) → no-op */
    }
  }
  const noop: Storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  }
  return noop
}

/** Singleton applicatif : utilise `window.localStorage` et `Date.now`. */
export const pushDismissStore: PushDismissStore = createPushDismissStore({
  storage: safeBrowserStorage(),
  now: () => Date.now(),
})
