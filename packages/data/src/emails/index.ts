import { render } from '@react-email/render'
import type { ReactElement } from 'react'

/**
 * Emails transactionnels Evolve Capital (React Email).
 *
 * Barrel d'export + util de rendu HTML partagé par les tests et la production
 * (Edge Functions appelant Brevo). Le HTML produit est inline-styled à partir du
 * miroir TS des tokens (`@evolve/design-system`) — compatible Gmail/Outlook.
 */

export { EvolveEmailShell } from './_layout/EvolveEmailShell.tsx'
export type { EvolveEmailShellProps } from './_layout/EvolveEmailShell.tsx'
export { MagicLinkEmail } from './MagicLinkEmail.tsx'
export type { MagicLinkEmailProps, MagicLinkLocale } from './MagicLinkEmail.tsx'
export { WelcomeEmail } from './WelcomeEmail.tsx'
export type { WelcomeEmailProps } from './WelcomeEmail.tsx'
export { SyncErrorEmail } from './SyncErrorEmail.tsx'
export type { SyncErrorEmailProps } from './SyncErrorEmail.tsx'
export { AttestationEmail } from './AttestationEmail.tsx'
export type { AttestationEmailProps, AttestationEmailKpis } from './AttestationEmail.tsx'

/** Rend un email React Email en chaîne HTML prête à l'envoi. */
export function renderEmailHtml(element: ReactElement): Promise<string> {
  return render(element)
}
