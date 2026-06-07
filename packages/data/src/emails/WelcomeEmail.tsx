import { Button, Heading, Section, Text } from '@react-email/components'
import type { CSSProperties } from 'react'
import { brand, font, radius, semantic } from '@evolve/design-system'
import { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'

/**
 * WelcomeEmail — email de bienvenue au premier jour dans le club (NTF-002).
 *
 * Cf. export « Emails Transactionnels », section « Premier jour dans le club » /
 * « Bienvenue Louis ! » : titre « Bienvenue {prénom} ! » → ligne « Tu rejoins le
 * club {clubName} » → 3 sections de prise en main (Tableau de bord · Portefeuille
 * du club · Mes cotisations & attestation) → CTA jaune « Accéder à mon espace »
 * → footer RGPD réutilisé du shell.
 *
 * Email essentiel d'accueil : envoyé une seule fois (idempotence côté Edge
 * Function `on-user-first-login`). Tokens only, jamais brand.red.
 */
export interface WelcomeEmailProps {
  /** Prénom du nouveau membre (affiché dans le titre). */
  memberFirstName: string
  /** Nom du club rejoint (sous-titre + footer). */
  clubName: string
  /** Base URL de l'app membre. Défaut : production. */
  appUrl?: string
}

const APP_URL_DEFAULT = 'https://app.evolve.capital'

/** Fallback affichage : jamais d'undefined / chaîne vide à l'écran (CLAUDE.md). */
function orDash(value: string): string {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? '—' : trimmed
}

interface OnboardingSection {
  icon: string
  title: string
  body: string
}

/** Les 3 repères de prise en main, dans l'ordre de l'export visuel. */
const SECTIONS: readonly OnboardingSection[] = [
  {
    icon: '📊',
    title: 'Tableau de bord',
    body: 'Ta quote-part, la valeur du club et tes indicateurs clés, mis à jour à chaque sync.',
  },
  {
    icon: '📈',
    title: 'Portefeuille du club',
    body: 'Les positions détenues collectivement, leur répartition par secteur et leur valorisation.',
  },
  {
    icon: '🧾',
    title: 'Mes cotisations & attestation',
    body: 'Ton historique de cotisations mois par mois et ton attestation de détention à télécharger.',
  },
]

export function WelcomeEmail({ memberFirstName, clubName, appUrl }: WelcomeEmailProps) {
  const firstName = orDash(memberFirstName)
  const club = orDash(clubName)
  const dashboardUrl = `${(appUrl ?? APP_URL_DEFAULT).replace(/\/+$/, '')}/dashboard`

  return (
    <EvolveEmailShell
      preview={`Bienvenue dans le club ${club} sur Evolve Capital`}
      clubName={clubName}
    >
      <Text style={eyebrow}>Premier jour dans le club</Text>
      <Heading as="h1" style={h1}>
        Bienvenue {firstName}&nbsp;!
      </Heading>
      <Text style={lead}>
        Tu rejoins le club <strong style={leadStrong}>{club}</strong>. Ton espace est prêt — voici
        ce que tu y retrouves.
      </Text>

      <Section style={sectionsWrap}>
        {SECTIONS.map((s) => (
          <Section key={s.title} style={item}>
            <Text style={itemTitle}>
              <span style={itemIcon}>{s.icon}</span> {s.title}
            </Text>
            <Text style={itemBody}>{s.body}</Text>
          </Section>
        ))}
      </Section>

      <Button href={dashboardUrl} style={cta}>
        Accéder à mon espace
      </Button>
    </EvolveEmailShell>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const eyebrow: CSSProperties = {
  margin: '0 0 12px',
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

const h1: CSSProperties = {
  margin: '0 0 14px',
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '27px',
  lineHeight: '1.12',
  letterSpacing: '-0.02em',
  color: semantic.text,
}

const lead: CSSProperties = {
  margin: '0 0 26px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: semantic.textSec,
}

const leadStrong: CSSProperties = {
  color: semantic.text,
  fontWeight: 600,
}

const sectionsWrap: CSSProperties = {
  margin: '0 0 30px',
}

const item: CSSProperties = {
  marginBottom: '14px',
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.md,
  backgroundColor: semantic.bg,
  padding: '16px 18px',
}

const itemTitle: CSSProperties = {
  margin: '0 0 6px',
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '15px',
  color: semantic.text,
}

const itemIcon: CSSProperties = {
  marginRight: '6px',
}

const itemBody: CSSProperties = {
  margin: 0,
  fontSize: '13.5px',
  lineHeight: '1.55',
  color: semantic.textSec,
}

/** CTA jaune : fond brand.yellow, encre accentInk — jamais blanc, jamais brand.red. */
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
