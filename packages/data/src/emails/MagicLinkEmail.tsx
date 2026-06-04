import { Button, Heading, Link, Section, Text } from '@react-email/components'
import { brand, font, radius, semantic } from '@evolve/design-system'
import { EvolveEmailShell } from './_layout/EvolveEmailShell'

/**
 * MagicLinkEmail — email d'authentification sans mot de passe (NTF-001).
 *
 * Cf. export « Emails Transactionnels », section « Connexion sans mot de passe » :
 * eyebrow « Sécurité · Connexion », titre, corps court rassurant, gros CTA jaune,
 * lien backup en clair (mono), note rassurante. Email essentiel : le lien de
 * désinscription du footer reste affiché mais ne gouverne que les non-essentiels.
 */
export interface MagicLinkEmailProps {
  /** URL de connexion à usage unique. */
  magicLink: string
  /** Durée de validité du lien, en minutes. */
  expiresInMin: number
  /** Nom du club, transmis au footer. */
  clubName?: string
}

export function MagicLinkEmail({ magicLink, expiresInMin, clubName }: MagicLinkEmailProps) {
  return (
    <EvolveEmailShell
      preview={`Ton lien de connexion à Evolve Capital (valide ${expiresInMin} min)`}
      clubName={clubName}
      footerNote="Email essentiel — ce lien de connexion t'est toujours envoyé, indépendamment de tes préférences."
    >
      <Text style={eyebrow}>Sécurité · Connexion</Text>
      <Heading as="h1" style={h1}>
        Connexion à Evolve Capital
      </Heading>
      <Text style={lead}>
        Voici ton lien de connexion sécurisé. Il est{' '}
        <strong style={leadStrong}>valide {expiresInMin} min</strong> et fonctionne une seule fois.
      </Text>

      <Button href={magicLink} style={cta}>
        Se connecter
      </Button>

      <Section style={plain}>
        <Text style={plainLabel}>Ou copie ce lien dans ton navigateur</Text>
        <Link href={magicLink} style={plainUrl}>
          {magicLink}
        </Link>
      </Section>

      <Text style={note}>
        <strong style={noteStrong}>Tu n&apos;as pas demandé ce lien&nbsp;?</strong> Ignore cet email
        — ton compte reste protégé, aucune action n&apos;a été engagée.
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
