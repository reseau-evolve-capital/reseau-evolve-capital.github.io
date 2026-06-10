// Persistance du choix de consentement (RGPD / Consent Mode v2), par-appareil.
//
// Même philosophie que dismiss-storage (PWA-001) : localStorage SSR-safe, jamais de throw.
// Différence clé : le consentement CHANGE en cours de session (clic utilisateur) → on notifie
// les abonnés (useSyncExternalStore) via un set de listeners + l'event 'storage' (cross-onglet).
//
// On stocke un choix explicite : `analytics` (true = Mesure d'audience acceptée). L'absence de
// valeur = consentement NON résolu → on affiche la bannière. user_id / cookies GA ne sont
// jamais activés sans `analytics: true` (cf. consent-mode.ts).

const KEY = 'evolve.consent.v1'

export interface ConsentState {
  /** Mesure d'audience (Google Analytics) acceptée ? */
  analytics: boolean
  /** Horodatage ISO de la décision (pour ré-expiration ≤ 6 mois côté lecture). */
  decidedAt: string
}

/** Durée de validité du consentement (CNIL : re-demande ≤ 6 mois). */
const MAX_AGE_MS = 182 * 86_400_000

type Listener = () => void
const listeners = new Set<Listener>()

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

function coerce(raw: unknown): ConsentState | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.analytics !== 'boolean' || typeof r.decidedAt !== 'string') return null
  // Expiration : un choix trop ancien est considéré non résolu (re-demande).
  const t = Date.parse(r.decidedAt)
  if (!Number.isNaN(t) && Date.now() - t > MAX_AGE_MS) return null
  return { analytics: r.analytics, decidedAt: r.decidedAt }
}

// Cache de snapshot : useSyncExternalStore exige une référence stable tant que rien ne change.
let cachedRaw: string | null = null
let cachedValue: ConsentState | null = null

function readRaw(): string | null {
  try {
    return safeStorage()?.getItem(KEY) ?? null
  } catch {
    return null
  }
}

export function getSnapshot(): ConsentState | null {
  const raw = readRaw()
  if (raw === cachedRaw) return cachedValue
  cachedRaw = raw
  try {
    cachedValue = raw ? coerce(JSON.parse(raw)) : null
  } catch {
    cachedValue = null
  }
  return cachedValue
}

/** SSR : toujours non résolu (référence stable) → bannière rendue côté client après hydratation. */
export function getServerSnapshot(): ConsentState | null {
  return null
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

function emit(): void {
  // Invalide le cache pour que le prochain getSnapshot relise, puis notifie.
  cachedRaw = null
  listeners.forEach((l) => l())
}

export function setConsent(analytics: boolean): void {
  const state: ConsentState = { analytics, decidedAt: new Date().toISOString() }
  try {
    safeStorage()?.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage indispo → on ignore ; le consentement restera « non résolu » */
  }
  emit()
}

/** Réouverture « Gérer mes cookies » : efface le choix → la bannière réapparaît. */
export function clearConsent(): void {
  try {
    safeStorage()?.removeItem(KEY)
  } catch {
    /* noop */
  }
  emit()
}

export function isResolved(): boolean {
  return getSnapshot() !== null
}
