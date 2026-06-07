import type { CSSProperties } from 'react'
import { Img, Section, Text } from '@react-email/components'
import { font, radius, semantic } from '@evolve/design-system'
import type { LeChiffreBloc } from '@evolve/types'
import { hasText } from './_shared.tsx'

/**
 * LeChiffreBlock — renderer email du bloc `blocs.le-chiffre`.
 *
 * Rend `imageClaire` en `src` (URL absolue, fournie par le mapper). PAS de variante
 * sombre en mail : le fond clair est baked (cf. block-contract.md) — `imageSombre` est
 * volontairement ignorée ici. `alt` = `alternativeText` de l'image.
 *
 * `fallbackTexte` est rendu en TEXTE VISIBLE sous l'image (et non en simple `alt`) :
 * de nombreux clients (Outlook, Gmail images coupées) bloquent les images par défaut ;
 * le chiffre-clé doit rester lisible sans image. Légende + source suivent.
 */
export function LeChiffreBlock({ bloc }: { bloc: LeChiffreBloc }) {
  const src = (bloc.imageClaire?.url ?? '').trim()
  const alt = (bloc.imageClaire?.alternativeText ?? '').trim()
  return (
    <Section style={wrapper}>
      {src !== '' ? <Img src={src} alt={alt} width="100%" style={img} /> : null}
      {hasText(bloc.fallbackTexte) ? (
        <Text style={fallback}>{bloc.fallbackTexte.trim()}</Text>
      ) : null}
      {hasText(bloc.legende) ? <Text style={legende}>{bloc.legende.trim()}</Text> : null}
      {hasText(bloc.source) ? <Text style={source}>{bloc.source.trim()}</Text> : null}
    </Section>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const wrapper: CSSProperties = {
  margin: '0 0 22px',
  padding: '4px',
  borderRadius: radius.md,
}

const img: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'auto',
  borderRadius: radius.md,
  border: `1px solid ${semantic.border}`,
}

/** Texte de repli visible si l'image est bloquée — le chiffre reste lisible. */
const fallback: CSSProperties = {
  margin: '12px 0 0',
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '16px',
  lineHeight: '1.4',
  color: semantic.text,
}

const legende: CSSProperties = {
  margin: '8px 0 0',
  fontFamily: font.body,
  fontSize: '12.5px',
  lineHeight: '1.5',
  color: semantic.textSec,
}

const source: CSSProperties = {
  margin: '4px 0 0',
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '0.04em',
  color: semantic.textTer,
}
