// A5 — Animation « fun » de l'écran check-email.
// Vibe inspirée de la 404 vitrine (dataviz brand vivante) mais redessinée aux
// tokens de l'app membre : une enveloppe qui « part », un halo qui respire et
// des particules brand qui s'élèvent — sobre, jamais clignotant.
// Contraintes :
//   - écran thémé (clair/sombre) → tokens sémantiques + brand, ZÉRO hex ;
//   - prefers-reduced-motion : les classes `.auth-anim-*` ne jouent que
//     `@media (prefers-reduced-motion: no-preference)` → ici, fallback STATIQUE
//     (enveloppe figée, halo figé, particules invisibles) ;
//   - décoratif : `aria-hidden` (le titre + le texte portent le sens).
'use client'

export function CheckEmailAnimation() {
  return (
    <div aria-hidden="true" className="mx-auto mb-6 flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
        {/* Halo qui respire (sous l'enveloppe) */}
        <circle
          cx="60"
          cy="62"
          r="40"
          fill="var(--color-brand-yellow)"
          opacity="0.14"
          className="auth-anim-halo"
        />
        <circle cx="60" cy="62" r="40" fill="var(--color-brand-yellow)" opacity="0.06" />

        {/* Particules « envoi » qui s'élèvent (visibles uniquement en anim) */}
        <g className="auth-anim-spark" style={{ animationDelay: '0ms' }}>
          <circle cx="40" cy="40" r="2.5" fill="var(--color-brand-yellow)" />
        </g>
        <g className="auth-anim-spark" style={{ animationDelay: '700ms' }}>
          <circle cx="80" cy="36" r="2" fill="var(--color-brand-orange)" />
        </g>
        <g className="auth-anim-spark" style={{ animationDelay: '1300ms' }}>
          <circle cx="60" cy="30" r="2.5" fill="var(--color-brand-yellow)" />
        </g>

        {/* Enveloppe (décolle puis se stabilise) */}
        <g className="auth-anim-send" style={{ transformOrigin: '60px 62px' }}>
          <rect
            x="30"
            y="48"
            width="60"
            height="42"
            rx="6"
            fill="var(--color-card)"
            stroke="var(--color-border-strong)"
            strokeWidth="2"
          />
          {/* Rabat de l'enveloppe */}
          <path
            d="M32 52 L60 72 L88 52"
            fill="none"
            stroke="var(--color-brand-yellow)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  )
}
