import { Button, Heading, Section, Text } from '@react-email/components'
import type { CSSProperties } from 'react'
import { brand, font, radius, semantic } from '@evolve/design-system'
import { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'

export interface RelanceEmailProps {
  /** Prénom (ou nom complet) du membre destinataire. */
  memberName: string
  /** Corps du message de relance (texte libre, rédigé par le trésorier). */
  message: string
  /** Nom du club (footer). */
  clubName?: string
  /** URL de base de l'application. */
  appUrl?: string
}

const APP_URL_DEFAULT = 'https://app.reseauevolvecapital.com'

/** Convertit le texte multi-ligne en tableau de paragraphes non-vides. */
function messageLines(text: string): string[] {
  return text.split('\n').filter((line) => line.trim() !== '')
}

export function RelanceEmail({ memberName, message, clubName, appUrl }: RelanceEmailProps) {
  const contributionsUrl = `${(appUrl ?? APP_URL_DEFAULT).replace(/\/+$/, '')}/contributions`
  const lines = messageLines(message)

  return (
    <EvolveEmailShell
      preview={`Un rappel de cotisation pour ${memberName}`}
      clubName={clubName}
      hideUnsubscribe
    >
      <Text style={eyebrow}>Cotisations · Rappel</Text>
      <Heading as="h1" style={h1}>
        Un rappel de cotisation
      </Heading>

      {/* Corps du message rédigé par le trésorier */}
      <Section style={messageBox}>
        {lines.map((line, i) => (
          <Text key={i} style={messageLine}>
            {line}
          </Text>
        ))}
      </Section>

      <Button href={contributionsUrl} style={cta}>
        Voir mes cotisations
      </Button>

      {/* Note : le membre peut répondre via le formulaire de feedback */}
      <Text style={note}>
        <strong style={noteStrong}>Une question ou un problème ?</strong> Tu peux nous écrire
        directement depuis ton espace membre en utilisant le bouton de retour en bas de l&apos;écran
        — on te répondra rapidement.
      </Text>
    </EvolveEmailShell>
  )
}

/* ─── Styles inline (tokens miroir TS) ─────────────────────────── */

const eyebrow: CSSProperties = {
  margin: '0 0 12px',
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

const h1: CSSProperties = {
  margin: '0 0 20px',
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '25px',
  lineHeight: '1.14',
  letterSpacing: '-0.02em',
  color: semantic.text,
}

const messageBox: CSSProperties = {
  margin: '0 0 26px',
  padding: '20px 22px',
  backgroundColor: semantic.bg,
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.md,
}

const messageLine: CSSProperties = {
  margin: '0 0 8px',
  fontSize: '14.5px',
  lineHeight: '1.6',
  color: semantic.textSec,
}

const cta: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'center',
  boxSizing: 'border-box',
  backgroundColor: brand.yellow,
  color: semantic.accentInk,
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '15px',
  letterSpacing: '0.04em',
  textDecoration: 'none',
  padding: '17px 24px',
  borderRadius: radius.md,
}

const note: CSSProperties = {
  marginTop: '24px',
  paddingTop: '20px',
  borderTop: `1px solid ${semantic.border}`,
  fontSize: '12.5px',
  lineHeight: '1.55',
  color: semantic.textTer,
}

const noteStrong: CSSProperties = {
  color: semantic.textSec,
  fontWeight: 600,
}
