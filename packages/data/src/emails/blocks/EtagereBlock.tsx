import type { CSSProperties } from 'react'
import { Section, Text } from '@react-email/components'
import { font, radius, semantic } from '@evolve/design-system'
import type { EtagereBloc } from '@evolve/types'
import { hasText } from './_shared.tsx'

/**
 * EtagereBlock — renderer email du bloc `blocs.etagere`.
 *
 * Liste de recommandations (titre + auteur + « pourquoi »). Chaque item est une carte
 * empilée (robuste Outlook). Champs optionnels rendus sans tiret vide.
 */
export function EtagereBlock({ bloc }: { bloc: EtagereBloc }) {
  const items = (Array.isArray(bloc.items) ? bloc.items : []).filter((it) => hasText(it?.titre))
  if (items.length === 0) return null
  return (
    <Section style={wrapper}>
      {items.map((item, i) => (
        <Section key={`etagere-${bloc.id}-${i}`} style={card}>
          <Text style={titre}>
            {item.titre.trim()}
            {hasText(item.auteur) ? <span style={auteur}> · {item.auteur.trim()}</span> : null}
          </Text>
          {hasText(item.pourquoi) ? <Text style={pourquoi}>{item.pourquoi.trim()}</Text> : null}
        </Section>
      ))}
    </Section>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const wrapper: CSSProperties = { margin: '0 0 22px' }

const card: CSSProperties = {
  marginBottom: '10px',
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.md,
  backgroundColor: semantic.bg,
  padding: '14px 16px',
}

const titre: CSSProperties = {
  margin: '0 0 4px',
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '15px',
  color: semantic.text,
}

const auteur: CSSProperties = {
  fontWeight: 500,
  color: semantic.textSec,
}

const pourquoi: CSSProperties = {
  margin: 0,
  fontFamily: font.body,
  fontSize: '13.5px',
  lineHeight: '1.55',
  color: semantic.textSec,
}
