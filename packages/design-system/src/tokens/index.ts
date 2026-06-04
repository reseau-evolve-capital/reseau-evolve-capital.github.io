/** Tokens design Evolve Capital — miroir TypeScript de tokens.css
 *  Source de vérité = styles/tokens.css (CSS vars)
 *  Ce fichier est un miroir typé pour usage runtime (Storybook, calculs JS).
 *  ⚠️  Modifier tokens.css en priorité, puis répercuter ici. */

export const brand = {
  yellowLight: '#FFF33B',
  yellow: '#FDC70C',
  orange: '#F3903F',
  /** ⚠️ JAMAIS utilisé pour indiquer une perte — utiliser dataViz.negative */
  red: '#E93E3A',
} as const

export const neutrals = {
  0: '#FFFFFF',
  50: '#FAFAF9',
  100: '#F4F4F2',
  150: '#ECECE8',
  200: '#E4E4DF',
  300: '#D4D4CE',
  400: '#B3B5B7',
  500: '#8A8B8C',
  600: '#5F6062',
  700: '#3F3F42',
  800: '#2D2A2B',
  900: '#231F20',
  1000: '#0E0C0D',
} as const

export const dataViz = {
  /** AA-safe sur surfaces claires (texte) — voir tokens.css. */
  positive: '#0A7A4D',
  positive50: '#E8F5F0',
  /** Delta négatif / perte — TOUJOURS cette valeur, jamais brand.red */
  negative: '#C53030',
  negative50: '#FEECEE',
  /** AA-safe sur surfaces claires (texte) — voir tokens.css. */
  neutral: '#67686A',
  neutral50: '#ECECE8',
  warning: '#D97706',
  warning50: '#FEF4E6',
  /** Ambre foncé AA-safe pour le TEXTE sur tint clair (warning ≠ brand.red). */
  warningStrong: '#92400E',
  // Dark mode overrides
  positiveDark: '#34D399',
  negativeDark: '#F87171',
  warningDark: '#F59E0B',
} as const

/** Tokens sémantiques — mode CLAIR uniquement (miroir de :root dans tokens.css).
 *  Destinés aux contextes hors-Tailwind où l'on rend en clair par défaut
 *  (emails transactionnels React Email, PDF d'attestation). Le mode sombre des
 *  emails est géré par les clients mail via @media, pas par ce miroir. */
export const semantic = {
  bg: '#FAFAF9', // --bg = --n-50
  bgPage: '#F4F4F2', // --bg-page = --n-100
  card: '#FFFFFF', // --card = --n-0
  cardSub: '#FAFAF9', // --card-sub = --n-50
  text: '#231F20', // --text = --n-900
  textSec: '#5F6062', // --text-sec = --n-600
  textTer: '#67686A', // --text-ter (AA-safe)
  border: '#E4E4DF', // --border = --n-200
  borderStrong: '#D4D4CE', // --border-strong = --n-300
  accent: '#FDC70C', // --accent = --brand-yellow
  /** Encre sur l'accent jaune (CTA email/bouton) — JAMAIS du blanc. */
  accentInk: '#231F20', // --accent-ink = --n-900
} as const

/** Fond de la « boîte de réception » derrière le conteneur 600px (email.bg). */
export const email = {
  bg: '#F4F4F2', // surface neutre claire derrière le conteneur
  /** Dégradé signature du bandeau accent (5px) — brand.yellow → orange. */
  accentGradient: 'linear-gradient(90deg, #FFF33B, #FDC70C 55%, #F3903F)',
} as const

export const motion = {
  fast: 150,
  std: 220,
  slow: 320,
} as const

export const radius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  pill: '9999px',
} as const

export const shadow = {
  card: '0 1px 3px 0 rgba(35,31,32,0.06), 0 1px 2px 0 rgba(35,31,32,0.04)',
  pop: '0 4px 12px -2px rgba(35,31,32,0.08), 0 2px 4px -1px rgba(35,31,32,0.04)',
  modal: '0 12px 32px -6px rgba(35,31,32,0.16), 0 6px 12px -4px rgba(35,31,32,0.08)',
  glow: '0 0 0 4px rgba(253,199,12,0.30)',
} as const

export const font = {
  display: "'Tommy Soft', 'Plus Jakarta Sans', system-ui, sans-serif",
  body: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const
