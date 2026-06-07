import type { CSSProperties } from 'react'
import { Hr, Section } from '@react-email/components'
import { semantic } from '@evolve/design-system'
import type { SeparateurBloc } from '@evolve/types'

/**
 * SeparateurBlock — renderer email du bloc `blocs.separateur`.
 *
 * `filet` = filet horizontal discret (`<hr>`) ; `espace` = espacement vertical seul
 * (cf. block-contract.md).
 */
export function SeparateurBlock({ bloc }: { bloc: SeparateurBloc }) {
  if (bloc.style === 'espace') {
    return <Section style={space} />
  }
  return <Hr style={rule} />
}

/* — Styles inline (miroir TS des tokens) — */

const rule: CSSProperties = {
  borderColor: semantic.border,
  margin: '20px 0 26px',
}

const space: CSSProperties = {
  height: '24px',
  lineHeight: '24px',
  fontSize: '1px',
}
