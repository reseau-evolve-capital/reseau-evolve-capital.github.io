import { Button, Heading, Section, Text } from '@react-email/components'
import { dataViz, font, radius, semantic } from '@evolve/design-system'
import { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'

/**
 * SyncErrorEmail — alerte aux trésoriers quand la synchronisation Sheets casse
 * sur une erreur DURE (NTF-003).
 *
 * Cf. export « Emails Transactionnels », section « Quand la synchro casse » /
 * « Erreur de synchronisation – Cercle Arago » :
 *   - eyebrow « Synchronisation · Alerte »
 *   - titre en accent WARNING (token dataViz.warningStrong, JAMAIS brand.red :
 *     une erreur de sync n'est pas une perte/branding, c'est un état d'attention)
 *   - date/heure de la sync en échec
 *   - message lisible (texte métier, pas de stack) dans un encart d'erreur
 *   - CTA « Aller dans l'admin » → /admin?tab=sync
 *   - note « Alerte envoyée au(x) trésorier(s) »
 *
 * Email essentiel (opérationnel) : il part aux trésoriers indépendamment des
 * préférences de désinscription des non-essentiels.
 */
export interface SyncErrorEmailProps {
  /** Nom du club concerné, affiché dans le titre et le footer. */
  clubName: string
  /** Horodatage de la sync en échec (Date ou chaîne déjà formatée). */
  syncTime: string | Date
  /** Message d'erreur lisible (texte métier, jamais une stack). */
  errorMessage: string
  /**
   * Base URL de l'app membre. Le CTA pointe vers `{appUrl}/admin?tab=sync`.
   * Défaut : l'app de production.
   */
  appUrl?: string
}

const DEFAULT_APP_URL = 'https://app.evolve.capital'
const FALLBACK = '—'

/** Formate un horodatage en date/heure FR lisible. Fallback « — » si invalide. */
function formatSyncTime(value: string | Date): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? FALLBACK
      : new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'long',
          timeStyle: 'short',
        }).format(value)
  }
  const trimmed = value.trim()
  if (trimmed === '') return FALLBACK
  // Une chaîne déjà formatée (ou une date ISO) est affichée telle quelle si non parsable.
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime())
    ? trimmed
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(parsed)
}

export function SyncErrorEmail({ clubName, syncTime, errorMessage, appUrl }: SyncErrorEmailProps) {
  const safeClubName = clubName.trim() === '' ? FALLBACK : clubName.trim()
  const safeMessage = errorMessage.trim() === '' ? FALLBACK : errorMessage.trim()
  const formattedTime = formatSyncTime(syncTime)
  const adminUrl = `${appUrl ?? DEFAULT_APP_URL}/admin?tab=sync`

  return (
    <EvolveEmailShell
      preview={`Erreur de synchronisation — ${safeClubName}`}
      clubName={clubName.trim() === '' ? undefined : clubName.trim()}
      footerNote="Email essentiel — cette alerte est envoyée aux trésoriers indépendamment de leurs préférences."
    >
      <Text style={eyebrow}>Synchronisation · Alerte</Text>
      <Heading as="h1" style={h1}>
        Erreur de synchronisation
      </Heading>
      <Text style={lead}>
        La dernière synchronisation des données du club{' '}
        <strong style={leadStrong}>{safeClubName}</strong> a échoué. Les données affichées dans
        l&apos;app peuvent être incomplètes jusqu&apos;à la prochaine sync réussie.
      </Text>

      <Section style={metaBox}>
        <Text style={metaLabel}>Dernière tentative</Text>
        <Text style={metaValue}>{formattedTime}</Text>
      </Section>

      <Section style={errorBox}>
        <Text style={errorLabel}>Détail de l&apos;erreur</Text>
        <Text style={errorText}>{safeMessage}</Text>
      </Section>

      <Button href={adminUrl} style={cta}>
        Aller dans l&apos;admin
      </Button>

      <Text style={note}>
        Alerte envoyée au(x) trésorier(s) du club. Aucune action n&apos;est requise des autres
        membres.
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
  // Accent WARNING (ambre foncé AA-safe) — JAMAIS brand.red.
  color: dataViz.warningStrong,
}

const h1: React.CSSProperties = {
  margin: '0 0 14px',
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '27px',
  lineHeight: '1.12',
  letterSpacing: '-0.02em',
  // Titre en accent WARNING — JAMAIS brand.red (ce n'est pas une perte/branding).
  color: dataViz.warningStrong,
}

const lead: React.CSSProperties = {
  margin: '0 0 24px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: semantic.textSec,
}

const leadStrong: React.CSSProperties = {
  color: semantic.text,
  fontWeight: 600,
}

const metaBox: React.CSSProperties = {
  marginBottom: '16px',
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.md,
  backgroundColor: semantic.bg,
  padding: '14px 16px',
}

const metaLabel: React.CSSProperties = {
  margin: '0 0 4px',
  fontFamily: font.mono,
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

const metaValue: React.CSSProperties = {
  margin: 0,
  fontSize: '14px',
  color: semantic.text,
  fontWeight: 600,
}

/** Encart d'erreur teinté warning (warning50), bordure et texte ambre foncé. */
const errorBox: React.CSSProperties = {
  marginBottom: '26px',
  border: `1px solid ${dataViz.warning}`,
  borderLeft: `4px solid ${dataViz.warningStrong}`,
  borderRadius: radius.md,
  backgroundColor: dataViz.warning50,
  padding: '14px 16px',
}

const errorLabel: React.CSSProperties = {
  margin: '0 0 6px',
  fontFamily: font.mono,
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: dataViz.warningStrong,
}

const errorText: React.CSSProperties = {
  margin: 0,
  fontSize: '13.5px',
  lineHeight: '1.55',
  color: dataViz.warningStrong,
  wordBreak: 'break-word',
}

/** CTA jaune : fond brand.yellow, encre accentInk — cohérent avec les autres emails. */
const cta: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'center',
  boxSizing: 'border-box',
  backgroundColor: semantic.accent,
  color: semantic.accentInk,
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '15px',
  letterSpacing: '0.04em',
  textDecoration: 'none',
  padding: '17px 24px',
  borderRadius: radius.md,
}

const note: React.CSSProperties = {
  marginTop: '24px',
  paddingTop: '20px',
  borderTop: `1px solid ${semantic.border}`,
  fontSize: '12.5px',
  lineHeight: '1.55',
  color: semantic.textTer,
}
