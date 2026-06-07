import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'
import { brand, email, font, radius, semantic } from '@evolve/design-system'

/**
 * EvolveEmailShell — gabarit transactionnel commun à TOUS les emails Evolve.
 *
 * Anatomie (cf. export « Emails Transactionnels », section « Un seul gabarit,
 * partout ») :
 *   1. Bandeau accent 5px (dégradé brand.yellow→orange) — touche de marque.
 *   2. En-tête : logo « € EVOLVE CAPITAL » centré sur surface.card.
 *   3. Conteneur 600px, radius.lg, sur email.bg (la boîte de réception).
 *   4. Slot de contenu (children) — le seul bloc qui varie d'un email à l'autre.
 *   5. Footer RGPD réutilisable : marque, raison d'envoi, adresse postale,
 *      lien désinscription (non-essentiels) + mentions légales.
 *
 * ⚠️ Rendu HTML email (styles inline) : on NE consomme PAS les classes Tailwind
 * du design-system. Les valeurs proviennent du miroir TS des tokens
 * (`@evolve/design-system`), source unique partagée avec le PDF (NTF-004).
 * Les emails sont rendus en mode CLAIR par défaut ; le mode sombre est laissé
 * aux clients mail (aucune image de fond, tokens sémantiques clairs).
 */
export interface EvolveEmailShellProps {
  /** Texte d'aperçu (inbox preview) — masqué dans le corps. */
  preview: string
  /** Contenu spécifique de l'email (titre, corps, CTA…). */
  children: ReactNode
  /** Nom du club, affiché dans la raison d'envoi du footer. */
  clubName?: string
  /**
   * Note de footer optionnelle, rendue au-dessus des mentions légales
   * (ex. rappel « email essentiel »).
   */
  footerNote?: ReactNode
  /**
   * Masque le lien « Se désinscrire » du footer. À mettre à `true` pour TOUT email
   * **transactionnel** (magic link, attestation, alerte…) : l'unsubscribe est une
   * obligation des emails marketing, pas relationnels — et son lien/entête
   * `List-Unsubscribe` est un signal « bulk » qui dégrade la délivrabilité (onglet
   * Gmail « Promotions/Updates »). À laisser `false` (défaut) pour les newsletters.
   */
  hideUnsubscribe?: boolean
}

const ADRESSE_POSTALE =
  'Evolve Capital SAS · 12 rue de la Bourse, 75002 Paris · RCS Paris 901 234 567'

export function EvolveEmailShell({
  preview,
  children,
  clubName,
  footerNote,
  hideUnsubscribe = false,
}: EvolveEmailShellProps) {
  return (
    <Html lang="fr">
      <Head>
        {/* Email conçu en CLAIR : on demande aux clients de NE PAS auto-inverser en
            dark mode (sinon le jaune brand du CTA est terni — cf. QA 2026-06-07).
            Levier standard (Apple Mail, iOS, Outlook ; Gmail partiel). */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={outer}>
          {/* 1 · Bandeau accent */}
          <Section style={accent} />

          {/* 2 · En-tête logo */}
          <Section style={head}>
            <Text style={logo}>
              <span style={logoMark}>€</span> EVOLVE <span style={logoSub}>CAPITAL</span>
            </Text>
          </Section>

          {/* 4 · Slot de contenu */}
          <Section style={contentSlot}>{children}</Section>

          {/* 5 · Footer RGPD */}
          <Section style={footer}>
            <Text style={footerBrand}>Evolve Capital</Text>
            <Text style={footerText}>
              Tu reçois cet email car tu es membre du club{' '}
              <strong style={footerStrong}>{clubName?.trim() ? clubName : 'Evolve Capital'}</strong>
              .
            </Text>
            {footerNote ? <Text style={footerText}>{footerNote}</Text> : null}
            <Text style={footerText}>{ADRESSE_POSTALE}</Text>
            <Hr style={footerRule} />
            <Text style={footerLinks}>
              {hideUnsubscribe ? null : (
                <>
                  <Link href="{{unsubscribe}}" style={footerLink}>
                    Se désinscrire (emails non-essentiels)
                  </Link>{' '}
                  ·{' '}
                </>
              )}
              {/*
                TODO(préférences) : futur centre de préférences de notifications
                (opt-in/out granulaire par catégorie/canal/fréquence des emails
                non-essentiels — alternative douce à l'unsubscribe, lié à NTF-007).
                Commenté tant que la page /preferences n'existe pas.
                <Link href="https://app.reseauevolvecapital.com/preferences" style={footerLink}>
                  Préférences
                </Link>{' '}
                ·{' '}
              */}
              <Link href="https://app.reseauevolvecapital.com/legal/charter" style={footerLink}>
                Mentions légales
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/* — Styles inline (valeurs issues du miroir TS des tokens) — */

const body: React.CSSProperties = {
  margin: 0,
  padding: '24px 0',
  backgroundColor: email.bg,
  fontFamily: font.body,
  // Renforce le mode clair (cf. meta color-scheme) : le CTA jaune ne doit pas être terni.
  colorScheme: 'light',
}

const outer: React.CSSProperties = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: semantic.card,
  border: `1px solid ${semantic.border}`,
  borderRadius: radius.lg,
  overflow: 'hidden',
}

const accent: React.CSSProperties = {
  height: '5px',
  // Fallback solide AVANT le dégradé : Outlook desktop (moteur Word) ignore les
  // CSS gradients et afficherait un bandeau transparent — on retombe sur le jaune brand.
  backgroundColor: brand.yellow,
  background: email.accentGradient,
  lineHeight: '5px',
  fontSize: '1px',
}

const head: React.CSSProperties = {
  padding: '26px 32px',
  textAlign: 'center',
  borderBottom: `1px solid ${semantic.border}`,
  backgroundColor: semantic.card,
}

const logo: React.CSSProperties = {
  margin: 0,
  fontFamily: font.display,
  fontWeight: 800,
  fontSize: '16px',
  letterSpacing: '-0.01em',
  color: semantic.text,
}

const logoMark: React.CSSProperties = {
  display: 'inline-block',
  width: '26px',
  height: '26px',
  lineHeight: '26px',
  textAlign: 'center',
  borderRadius: '7px',
  backgroundColor: semantic.accentInk,
  color: brand.yellow,
  fontSize: '15px',
  marginRight: '6px',
  verticalAlign: 'middle',
}

const logoSub: React.CSSProperties = {
  color: semantic.textSec,
}

const contentSlot: React.CSSProperties = {
  padding: '38px 40px 34px',
}

const footer: React.CSSProperties = {
  padding: '22px 40px 28px',
  backgroundColor: semantic.cardSub,
  borderTop: `1px solid ${semantic.border}`,
}

const footerBrand: React.CSSProperties = {
  margin: '0 0 6px',
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: '13px',
  color: semantic.text,
}

const footerText: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '12px',
  lineHeight: '1.55',
  color: semantic.textTer,
}

const footerStrong: React.CSSProperties = {
  color: semantic.textSec,
  fontWeight: 600,
}

const footerRule: React.CSSProperties = {
  borderColor: semantic.border,
  margin: '14px 0',
}

const footerLinks: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  lineHeight: '1.55',
  color: semantic.textTer,
}

const footerLink: React.CSSProperties = {
  color: semantic.textSec,
  textDecoration: 'underline',
}
