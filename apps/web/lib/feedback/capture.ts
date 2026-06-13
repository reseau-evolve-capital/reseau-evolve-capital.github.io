// Capture d'écran client-only pour le Feedback Widget (LOT D).
//
// html2canvas est importé DYNAMIQUEMENT (import() dans la fonction) → jamais évalué côté
// SSR. La capture rendrait la modale par-dessus la page : on masque donc la pile Radix du
// dialog (Overlay + Content, repérés par `role="dialog"`) le temps du rendu, on attend un
// repaint (rAF + court délai), on capture document.body, puis on restaure. Toute erreur →
// undefined (le FeedbackSheet reste alors en idle, sans capture jointe).

/** Masque la pile Radix du dialog (overlay + content) le temps d'un appel `fn`, puis restaure. */
async function withDialogHidden<T>(fn: () => Promise<T>): Promise<T> {
  // role="dialog" = le Content ; on masque aussi ses frères dans le portail (l'overlay).
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
  const restore: { el: HTMLElement; prev: string }[] = []
  const hide = (el: HTMLElement) => {
    restore.push({ el, prev: el.style.visibility })
    el.style.visibility = 'hidden'
  }
  for (const content of dialogs) {
    hide(content)
    const parent = content.parentElement
    if (parent) {
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== content && sibling instanceof HTMLElement) hide(sibling)
      }
    }
  }
  // Laisse le navigateur repeindre l'écran SANS la modale avant de capturer.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => setTimeout(resolve, 60))
  try {
    return await fn()
  } finally {
    for (const { el, prev } of restore) el.style.visibility = prev
  }
}

/**
 * Capture la page courante (hors modale feedback) en PNG dataURL. Renvoie `undefined` en cas
 * d'échec — branché sur `FeedbackSheet.onCaptureScreenshot`.
 */
export async function captureScreenshot(): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined
  try {
    return await withDialogHidden(async () => {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(document.body, { useCORS: true, logging: false })
      return canvas.toDataURL('image/png')
    })
  } catch {
    return undefined
  }
}
