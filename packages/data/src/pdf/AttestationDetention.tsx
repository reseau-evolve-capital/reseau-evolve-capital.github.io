// AttestationDetention — document PDF A4 portrait (NTF-004), document à VALEUR du produit.
//
// Rendu via @react-pdf/renderer (StyleSheet, PAS Tailwind). Toutes les couleurs viennent du
// pont TS des tokens (@evolve/design-system) — JAMAIS de hex en dur, JAMAIS brand.red pour un
// chiffre. Tout le formatage passe par @evolve/utils (formatEUR/formatPct/formatDate/formatDateLong).
// Un PDF est intrinsèquement « clair » : on rend en mode clair (tokens `semantic`).
//
// Le QR code est généré en amont (route/util) en dataURL PNG et passé via `qrDataUrl` —
// @react-pdf/renderer ne fait pas tourner `qrcode` lui-même, on lui fournit une <Image>.
// Si `qrDataUrl` est absent, on retombe gracieusement sur le lien de vérification en texte.
//
// Réf : NTF-004, export « Attestation de Detention (standalone).html », CLAUDE.md (tokens, fallback —).

import type { ReactElement } from 'react'

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  type DocumentProps,
} from '@react-pdf/renderer'

import { brand, semantic, dataViz, font, radius } from '@evolve/design-system'
import { formatEUR, formatPct, formatDate, formatDateLong } from '@evolve/utils'

import { DASH, type AttestationData, type AttestationMetric } from './attestation.mapper.ts'

export interface AttestationDetentionProps {
  data: AttestationData
  /** QR code (dataURL PNG) encodant `data.verificationUrl`. Optionnel → fallback texte. */
  qrDataUrl?: string
}

/**
 * Helvetica (police PDF par défaut de @react-pdf) ne possède pas de glyphe pour
 * l'espace fine insécable (U+202F) ni l'insécable (U+00A0) que produit `formatEUR`
 * (locale fr-FR) → le séparateur de milliers serait invisible dans le PDF.
 * On les remappe sur une espace ordinaire UNIQUEMENT pour le rendu PDF ;
 * `formatEUR`/`formatPct` restent canoniques partout ailleurs (UI, emails).
 */
function pdfSpaces(value: string): string {
  return value.replace(/[\u202F\u00A0]/g, ' ')
}

/** Rend une métrique selon son format ; lacune (value null) → `—` (jamais NaN/undefined). */
function renderMetric(metric: AttestationMetric): string {
  if (metric.value === null) return DASH
  return pdfSpaces(
    metric.format === 'pct' ? formatPct(metric.value, { showSign: false }) : formatEUR(metric.value)
  )
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: semantic.card,
    color: semantic.text,
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
  },

  // En-tête
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
    paddingBottom: 16,
    marginBottom: 18,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: brand.yellow,
    marginRight: 6,
  },
  logoText: { fontFamily: 'Helvetica-Bold', fontSize: 15, letterSpacing: 1, color: semantic.text },
  logoSub: { fontFamily: 'Helvetica', fontSize: 15, letterSpacing: 1, color: semantic.textSec },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: semantic.text },
  badge: {
    marginTop: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    letterSpacing: 1.5,
    color: semantic.text,
    backgroundColor: brand.yellow,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  headerMeta: { marginTop: 6, fontSize: 8, color: semantic.textSec },

  // Identité
  identity: {
    backgroundColor: semantic.bg,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: parseInt(radius.md, 10),
    padding: 14,
    marginBottom: 18,
  },
  memberName: { fontFamily: 'Helvetica-Bold', fontSize: 14, marginBottom: 4 },
  identityLine: { fontSize: 9.5, color: semantic.textSec, marginBottom: 2 },
  identityStrong: { color: semantic.text },

  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: semantic.textTer,
    marginBottom: 8,
  },

  // 4 chiffres clés
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  kpiCard: {
    width: '50%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: parseInt(radius.md, 10),
    marginBottom: 8,
  },
  kpiCardSpacerRight: { marginRight: 8 },
  kpiLabel: { fontSize: 8, color: semantic.textSec, marginBottom: 4 },
  kpiValue: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: semantic.text },
  kpiAccentBar: {
    width: 28,
    height: 3,
    backgroundColor: brand.yellow,
    borderRadius: 2,
    marginBottom: 8,
  },

  // 3 compléments
  complementGrid: { flexDirection: 'row', marginBottom: 22 },
  complementCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: semantic.bg,
    borderRadius: parseInt(radius.sm, 10),
  },
  complementLabel: { fontSize: 7.5, color: semantic.textSec, marginBottom: 4 },
  complementValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: semantic.text },

  // Pied
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 44,
    right: 44,
  },
  footerNote: { fontSize: 8, color: semantic.textSec, marginBottom: 10, lineHeight: 1.4 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    paddingTop: 10,
  },
  refBlock: { flexDirection: 'column' },
  refLabel: { fontSize: 7, color: semantic.textTer, marginBottom: 2 },
  refValue: { fontFamily: 'Courier-Bold', fontSize: 9, color: semantic.text },
  refLink: { fontSize: 7, color: semantic.textSec, marginTop: 2 },
  qrImage: { width: 56, height: 56 },
  brandBanner: {
    marginTop: 14,
    backgroundColor: semantic.text,
    borderRadius: 4,
    paddingVertical: 6,
    textAlign: 'center',
  },
  brandBannerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 2,
    color: dataViz.neutral50,
  },
})

interface ComplementDef {
  label: string
  metric: AttestationMetric
}

export function AttestationDetention({
  data,
  qrDataUrl,
}: AttestationDetentionProps): ReactElement<DocumentProps> {
  const joinedLabel = data.joinedAtIso ? formatDate(data.joinedAtIso) : DASH
  const generatedLong = formatDateLong(data.generatedAtIso)
  const placeForGeneration = data.clubCity !== DASH ? data.clubCity : data.clubName

  const kpis: { label: string; metric: AttestationMetric }[] = [
    { label: 'Parts détenues', metric: data.detentionPct },
    { label: 'Cotisation totale', metric: data.totalContributed },
    { label: 'Montant de la quote-part', metric: data.quotePartValue },
    { label: 'Valorisation du portefeuille', metric: data.portfolioValue },
  ]

  const complements: ComplementDef[] = [
    { label: 'Investissement cumulé (année en cours)', metric: data.yearInvested },
    { label: "Capacité restante d'investissement", metric: data.yearRemainingCapacity },
    { label: 'Effort de cotisation (mois en cours)', metric: data.monthClubEffort },
  ]

  return (
    <Document
      title={`Attestation de détention — ${data.fullName}`}
      author="Evolve Capital"
      subject={`Attestation de détention ${data.periodLabel}`}
    >
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <Text style={styles.logoMark}>€</Text>
              <Text style={styles.logoText}>EVOLVE </Text>
              <Text style={styles.logoSub}>CAPITAL</Text>
            </View>
            <Text style={styles.headerMeta}>
              {data.clubName}
              {data.clubCity !== DASH ? ` · ${data.clubCity}` : ''}
            </Text>
            <Text style={styles.headerMeta}>Compte courtier : {data.brokerAccountRef}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Attestation de détention</Text>
            <Text style={styles.badge}>DOCUMENT OFFICIEL</Text>
            <Text style={styles.headerMeta}>Période : {data.periodLabel}</Text>
          </View>
        </View>

        {/* Identité */}
        <View style={styles.identity}>
          <Text style={styles.memberName}>{data.fullName}</Text>
          <Text style={styles.identityLine}>
            Club <Text style={styles.identityStrong}>{data.clubName}</Text>
            {data.clubCity !== DASH ? ` (${data.clubCity})` : ''}
          </Text>
          <Text style={styles.identityLine}>Membre depuis le {joinedLabel}</Text>
          <Text style={styles.identityLine}>Courtier : {data.brokerName}</Text>
          <Text style={styles.identityLine}>Adresse : {data.postalAddress}</Text>
        </View>

        {/* 4 chiffres clés */}
        <Text style={styles.sectionTitle}>Synthèse de la détention</Text>
        <View style={styles.kpiGrid}>
          {kpis.map((k, i) => (
            <View
              key={k.label}
              style={[styles.kpiCard, i % 2 === 0 ? styles.kpiCardSpacerRight : {}]}
            >
              <View style={styles.kpiAccentBar} />
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiValue}>{renderMetric(k.metric)}</Text>
            </View>
          ))}
        </View>

        {/* 3 compléments */}
        <Text style={styles.sectionTitle}>Compléments</Text>
        <View style={styles.complementGrid}>
          {complements.map((c, i) => (
            <View
              key={c.label}
              style={[styles.complementCell, i < complements.length - 1 ? { marginRight: 8 } : {}]}
            >
              <Text style={styles.complementLabel}>{c.label}</Text>
              <Text style={styles.complementValue}>{renderMetric(c.metric)}</Text>
            </View>
          ))}
        </View>

        {/* Pied */}
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Fait à {placeForGeneration}, le {generatedLong}. Document généré automatiquement le{' '}
            {formatDate(data.generatedAtIso)}, ne nécessite pas de signature.
          </Text>
          <View style={styles.footerRow}>
            <View style={styles.refBlock}>
              <Text style={styles.refLabel}>N° DE RÉFÉRENCE</Text>
              <Text style={styles.refValue}>{data.reference}</Text>
              <Text style={styles.refLink}>Vérifier : {data.verificationUrl}</Text>
            </View>
            {qrDataUrl ? <Image style={styles.qrImage} src={qrDataUrl} /> : null}
          </View>
          <View style={styles.brandBanner}>
            <Text style={styles.brandBannerText}>EVOLVE CAPITAL</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
