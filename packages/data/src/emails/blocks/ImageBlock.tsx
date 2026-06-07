import type { CSSProperties } from 'react'
import { Img, Section, Text } from '@react-email/components'
import { font, radius, semantic } from '@evolve/design-system'
import type { ImageBloc } from '@evolve/types'
import { hasText } from './_shared.tsx'

/**
 * ImageBlock — renderer email du bloc `blocs.image`.
 *
 * Rend l'`image` SEULE (pas de variante `imageDark` en mail : le fond clair est baked,
 * cf. block-contract.md). `alt` obligatoire (A11y). Légende optionnelle dessous.
 * L'URL doit déjà être ABSOLUE (préfixée par le mapper) — les clients mail ne
 * résolvent pas les chemins relatifs.
 */
export function ImageBlock({ bloc }: { bloc: ImageBloc }) {
  const src = (bloc.image?.url ?? '').trim()
  if (src === '') return null
  const alt = (bloc.alt ?? '').trim()
  return (
    <Section style={wrapper}>
      <Img src={src} alt={alt} width="100%" style={img} />
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
  borderRadius: radius.md,
  border: `1px solid ${semantic.border}`,
}

const legende: CSSProperties = {
  margin: '8px 0 0',
  fontFamily: font.body,
  fontSize: '12.5px',
  lineHeight: '1.5',
  color: semantic.textTer,
}
