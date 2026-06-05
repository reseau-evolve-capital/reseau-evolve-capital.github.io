// A9 — Dataviz de marque abstraite (panneau gauche login + onboarding).
// « Évoque le portefeuille SANS données réelles » : courbe stylisée qui se
// dessine, sparkline qui monte, mini-donut qui se remplit, sur une grille fine.
// Contraintes :
//   - panneau marque TOUJOURS sombre → tokens NEUTRES (`--color-neutral-*`),
//     jamais les tokens sémantiques (`--text`, `--card`…) qui sont thémés ;
//   - accent jaune/orange brand uniquement ;
//   - ZÉRO hex en dur (toutes les couleurs via var(--color-*)) ;
//   - micro-animations subtiles, désactivées sous prefers-reduced-motion
//     (les classes `.auth-anim-*` ne jouent que `@media no-preference`).
'use client'

// Hauteurs des barres de sparkline (ratio 0→1, valeurs purement décoratives).
const SPARK_BARS = [0.42, 0.58, 0.5, 0.72, 0.64, 0.88, 0.78, 1] as const

export function BrandDataviz({ ariaLabel }: { ariaLabel: string }) {
  return (
    <svg
      viewBox="0 0 360 200"
      className="mt-2 w-full max-w-[380px] rounded-[16px] border border-neutral-800 bg-neutral-900 p-1"
      role="img"
      aria-label={ariaLabel}
    >
      {/* Grille fine décorative */}
      <g stroke="var(--color-neutral-800)" strokeWidth="1">
        {[40, 80, 120, 160].map((y) => (
          <line key={`h-${y}`} x1="16" y1={y} x2="344" y2={y} />
        ))}
        {[80, 160, 240, 320].map((x) => (
          <line key={`v-${x}`} x1={x} y1="20" x2={x} y2="184" />
        ))}
      </g>

      {/* Aire sous la courbe (dégradé brand → transparent) */}
      <defs>
        <linearGradient id="brand-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-yellow)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-brand-yellow)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M16,150 C70,130 100,90 150,96 S240,60 300,44 L344,38 L344,184 L16,184 Z"
        fill="url(#brand-area)"
        opacity="0.9"
      />

      {/* Courbe principale qui se dessine */}
      <path
        d="M16,150 C70,130 100,90 150,96 S240,60 300,44 L344,38"
        fill="none"
        stroke="var(--color-brand-yellow)"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="auth-anim-draw"
        style={{ ['--auth-dash' as string]: '520' }}
      />

      {/* Point lumineux pulsant à la pointe de la courbe */}
      <circle
        cx="344"
        cy="38"
        r="4.5"
        fill="var(--color-brand-yellow)"
        className="auth-anim-pulse"
      />
      <circle cx="344" cy="38" r="9" fill="var(--color-brand-yellow)" opacity="0.18" />

      {/* Sparkline (barres qui montent une à une) */}
      <g>
        {SPARK_BARS.map((ratio, i) => {
          const x = 30 + i * 18
          const h = 8 + ratio * 30
          const top = 176 - h
          // Les 2 dernières barres en orange pour rythmer la lecture.
          const fill =
            i >= SPARK_BARS.length - 2 ? 'var(--color-brand-orange)' : 'var(--color-neutral-600)'
          return (
            <rect
              key={`bar-${i}`}
              x={x}
              y={top}
              width="9"
              height={h}
              rx="2"
              fill={fill}
              className="auth-anim-rise"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          )
        })}
      </g>

      {/* Mini-donut abstrait (arc brand qui se remplit) */}
      <g transform="translate(290, 150)">
        <circle r="26" fill="none" stroke="var(--color-neutral-700)" strokeWidth="9" />
        <circle
          r="26"
          fill="none"
          stroke="var(--color-brand-yellow)"
          strokeWidth="9"
          strokeLinecap="round"
          transform="rotate(-90)"
          className="auth-anim-arc"
          // Périmètre ≈ 2·π·26 ≈ 163 ; on remplit ~64% (offset ≈ 59).
          style={{
            ['--auth-arc-len' as string]: '163',
            ['--auth-arc-to' as string]: '59',
            strokeDashoffset: 59,
          }}
        />
        <circle
          r="26"
          fill="none"
          stroke="var(--color-brand-orange)"
          strokeWidth="9"
          strokeLinecap="round"
          transform="rotate(140)"
          strokeDasharray="30 133"
          opacity="0.9"
        />
      </g>
    </svg>
  )
}
