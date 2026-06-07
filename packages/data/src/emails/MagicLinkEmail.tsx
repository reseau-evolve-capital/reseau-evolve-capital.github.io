import { Button, Heading, Link, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'
import { brand, font, radius, semantic } from '@evolve/design-system'
import { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'

/** Locales supportées par l'email (FR par défaut). Pas de dépendance next-intl
 *  ici : le package @evolve/data ne doit embarquer aucune lib i18n (il tourne aussi
 *  côté Edge Function Deno). Le catalogue est donc inline et auto-suffisant. */
export type MagicLinkLocale = 'fr' | 'en'

/**
 * MagicLinkEmail — email d'authentification sans mot de passe (NTF-001 / A8).
 *
 * Cf. export « Emails Transactionnels », section « Connexion sans mot de passe » :
 * eyebrow « Sécurité · Connexion », titre, corps court rassurant, gros CTA jaune,
 * lien backup en clair (mono), note rassurante. Email essentiel : le lien de
 * désinscription du footer reste affiché mais ne gouverne que les non-essentiels.
 *
 * LIEN UNIQUEMENT (A7) : on n'affiche JAMAIS de code/OTP. Seul `magicLink` (la
 * ConfirmationURL à usage unique) est rendu — comme CTA et comme lien backup.
 *
 * Localisé (A8) : prop `locale` ('fr' | 'en', défaut 'fr'). Le catalogue inline
 * couvre les deux langues à parité. Les formateurs restent neutres (la durée est
 * un simple entier de minutes).
 */
export interface MagicLinkEmailProps {
  /** URL de connexion à usage unique (ConfirmationURL). Jamais de code/OTP. */
  magicLink: string
  /** Durée de validité du lien, en minutes. */
  expiresInMin: number
  /** Nom du club, transmis au footer. */
  clubName?: string
  /** Langue de l'email — FR par défaut. */
  locale?: MagicLinkLocale
}

interface Copy {
  preview: (min: number) => string
  footerNote: string
  eyebrow: string
  title: string
  lead: (min: number) => ReactNode
  cta: string
  backupLabel: string
  noteStrong: string
  note: string
}

const COPY: Record<MagicLinkLocale, Copy> = {
  fr: {
    preview: (min) => `Ton lien de connexion à Evolve Capital (valide ${min} min)`,
    footerNote:
      "Email essentiel — ce lien de connexion t'est toujours envoyé, indépendamment de tes préférences.",
    eyebrow: 'Sécurité · Connexion',
    title: 'Connexion à Evolve Capital',
    lead: (min) => (
      <>
        Voici ton lien de connexion sécurisé. Il est{' '}
        <strong style={leadStrong}>valide {min} min</strong> et fonctionne une seule fois.
      </>
    ),
    cta: 'Se connecter',
    backupLabel: 'Ou copie ce lien dans ton navigateur',
    noteStrong: "Tu n'as pas demandé ce lien ?",
    note: " Ignore cet email — ton compte reste protégé, aucune action n'a été engagée.",
  },
  en: {
    preview: (min) => `Your Evolve Capital sign-in link (valid for ${min} min)`,
    footerNote:
      'Essential email — this sign-in link is always sent to you, regardless of your preferences.',
    eyebrow: 'Security · Sign-in',
    title: 'Sign in to Evolve Capital',
    lead: (min) => (
      <>
        Here is your secure sign-in link. It is{' '}
        <strong style={leadStrong}>valid for {min} min</strong> and works only once.
      </>
    ),
    cta: 'Sign in',
    backupLabel: 'Or copy this link into your browser',
    noteStrong: "Didn't request this link?",
    note: ' Ignore this email — your account stays protected, no action was taken.',
  },
}

export function MagicLinkEmail({
  magicLink,
  expiresInMin,
  clubName,
  locale = 'fr',
}: MagicLinkEmailProps) {
  const t = COPY[locale]
  return (
    <EvolveEmailShell
      preview={t.preview(expiresInMin)}
      clubName={clubName}
      footerNote={t.footerNote}
    >
      <Text style={eyebrow}>{t.eyebrow}</Text>
      <Heading as="h1" style={h1}>
        {t.title}
      </Heading>
      <Text style={lead}>{t.lead(expiresInMin)}</Text>

      <Button href={magicLink} style={cta}>
        {t.cta}
      </Button>

      <Section style={plain}>
        <Text style={plainLabel}>{t.backupLabel}</Text>
        <Link href={magicLink} style={plainUrl}>
          {magicLink}
        </Link>
      </Section>

      <Text style={note}>
        <strong style={noteStrong}>{t.noteStrong}</strong>
        {t.note}
      </Text>
    </EvolveEmailShell>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const eyebrow: React.CSSProperties = {
  margin: '0 0 12px',
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

const h1: React.CSSProperties = {
  margin: '0 0 14px',
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '27px',
  lineHeight: '1.12',
  letterSpacing: '-0.02em',
  color: semantic.text,
}

const lead: React.CSSProperties = {
  margin: '0 0 26px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: semantic.textSec,
}

const leadStrong: React.CSSProperties = {
  color: semantic.text,
  fontWeight: 600,
}

/** CTA jaune : fond brand.yellow, encre accentInk (#231F20) — jamais blanc. */
const cta: React.CSSProperties = {
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

const plain: React.CSSProperties = {
  marginTop: '22px',
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.md,
  backgroundColor: semantic.bg,
  padding: '14px 16px',
}

const plainLabel: React.CSSProperties = {
  margin: '0 0 6px',
  fontFamily: font.mono,
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

const plainUrl: React.CSSProperties = {
  fontFamily: font.mono,
  fontSize: '12px',
  color: semantic.textSec,
  wordBreak: 'break-all',
  lineHeight: '1.5',
}

const note: React.CSSProperties = {
  marginTop: '24px',
  paddingTop: '20px',
  borderTop: `1px solid ${semantic.border}`,
  fontSize: '12.5px',
  lineHeight: '1.55',
  color: semantic.textTer,
}

const noteStrong: React.CSSProperties = {
  color: semantic.textSec,
  fontWeight: 600,
}
