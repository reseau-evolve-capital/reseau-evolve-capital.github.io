// Consentement RGPD (Consent Mode v2) — version vitrine (autonome, hors @evolve/ui).
// Même logique que apps/web/lib/consent (localStorage + useSyncExternalStore), dupliquée ici
// car la vitrine est une stack séparée (Tailwind v3, pas de design-system). Light-only.

const KEY = 'evolve.consent.v1'
const MAX_AGE_MS = 182 * 86_400_000 // ~6 mois (re-demande CNIL)

export interface ConsentState {
  analytics: boolean
  decidedAt: string
}

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
  const t = Date.parse(r.decidedAt)
  if (!Number.isNaN(t) && Date.now() - t > MAX_AGE_MS) return null
  return { analytics: r.analytics, decidedAt: r.decidedAt }
}

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
  cachedRaw = null
  listeners.forEach((l) => l())
}

export function setConsent(analytics: boolean): void {
  try {
    safeStorage()?.setItem(KEY, JSON.stringify({ analytics, decidedAt: new Date().toISOString() }))
  } catch {
    /* noop */
  }
  emit()
}

type GtagFn = (...args: unknown[]) => void
export function applyAnalyticsConsent(granted: boolean): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: GtagFn }
  if (typeof w.gtag === 'function') {
    w.gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' })
  }
}
