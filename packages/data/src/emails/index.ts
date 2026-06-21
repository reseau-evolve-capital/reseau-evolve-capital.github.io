import { render } from '@react-email/render'
import { createElement, type ReactElement } from 'react'
import { PollEmail, type PollEmailProps } from './PollEmail.tsx'

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
export { NewsletterEmail } from './NewsletterEmail.tsx'
export type { NewsletterEmailProps } from './NewsletterEmail.tsx'
export { mapArticleToEmail } from './mappers/article-to-email.ts'
export type { MapArticleOptions } from './mappers/article-to-email.ts'
export { PollEmail } from './PollEmail.tsx'
export type { PollEmailProps, PollEmailVariant, PollEmailLocale } from './PollEmail.tsx'
export { RelanceEmail } from './RelanceEmail.tsx'
export type { RelanceEmailProps } from './RelanceEmail.tsx'

/** Rend un email React Email en chaîne HTML prête à l'envoi. */
export function renderEmailHtml(element: ReactElement): Promise<string> {
  return render(element)
}

/** Rend l'email de vote (opened/closed/reminder) en HTML prêt à l'envoi (Brevo). */
export function renderPollEmailHtml(props: PollEmailProps): Promise<string> {
  return render(createElement(PollEmail, props))
}
