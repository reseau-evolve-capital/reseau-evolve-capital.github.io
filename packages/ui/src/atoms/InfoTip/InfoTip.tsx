'use client'

import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Icon } from '../Icon'
import { cn } from '../../lib/cn'

export interface InfoTipProps {
  /** Texte explicatif affiché dans la bulle (copy via props — jamais d'i18n ici). */
  content: React.ReactNode
  /** Libellé accessible du bouton « i » (ex. « Qu'est-ce que la capacité ? »). */
  'aria-label': string
  /** Côté d'ouverture préféré (Radix repositionne en cas de collision). */
  side?: 'top' | 'bottom'
  className?: string
  /**
   * `id` HTML à poser sur l'élément de contenu de la bulle.
   * Permet au déclencheur d'exposer `aria-describedby` pointant vers cet id.
   */
  contentId?: string
}

/** Délai avant fermeture au mouseleave — laisse le temps d'amener le pointeur
 *  sur la bulle (WCAG 1.4.13 : contenu au hover « hoverable »). */
const CLOSE_DELAY_MS = 120

/**
 * InfoTip — bouton icône « i » + bulle explicative (pattern « toggletip »).
 *
 * Construit sur Radix Popover (déjà utilisé par CotisationMonth) plutôt que
 * Radix Tooltip : le Tooltip ne s'ouvre PAS au tap sur mobile, or l'app est
 * utilisée en PWA tactile. Le Popover donne le tap/Enter/Espace (toggle),
 * Échap et le clic extérieur ; on ajoute par-dessus :
 *   - ouverture au survol souris (garde `pointerType === 'mouse'` — sur iOS le
 *     tap émet des événements pointer `touch`, sinon le tap ouvrirait via
 *     pointerenter puis refermerait aussitôt via le toggle du clic) ;
 *   - ouverture au focus CLAVIER (`:focus-visible` uniquement — un clic souris
 *     donne aussi le focus mais ne doit pas doubler le toggle) ;
 *   - bulle survolable (delai de fermeture + pointerenter sur le contenu).
 *
 * Cible tactile ≥ 44×44px : icône 16px, zone de hit étendue via ::after
 * (aucun décalage de layout). Styles 100 % tokens design-system.
 */
export function InfoTip({
  content,
  'aria-label': ariaLabel,
  side = 'top',
  className,
  contentId,
}: InfoTipProps) {
  const [open, setOpen] = React.useState(false)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // true quand la bulle a été ouverte PASSIVEMENT (hover / focus) : le clic qui suit
  // « épingle » au lieu de refermer — sinon hover→clic ferme aussitôt (toggle parasite).
  const openedPassively = React.useRef(false)

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])
  const scheduleClose = React.useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }, [cancelClose])
  React.useEffect(() => cancelClose, [cancelClose])

  const openPassively = React.useCallback(() => {
    setOpen((prev) => {
      if (!prev) openedPassively.current = true
      return true
    })
  }, [])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-describedby={contentId}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse') {
              cancelClose()
              openPassively()
            }
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') scheduleClose()
          }}
          onFocus={(e) => {
            // Ouverture au focus clavier uniquement (:focus-visible) — un clic souris
            // donne aussi le focus mais ne doit pas doubler l'ouverture. try/catch :
            // sélecteur non supporté partout (jsdom) — fallback no-op, Enter/Espace
            // restent disponibles pour ouvrir.
            try {
              if (e.currentTarget.matches(':focus-visible')) openPassively()
            } catch {
              /* reason: :focus-visible non supporté (jsdom) — toggle clavier suffit */
            }
          }}
          onBlur={() => setOpen(false)}
          onClick={(e) => {
            // On prend la main sur le toggle Radix (composeEventHandlers respecte
            // defaultPrevented) : tap/Enter/Espace togglent, SAUF si la bulle vient
            // d'être ouverte par hover/focus → le clic épingle (pas de flash fermé).
            e.preventDefault()
            if (open && openedPassively.current) {
              openedPassively.current = false
              return
            }
            openedPassively.current = false
            setOpen(!open)
          }}
          className={cn(
            // Zone de hit 44×44px (16px visibles + 2×14px via ::after, sans layout shift).
            "relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-text-ter outline-none after:absolute after:-inset-3.5 after:content-['']",
            'hover:text-text focus-visible:text-text focus-visible:shadow-[var(--sh-glow)]',
            'motion-safe:transition-colors motion-safe:duration-[var(--dur-fast)]',
            className
          )}
        >
          <Icon name="Info" size={16} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          id={contentId}
          side={side}
          sideOffset={6}
          collisionPadding={12}
          // Radix pose role="dialog" : nom accessible requis (axe aria-dialog-name).
          aria-label={ariaLabel}
          // Tooltip enrichi : le focus reste sur le déclencheur (pas un vrai dialogue).
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
          className="z-50 max-w-[260px] rounded-[10px] border border-border bg-card px-3 py-2 text-[13px] leading-snug text-text shadow-[var(--sh-pop)]"
        >
          {content}
          <Popover.Arrow className="fill-card" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
