import type { CSSProperties } from 'react'
import { Section, Text } from '@react-email/components'
import { font, semantic } from '@evolve/design-system'
import type { LabelRubriqueBloc } from '@evolve/types'

/**
 * LabelRubriqueBlock — renderer email du bloc `blocs.label-rubrique`.
 *
 * Marqueur carré doré + texte SOMBRE (jamais jaune-sur-blanc : RGAA + design system,
 * cf. block-contract.md). Le carré est un `<span>` coloré (pas une image) pour rester
 * robuste si les images sont bloquées.
 */
export function LabelRubriqueBlock({ bloc }: { bloc: LabelRubriqueBloc }) {
  const texte = (bloc.texte ?? '').trim()
  if (texte === '') return null
  return (
    <Section style={wrapper}>
      <Text style={label}>
        <span style={square} />
        <span style={text}>{texte}</span>
      </Text>
    </Section>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const wrapper: CSSProperties = { margin: '0 0 12px' }

const label: CSSProperties = { margin: 0, lineHeight: '1' }

/** Carré doré 9px, encre baked clair. */
const square: CSSProperties = {
  display: 'inline-block',
  width: '9px',
  height: '9px',
  backgroundColor: semantic.accent,
  marginRight: '9px',
  verticalAlign: 'middle',
}

const text: CSSProperties = {
  fontFamily: font.mono,
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: semantic.text,
  verticalAlign: 'middle',
}
