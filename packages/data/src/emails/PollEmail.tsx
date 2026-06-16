import { Button, Heading, Section, Text } from '@react-email/components'
import type { CSSProperties } from 'react'
import { brand, dataViz, font, radius, semantic } from '@evolve/design-system'
import { formatDateLong } from '@evolve/utils'
import { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'

/**
 * PollEmail — emails transactionnels du module Vote anonyme (NTF-008 / PUSH-001 V1 email).
 *
 * Cf. prompt design `docs/product/PROMPT-DESIGN-NTF-POLL-EMAIL.md` et l'export visuel
 * « Emails Transactionnels (standalone).html » : MÊME shell (EvolveEmailShell) que Magic
 * Link / Bienvenue / Attestation. 3 variantes :
 *   - opened   → « Un vote attend votre avis » (publish) — encart anonymat
 *   - closed   → « Résultats du vote » (clôture) — PAS d'encart anonymat (vote fini)
 *   - reminder → « Dernière chance de voter » (J-1) — label ambre + encart anonymat
 *
 * ANONYMAT — règle produit NON NÉGOCIABLE :
 *   INTERDIT dans le visuel ET le copy : « X membres ont voté », nom/avatar d'un votant,
 *   nom du créateur, pourcentages de participation, barres/graphiques de résultats,
 *   contenu de réponses. Les résultats vivent dans l'app uniquement.
 *
 * COULEURS : CTA jaune `brand.yellow` sur encre `semantic.accentInk` — jamais blanc sur
 * jaune, jamais `brand.red`. La variante `reminder` utilise l'ambre `dataViz.warning`
 * (#D97706) pour le label « Échéance proche » — JAMAIS le rouge brand (#E93E3A).
 *
 * Email transactionnel relationnel club → `hideUnsubscribe` (footer RGPD sans désinscription).
 * Pur : les valeurs sont passées prêtes ; aucune PII.
 */
export type PollEmailVariant = 'opened' | 'closed' | 'reminder'

/** Locale de l'email — FR par défaut. Le copy des notifications de vote est FR-only en V0
 *  (EN = follow-up i18n push V1) ; la prop existe pour la compat future, sans dépendance i18n. */
export type PollEmailLocale = 'fr' | 'en'

export interface PollEmailProps {
  /** Prénom du membre (affiché dans le corps). */
  memberFirstName: string
  /** Nom du club (footer + corps). */
  clubName: string
  /** Titre du vote (jamais une identité). */
  pollTitle: string
  /** Description / contexte du vote — tronquée à l'affichage. Optionnelle. */
  pollDescription?: string
  /** Type de question (libellé technique mappé en FR pour la pastille). */
  questionType: 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text'
  /**
   * Échéance du vote (ISO ou Date). Affichée « le {date longue FR} » sur opened/reminder.
   * `null` / absent = pas d'échéance (clause omise).
   */
  closesAt?: string | Date | null
  /** Variante de l'email. */
  variant: PollEmailVariant
  /** Base URL de l'app membre. Le CTA pointe vers `{appUrl}/votes`. */
  appUrl?: string
  /** Langue de l'email — FR par défaut (copy FR-only en V0). */
  locale?: PollEmailLocale
}

const APP_URL_DEFAULT = 'https://app.evolve.capital'
const FALLBACK = '—'

function orDash(value: string | undefined): string {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? FALLBACK : trimmed
}

/** Pastille FR du type de question (anonyme — pas de donnée de réponse). */
const QUESTION_TYPE_LABEL: Record<PollEmailProps['questionType'], string> = {
  yes_no: 'Oui / Non',
  single_choice: 'Choix unique',
  multiple_choice: 'Choix multiple',
  short_text: 'Réponse libre',
}

/** Échéance lisible « 30 juin 2026 » via @evolve/utils, ou null si absente/invalide. */
function readableDeadline(closesAt: string | Date | null | undefined): string | null {
  if (closesAt == null) return null
  const formatted = formatDateLong(closesAt)
  return formatted === FALLBACK ? null : formatted
}

interface VariantCopy {
  preview: string
  eyebrow: string
  title: string
  lead: string
  cta: string
  /** Note de pied (sous le CTA). */
  footNote: string
  /** Affiche le label ambre « Échéance proche » (reminder uniquement). */
  showUrgencyLabel: boolean
  /** Affiche l'encart anonymat (opened + reminder ; pas closed). */
  showAnonymityCard: boolean
}

function buildCopy(props: PollEmailProps, club: string): VariantCopy {
  const title = orDash(props.pollTitle)
  switch (props.variant) {
    case 'opened':
      return {
        preview: `Nouveau vote : ${title}`,
        eyebrow: 'Consultation · Vote',
        title: 'Un vote attend votre avis',
        lead: `Le club ${club} ouvre une consultation anonyme.`,
        cta: 'Voter maintenant',
        footNote: 'Votre vote est définitif et ne pourra pas être modifié.',
        showUrgencyLabel: false,
        showAnonymityCard: true,
      }
    case 'closed':
      return {
        preview: `Résultats disponibles : ${title}`,
        eyebrow: 'Consultation · Résultats',
        title: 'Résultats du vote',
        lead: `La consultation « ${title} » est clôturée. Les résultats agrégés sont disponibles dans votre espace.`,
        cta: 'Voir les résultats',
        footNote: 'Les résultats ont été publiés à la clôture du vote.',
        showUrgencyLabel: false,
        showAnonymityCard: false,
      }
    case 'reminder':
      return {
        preview: `Il vous reste 24 h pour voter : ${title}`,
        eyebrow: 'Consultation · Rappel',
        title: 'Dernière chance de voter',
        lead: "La consultation se termine bientôt. Vous n'avez pas encore répondu.",
        cta: 'Voter maintenant',
        footNote: 'Sans réponse de votre part, votre avis ne sera pas pris en compte.',
        showUrgencyLabel: true,
        showAnonymityCard: true,
      }
  }
}

export function PollEmail(props: PollEmailProps) {
  const firstName = orDash(props.memberFirstName)
  const club = orDash(props.clubName)
  const title = orDash(props.pollTitle)
  const deadline = readableDeadline(props.closesAt)
  const votesUrl = `${(props.appUrl ?? APP_URL_DEFAULT).replace(/\/+$/, '')}/votes`
  const copy = buildCopy(props, club)
  const typeLabel = QUESTION_TYPE_LABEL[props.questionType] ?? FALLBACK
  const description = (props.pollDescription ?? '').trim()

  return (
    <EvolveEmailShell
      preview={copy.preview}
      clubName={props.clubName.trim() === '' ? undefined : props.clubName.trim()}
      hideUnsubscribe
    >
      <Section style={eyebrowRow}>
        <Text style={eyebrow}>{copy.eyebrow}</Text>
        {copy.showUrgencyLabel ? <span style={urgencyLabel}>Échéance proche</span> : null}
      </Section>

      <Heading as="h1" style={h1}>
        {copy.title}
      </Heading>

      <Text style={lead}>
        Bonjour {firstName}, {copy.lead}
      </Text>

      {/* Encart vote — bordure gauche dorée (écho discret de la bannière dashboard). */}
      <Section style={voteCard}>
        <Text style={voteTitle}>{title}</Text>
        <Text style={votePill}>{typeLabel}</Text>
        {deadline && props.variant !== 'closed' ? (
          <Text style={voteMeta}>
            Répondez avant le <strong style={voteMetaStrong}>{deadline}</strong>
          </Text>
        ) : null}
        {description !== '' ? <Text style={voteDesc}>{description}</Text> : null}
      </Section>

      {/* Encart anonymat — opened + reminder uniquement (pas closed). */}
      {copy.showAnonymityCard ? (
        <Section style={anonymityCard}>
          <Text style={anonymityText}>
            <span style={anonymityIcon}>🔒</span> Votre réponse reste anonyme. Personne ne peut
            associer votre nom à votre vote.
          </Text>
        </Section>
      ) : null}

      <Button href={votesUrl} style={cta}>
        {copy.cta}
      </Button>

      <Text style={footNote}>{copy.footNote}</Text>
    </EvolveEmailShell>
  )
}

/* — Styles inline (miroir TS des tokens) — */

const eyebrowRow: CSSProperties = {
  margin: '0 0 12px',
}

const eyebrow: CSSProperties = {
  display: 'inline-block',
  margin: 0,
  fontFamily: font.mono,
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: semantic.textTer,
}

/** Label ambre « Échéance proche » — token warning, JAMAIS brand.red. */
const urgencyLabel: CSSProperties = {
  display: 'inline-block',
  marginLeft: '10px',
  padding: '2px 8px',
  borderRadius: radius.pill,
  backgroundColor: dataViz.warning50,
  color: dataViz.warningStrong,
  fontFamily: font.mono,
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  verticalAlign: 'middle',
}

const h1: CSSProperties = {
  margin: '0 0 14px',
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '27px',
  lineHeight: '1.14',
  letterSpacing: '-0.02em',
  color: semantic.text,
}

const lead: CSSProperties = {
  margin: '0 0 24px',
  fontSize: '15px',
  lineHeight: '1.6',
  color: semantic.textSec,
}

/** Encart vote — bordure gauche dorée (brand.yellow) = écho de la bannière dashboard. */
const voteCard: CSSProperties = {
  margin: '0 0 18px',
  border: `1px solid ${semantic.border}`,
  borderLeft: `3px solid ${brand.yellow}`,
  borderRadius: radius.md,
  backgroundColor: semantic.bg,
  padding: '16px 18px',
}

const voteTitle: CSSProperties = {
  margin: '0 0 8px',
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '16px',
  lineHeight: '1.3',
  color: semantic.text,
}

const votePill: CSSProperties = {
  display: 'inline-block',
  margin: '0 0 10px',
  padding: '2px 8px',
  borderRadius: radius.pill,
  backgroundColor: semantic.card,
  border: `1px solid ${semantic.border}`,
  fontFamily: font.mono,
  fontSize: '10px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: semantic.textSec,
}

const voteMeta: CSSProperties = {
  margin: '0 0 6px',
  fontSize: '13.5px',
  lineHeight: '1.5',
  color: semantic.textSec,
}

const voteMetaStrong: CSSProperties = {
  color: semantic.text,
  fontWeight: 600,
}

const voteDesc: CSSProperties = {
  margin: 0,
  fontSize: '13.5px',
  lineHeight: '1.5',
  color: semantic.textTer,
}

const anonymityCard: CSSProperties = {
  margin: '0 0 22px',
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.md,
  backgroundColor: semantic.cardSub,
  padding: '13px 16px',
}

const anonymityText: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  lineHeight: '1.5',
  color: semantic.textSec,
}

const anonymityIcon: CSSProperties = {
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

const footNote: CSSProperties = {
  margin: '18px 0 0',
  fontSize: '12.5px',
  lineHeight: '1.5',
  color: semantic.textTer,
  textAlign: 'center',
}
