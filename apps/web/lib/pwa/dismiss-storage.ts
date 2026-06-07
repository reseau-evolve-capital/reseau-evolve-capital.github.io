import type { PwaCase, PwaDismissState } from '@evolve/types'

const STORAGE_KEY = 'evolve.pwa.v1'
const DAY = 86_400_000

/** Cooldown (en jours) par nombre de dismiss : 1er → 7j, 2e → 30j. */
const COOLDOWN_DAYS: Record<number, number> = { 1: 7, 2: 30 }
/** Au 3e dismiss, on migre définitivement (plus jamais de bannière auto). */
const PERMANENT_THRESHOLD = 3
/** Refus du prompt natif Android : cooldown court. */
const ANDROID_REJECTED_DAYS = 3

/** État vide — renvoyé tant qu'aucune donnée n'est persistée ou en cas d'erreur storage. */
function emptyState(): PwaDismissState {
  return {
    pwaCase: 'unsupported',
    visitCount: 0,
    dismissCount: 0,
    lastDismissedAt: null,
    nextEligibleAt: null,
    installedAt: null,
    permanentlyMigratedAt: null,
  }
}

/** Narrowing prudent d'un objet inconnu vers `PwaDismissState` (storage peut être corrompu). */
function coerceState(raw: unknown): PwaDismissState {
  if (typeof raw !== 'object' || raw === null) return emptyState()
  const r = raw as Record<string, unknown>
  const base = emptyState()
  return {
    pwaCase: typeof r.pwaCase === 'string' ? (r.pwaCase as PwaCase) : base.pwaCase,
    visitCount: typeof r.visitCount === 'number' ? r.visitCount : base.visitCount,
    dismissCount: typeof r.dismissCount === 'number' ? r.dismissCount : base.dismissCount,
    lastDismissedAt: typeof r.lastDismissedAt === 'string' ? r.lastDismissedAt : null,
    nextEligibleAt: typeof r.nextEligibleAt === 'string' ? r.nextEligibleAt : null,
    installedAt: typeof r.installedAt === 'string' ? r.installedAt : null,
    permanentlyMigratedAt:
      typeof r.permanentlyMigratedAt === 'string' ? r.permanentlyMigratedAt : null,
  }
}

export type DismissStore = {
  read: () => PwaDismissState
  recordVisit: (pwaCase: PwaCase) => void
  recordDismiss: (pwaCase: PwaCase) => void
  recordAndroidRejected: () => void
  recordInstalled: () => void
  isPermanentlyMigrated: () => boolean
  /** Timestamp (ms) en deçà duquel la bannière ne doit pas réapparaître. 0 si jamais refusée. */
  getCooldownUntil: () => number
}

export type CreateDismissStoreOptions = {
  storage: Storage
  now: () => number
}

/**
 * Crée un store de persistance des refus PWA, par-appareil (localStorage), avec
 * horloge et storage injectables (testabilité). Toute lecture/écriture est gardée :
 * si le storage throw (Safari privé/incognito, quota), on dégrade vers l'état vide —
 * conséquence : on n'affiche jamais la bannière, et **jamais** d'exception côté React.
 */
export function createDismissStore({ storage, now }: CreateDismissStoreOptions): DismissStore {
  function read(): PwaDismissState {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return emptyState()
      return coerceState(JSON.parse(raw))
    } catch {
      return emptyState()
    }
  }

  function write(state: PwaDismissState): void {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage indispo → on ignore : l'état restera « vide » à la prochaine lecture */
    }
  }

  function update(mutate: (state: PwaDismissState) => PwaDismissState): void {
    write(mutate(read()))
  }

  return {
    read,

    recordVisit(pwaCase) {
      update((s) => ({ ...s, pwaCase, visitCount: s.visitCount + 1 }))
    },

    recordDismiss(pwaCase) {
      update((s) => {
        const dismissCount = s.dismissCount + 1
        const t = now()
        const permanent = dismissCount >= PERMANENT_THRESHOLD
        const days = COOLDOWN_DAYS[dismissCount]
        const nextEligibleAt =
          !permanent && days !== undefined ? new Date(t + days * DAY).toISOString() : null
        return {
          ...s,
          pwaCase,
          dismissCount,
          lastDismissedAt: new Date(t).toISOString(),
          nextEligibleAt,
          permanentlyMigratedAt: permanent ? new Date(t).toISOString() : s.permanentlyMigratedAt,
        }
      })
    },

    recordAndroidRejected() {
      update((s) => {
        const t = now()
        return {
          ...s,
          lastDismissedAt: new Date(t).toISOString(),
          nextEligibleAt: new Date(t + ANDROID_REJECTED_DAYS * DAY).toISOString(),
        }
      })
    },

    recordInstalled() {
      update((s) => ({ ...s, installedAt: new Date(now()).toISOString() }))
    },

    isPermanentlyMigrated() {
      return read().permanentlyMigratedAt !== null
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
 * Permet d'importer le singleton `dismissStore` depuis du code rendu côté serveur sans crash.
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
export const dismissStore: DismissStore = createDismissStore({
  storage: safeBrowserStorage(),
  now: () => Date.now(),
})
