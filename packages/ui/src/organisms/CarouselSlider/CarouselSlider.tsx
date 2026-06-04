'use client'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { CarouselDots } from '../../molecules/CarouselDots'
import { cn } from '../../lib/cn'

export interface CarouselSliderProps {
  /** Tableau de slides à afficher */
  slides: ReactNode[]
  /** Index de la slide active (0-indexé) */
  active: number
  /** Appelé quand l'index actif change */
  onActiveChange: (index: number) => void
  /** aria-label de la région carrousel — défaut "Présentation" */
  regionAriaLabel?: string
  /**
   * Gabarit de l'aria-label de chaque slide — défaut `(index, count) => `Slide ${index} sur ${count}``.
   * `index` est 1-indexé, `count` est le nombre total de slides.
   */
  slideAriaLabel?: (index: number, count: number) => string
  className?: string
}

/**
 * Carrousel interactif présentationnel.
 * Naviguable au clavier (←/→) et via CarouselDots.
 * L'état `active` est entièrement contrôlé depuis le parent.
 */
export function CarouselSlider({
  slides,
  active,
  onActiveChange,
  regionAriaLabel = 'Présentation',
  slideAriaLabel = (index, count) => `Slide ${index} sur ${count}`,
  className,
}: CarouselSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  function go(i: number) {
    const next = Math.min(slides.length - 1, Math.max(0, i))
    onActiveChange(next)
    const child = trackRef.current?.children[next]
    if (child instanceof HTMLElement) {
      child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(active + 1)
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(active - 1)
    }
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={regionAriaLabel}
      className={cn('flex w-full min-w-0 flex-col gap-4', className)}
      onKeyDown={onKey}
      tabIndex={0}
    >
      <div
        ref={trackRef}
        className="flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto motion-reduce:scroll-auto"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={slideAriaLabel(i + 1, slides.length)}
            className="w-full shrink-0 snap-center"
          >
            {slide}
          </div>
        ))}
      </div>

      <CarouselDots count={slides.length} active={active} onSelect={go} />
    </div>
  )
}
