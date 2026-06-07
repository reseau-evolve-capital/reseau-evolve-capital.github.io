import type { CSSProperties } from 'react'
import { Section, Text } from '@react-email/components'
import { font, semantic } from '@evolve/design-system'
import type { CitationBloc } from '@evolve/types'
import { hasText } from './_shared.tsx'

/**
 * CitationBlock — renderer email du bloc `blocs.citation`.
 *
 * Bordure gauche dorée + italique (cf. block-contract.md). Attribution optionnelle
 * rendue dessous, sans tiret si absente (jamais d'`undefined` à l'écran).
 */
export function CitationBlock({ bloc }: { bloc: CitationBloc }) {
  const texte = (bloc.texte ?? '').trim()
  if (texte === '') return null
  return (
    <Section style={wrapper}>
      <Text style={quote}>« {texte} »</Text>
      {hasText(bloc.attribution) ? (
        <Text style={attribution}>— {bloc.attribution.trim()}</Text>
      ) : null}
    </Section>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const wrapper: CSSProperties = {
  margin: '0 0 22px',
  paddingLeft: '18px',
  borderLeft: `3px solid ${semantic.accent}`,
}

const quote: CSSProperties = {
  margin: '0 0 8px',
  fontFamily: font.display,
  fontStyle: 'italic',
  fontSize: '18px',
  lineHeight: '1.5',
  color: semantic.text,
}

const attribution: CSSProperties = {
  margin: 0,
  fontFamily: font.body,
  fontSize: '13px',
  color: semantic.textTer,
}
