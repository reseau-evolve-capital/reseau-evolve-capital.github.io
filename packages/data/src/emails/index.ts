import { render } from '@react-email/render'
import type { ReactElement } from 'react'

/**
 * Emails transactionnels Evolve Capital (React Email).
 *
 * Barrel d'export + util de rendu HTML partagé par les tests et la production
 * (Edge Functions appelant Brevo). Le HTML produit est inline-styled à partir du
 * miroir TS des tokens (`@evolve/design-system`) — compatible Gmail/Outlook.
 */

export { EvolveEmailShell } from './_layout/EvolveEmailShell'
export type { EvolveEmailShellProps } from './_layout/EvolveEmailShell'
export { MagicLinkEmail } from './MagicLinkEmail'
export type { MagicLinkEmailProps } from './MagicLinkEmail'

/** Rend un email React Email en chaîne HTML prête à l'envoi. */
export function renderEmailHtml(element: ReactElement): Promise<string> {
  return render(element)
}
