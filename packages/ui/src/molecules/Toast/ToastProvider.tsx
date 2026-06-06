'use client'

// ToastProvider (NTF-006) — contexte + API impérative useToast() + région aria-live.
//
// Monte une pile de toasts en bas-centre (mobile) / bas-droite (desktop). Les plus récents
// s'affichent en bas. Auto-dismiss par variante (sauf error = persistant). Escape ferme
// le toast le plus récent. La région est role="region" aria-live="polite" pour les toasts
// non-error ; chaque toast error porte son propre role="alert"/aria-live="assertive".
//
// API :
//   const toast = useToast()
//   toast.success({ title, message?, action?, duration? }) → id
//   toast.error(opts)   → persistant par défaut (duration null)
//   toast.info(opts) / toast.warning(opts)
//   toast.dismiss(id)
//
// Durées par défaut (ms) — confrontées à l'export « Feedback System » :
//   success 4000 · info 5000 · warning 6000 · error null (persistant).
//
// Le provider N'EST PAS monté dans apps/web ici (phase lead). Composant + provider testés.

import * as React from 'react'

import { Toast, type ToastAction, type ToastVariant } from './Toast'

export type { ToastVariant, ToastAction } from './Toast'

/** Durées d'auto-dismiss par défaut (ms). `null` = persistant (jamais auto-fermé). */
export const DEFAULT_DURATIONS: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: null,
}

export interface ToastOptions {
  title: string
  message?: string
  action?: ToastAction
  /** Durée avant auto-dismiss (ms). `null` = persistant. Défaut = selon la variante. */
  duration?: number | null
}

interface ToastEntry extends ToastOptions {
  id: string
  variant: ToastVariant
  /** Durée résolue (ms) ; `null` = persistant. Pilote la barre de compte à rebours du Toast. */
  resolvedDuration: number | null
}

export interface ToastApi {
  success: (opts: ToastOptions) => string
  error: (opts: ToastOptions) => string
  info: (opts: ToastOptions) => string
  warning: (opts: ToastOptions) => string
  /** Ferme un toast par son id. */
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastApi | null>(null)

/** Accès impératif à l'API toast. Doit être appelé sous <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast() doit être utilisé à l’intérieur d’un <ToastProvider>.')
  }
  return ctx
}

export interface ToastProviderProps {
  children: React.ReactNode
  /** aria-label de la région de notifications. Défaut FR. */
  regionLabel?: string
}

let idCounter = 0
function nextId(): string {
  idCounter += 1
  return `toast-${idCounter}`
}

export function ToastProvider({ children, regionLabel = 'Notifications' }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([])
  // Timers indexés par id, pour pouvoir les annuler à la fermeture manuelle.
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = React.useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = React.useCallback(
    (variant: ToastVariant, opts: ToastOptions): string => {
      const id = nextId()
      const duration = opts.duration === undefined ? DEFAULT_DURATIONS[variant] : opts.duration
      setToasts((prev) => [...prev, { ...opts, id, variant, resolvedDuration: duration }])
      if (duration !== null) {
        const timer = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }
      return id
    },
    [dismiss]
  )

  // Capture du Map de timers à l'instant du démontage (évite la lecture d'une ref mutée).
  const timersRef = timers
  React.useEffect(() => {
    const map = timersRef.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [timersRef])

  // Escape ferme le toast le plus récent (dernier de la pile).
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setToasts((prev) => {
        if (prev.length === 0) return prev
        const last = prev[prev.length - 1]
        if (!last) return prev
        const timer = timers.current.get(last.id)
        if (timer) {
          clearTimeout(timer)
          timers.current.delete(last.id)
        }
        return prev.slice(0, -1)
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (opts) => push('success', opts),
      error: (opts) => push('error', opts),
      info: (opts) => push('info', opts),
      warning: (opts) => push('warning', opts),
      dismiss,
    }),
    [push, dismiss]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Région empilée : bas-centre mobile, bas-droite desktop. pointer-events-none sur le
          conteneur, réactivés sur chaque carte (cf. Toast). Les plus récents en bas. */}
      <div
        role="region"
        aria-live="polite"
        aria-label={regionLabel}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {toasts.map((t) => (
          <div key={t.id} className="w-full max-w-sm">
            <Toast
              variant={t.variant}
              title={t.title}
              durationMs={t.resolvedDuration}
              {...(t.message !== undefined ? { message: t.message } : {})}
              {...(t.action !== undefined ? { action: t.action } : {})}
              onDismiss={() => dismiss(t.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
