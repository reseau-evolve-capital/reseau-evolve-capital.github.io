import type { CSSProperties } from 'react'
import { Link, Section } from '@react-email/components'
import { font, semantic } from '@evolve/design-system'
import type { CtaBloc } from '@evolve/types'
import { resolveCtaHref } from './_shared.tsx'

/**
 * CtaBlock — renderer email du bloc `blocs.cta`.
 *
 * Bouton SECONDAIRE (lien doré souligné) — distinct du CTA primaire bulletproof
 * « Lire en ligne » de la newsletter (résolu hors blocs). URL résolue via
 * `resolveCtaHref` (url explicite, sinon `urlInterne` ; cf. block-contract.md).
 * S'abstient si ni libellé ni cible exploitables.
 */
export function CtaBlock({ bloc }: { bloc: CtaBloc }) {
  const libelle = (bloc.libelle ?? '').trim()
  const href = resolveCtaHref(bloc.url, bloc.urlInterne)
  if (libelle === '' || !href) return null
  return (
    <Section style={wrapper}>
      <Link href={href} style={link}>
        {libelle} →
      </Link>
    </Section>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const wrapper: CSSProperties = { margin: '0 0 22px' }

/** Lien secondaire : encre sombre soulignée (jamais jaune-sur-blanc — RGAA). */
const link: CSSProperties = {
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '15px',
  color: semantic.text,
  textDecoration: 'underline',
  textDecorationColor: semantic.accent,
}
