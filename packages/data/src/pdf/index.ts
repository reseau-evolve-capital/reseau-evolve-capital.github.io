// Barrel PDF (NTF-004) + util de rendu serveur.
//
// `renderAttestationPdf(data)` : génère le QR (dataURL PNG depuis data.verificationUrl via la
// lib `qrcode`), monte le composant @react-pdf/renderer et renvoie un Buffer prêt à streamer
// (Content-Type application/pdf). Node-only (renderToBuffer + qrcode) → appelé côté route
// `runtime = 'nodejs'`, jamais côté client.
//
// Réf : NTF-004, CLAUDE.md (server-only pour la génération de documents).

import { renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'

import { AttestationDetention } from './AttestationDetention'
import type { AttestationData } from './attestation.mapper'

export {
  mapAttestation,
  sumPortfolioValue,
  sumYearInvested,
  monthEffort,
  parsePeriod,
  buildReference,
  DASH,
} from './attestation.mapper'
export type {
  AttestationData,
  AttestationInput,
  AttestationIdentityInput,
  AttestationContributionInput,
  AttestationPositionInput,
  AttestationMonthInput,
  AttestationMetric,
} from './attestation.mapper'
export { AttestationDetention } from './AttestationDetention'
export type { AttestationDetentionProps } from './AttestationDetention'

/** Génère le QR (dataURL PNG) encodant l'URL de vérification. Erreur → undefined (fallback texte). */
export async function buildVerificationQr(url: string): Promise<string | undefined> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
    })
  } catch {
    return undefined
  }
}

/** Rend l'attestation en PDF (Buffer). Génère le QR puis monte le composant. Node-only. */
export async function renderAttestationPdf(data: AttestationData): Promise<Buffer> {
  const qrDataUrl = await buildVerificationQr(data.verificationUrl)
  // Le composant renvoie directement l'élément <Document> (ReactElement<DocumentProps>),
  // attendu par renderToBuffer. On l'invoque comme fonction (pas de createElement) pour
  // conserver ce type précis plutôt qu'un FunctionComponentElement générique.
  const element = AttestationDetention(qrDataUrl ? { data, qrDataUrl } : { data })
  return renderToBuffer(element)
}
