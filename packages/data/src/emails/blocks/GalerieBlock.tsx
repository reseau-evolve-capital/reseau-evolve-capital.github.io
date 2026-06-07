import type { CSSProperties } from 'react'
import { Img, Section, Text } from '@react-email/components'
import { font, radius, semantic } from '@evolve/design-system'
import type { GalerieBloc } from '@evolve/types'
import { hasText } from './_shared.tsx'

/**
 * GalerieBlock — renderer email du bloc `blocs.galerie`.
 *
 * PILE VERTICALE TOUJOURS : on IGNORE `disposition` (« grille » | « colonne ») côté
 * email, car les grilles multi-colonnes cassent sous Outlook (moteur Word). Chaque
 * image est rendue pleine largeur, empilée ; la légende commune (si présente) suit la
 * pile. URLs déjà absolues (préfixées par le mapper). `alternativeText` → `alt`.
 */
export function GalerieBlock({ bloc }: { bloc: GalerieBloc }) {
  const images = (Array.isArray(bloc.images) ? bloc.images : []).filter(
    (img) => (img?.url ?? '').trim() !== ''
  )
  if (images.length === 0) return null
  return (
    <Section style={wrapper}>
      {images.map((image, i) => (
        <Img
          key={`gal-${bloc.id}-${i}`}
          src={image.url.trim()}
          alt={(image.alternativeText ?? '').trim()}
          width="100%"
          style={img}
        />
      ))}
      {hasText(bloc.legende) ? <Text style={legende}>{bloc.legende.trim()}</Text> : null}
    </Section>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const wrapper: CSSProperties = { margin: '0 0 22px' }

const img: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'auto',
  marginBottom: '10px',
  borderRadius: radius.md,
  border: `1px solid ${semantic.border}`,
}

const legende: CSSProperties = {
  margin: '2px 0 0',
  fontFamily: font.body,
  fontSize: '12.5px',
  lineHeight: '1.5',
  color: semantic.textTer,
}
