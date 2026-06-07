import { Button, Heading, Section, Text } from '@react-email/components'
import type { CSSProperties } from 'react'
import { brand, font, radius, semantic } from '@evolve/design-system'
import { formatMonth } from '@evolve/utils'
import { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'

/**
 * AttestationEmail — email mensuel accompagnant l'attestation de détention (NTF-005).
 *
 * Cf. export « Emails Transactionnels », section « Le récap du mois, signé » /
 * « Ton attestation de détention d'avril 2026 » :
 *   - eyebrow « Attestation · {mois} »
 *   - titre « Ton attestation de détention de {mois} est disponible »
 *   - récap des 4 chiffres clés (Parts détenues % · Cotisation totale € ·
 *     Montant quote-part € · Valorisation portefeuille €)
 *   - indication d'une pièce jointe PDF (chip « attestation-{mois}.pdf »)
 *   - CTA jaune « Ouvrir mon espace » → {appUrl}/contributions
 *
 * Le PDF (NTF-004) est joint à l'email réel par l'Edge Function ; ce composant n'en
 * affiche QUE la mention. Les KPI sont passés DÉJÀ formatés en FR (le formatage vit en
 * amont, via @evolve/utils côté appelant) → le composant reste pur et trivialement
 * testable. Tokens only, jamais brand.red ; fallback « — » sur toute valeur vide.
 */
export interface AttestationEmailKpis {
  /** Parts détenues, déjà formaté FR (ex. « 12,35 % »). */
  detentionPct: string
  /** Cotisation totale, déjà formatée FR (ex. « 4 200,00 € »). */
  totalContributed: string
  /** Montant de la quote-part, déjà formaté FR. */
  quotePartValue: string
  /** Valorisation du portefeuille du club, déjà formatée FR. */
  portfolioValue: string
}

export interface AttestationEmailProps {
  /** Prénom du membre (affiché dans le corps). */
  memberFirstName: string
  /** Nom du club (footer + corps). */
  clubName: string
  /**
   * Période. Accepte le format canonique `YYYY-MM` (ce que produit le cron) —
   * converti en libellé FR « avril 2026 » — ou un libellé déjà lisible.
   */
  period: string
  /** Les 4 chiffres clés, déjà formatés FR. */
  kpis: AttestationEmailKpis
  /** Base URL de l'app membre. Le CTA pointe vers `{appUrl}/contributions`. */
  appUrl?: string
}

const APP_URL_DEFAULT = 'https://app.evolve.capital'
const FALLBACK = '—'

/** Fallback affichage : jamais d'undefined / chaîne vide à l'écran (CLAUDE.md). */
function orDash(value: string | undefined): string {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? FALLBACK : trimmed
}

/**
 * Période lisible FR : un `YYYY-MM` canonique → « avril 2026 » (via @evolve/utils,
 * locale fr-FR) ; tout autre libellé déjà lisible est rendu tel quel ; vide → « — ».
 */
function readableMonth(period: string): string {
  const value = (period ?? '').trim()
  if (value === '') return FALLBACK
  const iso = /^(\d{4})-(\d{2})$/.exec(value)
  if (!iso) return value
  const year = Number(iso[1])
  const month = Number(iso[2])
  if (month < 1 || month > 12) return value
  return formatMonth(new Date(Date.UTC(year, month - 1, 1)))
}

/** Slugifie une période lisible pour le nom de fichier de la pièce jointe (chip d'affichage). */
function attachmentName(monthLabel: string): string {
  const slug = orDash(monthLabel)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `attestation-${slug === '' ? 'detention' : slug}.pdf`
}

interface KpiRow {
  label: string
  value: string
}

export function AttestationEmail({
  memberFirstName,
  clubName,
  period,
  kpis,
  appUrl,
}: AttestationEmailProps) {
  const firstName = orDash(memberFirstName)
  const club = orDash(clubName)
  const monthLabel = readableMonth(period)
  const contributionsUrl = `${(appUrl ?? APP_URL_DEFAULT).replace(/\/+$/, '')}/contributions`

  const rows: readonly KpiRow[] = [
    { label: 'Parts détenues', value: orDash(kpis.detentionPct) },
    { label: 'Cotisation totale', value: orDash(kpis.totalContributed) },
    { label: 'Montant quote-part', value: orDash(kpis.quotePartValue) },
    { label: 'Valorisation portefeuille', value: orDash(kpis.portfolioValue) },
  ]

  return (
    <EvolveEmailShell
      preview={`Ton attestation de détention de ${monthLabel} est disponible`}
      clubName={clubName.trim() === '' ? undefined : clubName.trim()}
    >
      <Text style={eyebrow}>Attestation · {monthLabel}</Text>
      <Heading as="h1" style={h1}>
        Ton attestation de détention de {monthLabel} est disponible
      </Heading>
      <Text style={lead}>
        Bonjour {firstName}, voici le récap du mois pour le club{' '}
        <strong style={leadStrong}>{club}</strong>. Ton attestation complète est jointe à cet email
        au format PDF.
      </Text>

      <Section style={kpiGrid}>
        {rows.map((r) => (
          <Section key={r.label} style={kpiCell}>
            <Text style={kpiLabel}>{r.label}</Text>
            <Text style={kpiValue}>{r.value}</Text>
          </Section>
        ))}
      </Section>

      <Section style={attachmentBox}>
        <Text style={attachmentText}>
          <span style={attachmentIcon}>📎</span> Pièce jointe&nbsp;: {attachmentName(monthLabel)}
        </Text>
      </Section>

      <Button href={contributionsUrl} style={cta}>
        Ouvrir mon espace
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
  fontSize: '25px',
  lineHeight: '1.14',
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

const kpiGrid: CSSProperties = {
  margin: '0 0 22px',
}

const kpiCell: CSSProperties = {
  marginBottom: '10px',
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.md,
  backgroundColor: semantic.bg,
  padding: '14px 16px',
}

const kpiLabel: CSSProperties = {
  margin: '0 0 4px',
  fontFamily: font.mono,
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

const kpiValue: CSSProperties = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '18px',
  color: semantic.text,
}

const attachmentBox: CSSProperties = {
  margin: '0 0 28px',
  border: `1px dashed ${semantic.borderStrong}`,
  borderRadius: radius.md,
  backgroundColor: semantic.card,
  padding: '12px 16px',
}

const attachmentText: CSSProperties = {
  margin: 0,
  fontSize: '13.5px',
  lineHeight: '1.5',
  color: semantic.textSec,
}

const attachmentIcon: CSSProperties = {
  marginRight: '6px',
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
