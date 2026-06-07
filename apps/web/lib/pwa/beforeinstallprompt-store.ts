import { dismissStore } from './dismiss-storage'

/**
 * Event `beforeinstallprompt` (Chromium) — non typé dans la lib DOM standard.
 * On modélise le strict nécessaire pour `prompt()` + `userChoice`.
 */
export type BeforeInstallPromptEvent = Event & {
  readonly platforms?: string[]
  prompt: () => Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/**
 * Singleton module-level : capture tôt l'event `beforeinstallprompt` (Chromium le tire
 * une seule fois, très tôt, et il faut `preventDefault()` immédiatement pour pouvoir le
 * rejouer plus tard via `prompt()`). Stocke aussi le flag `appinstalled`.
 *
 * Tout est gardé SSR + try/catch : importer ce module côté serveur ne touche jamais `window`.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false

/**
 * Branche les écouteurs `beforeinstallprompt` + `appinstalled` sur `window`.
 * À appeler une fois, tôt, au mount d'un composant client racine.
 * Renvoie une fonction de cleanup (no-op côté serveur).
 */
export function captureBeforeInstallPrompt(): () => void {
  if (typeof window === 'undefined') return () => {}

  const onBeforeInstallPrompt = (event: Event) => {
    // Empêche le mini-infobar Chrome ; on rejouera le prompt nous-mêmes.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
  }

  const onAppInstalled = () => {
    installed = true
    deferredPrompt = null
    try {
      dismissStore.recordInstalled()
    } catch {
      /* never throw to the app */
    }
  }

  try {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
  } catch {
    return () => {}
  }

  return () => {
    try {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    } catch {
      /* noop */
    }
  }
}

/** Renvoie l'event différé sans le consommer (ex. pour savoir si l'install native est dispo). */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

/**
 * Renvoie l'event différé et le retire du store (un `beforeinstallprompt` n'est jouable
 * qu'une fois). À appeler juste avant `prompt()`.
 */
export function consumeDeferredPrompt(): BeforeInstallPromptEvent | null {
  const prompt = deferredPrompt
  deferredPrompt = null
  return prompt
}

/** `true` si l'app a reçu l'event `appinstalled` durant cette session. */
export function wasInstalled(): boolean {
  return installed
}
