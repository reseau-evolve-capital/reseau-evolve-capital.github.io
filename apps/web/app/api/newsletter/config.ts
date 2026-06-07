// Config server-only du pipeline newsletter (EDI-006). Toutes les valeurs viennent de l'env ;
// aucune n'est exposée au client. Importé uniquement par les routes /api/newsletter/*.

import type { BrevoSender } from '@evolve/data/brevo'

/** Émetteur Brevo de la newsletter (From). Le domaine doit être vérifié SPF/DKIM en prod. */
export function newsletterSender(): BrevoSender {
  return {
    email: (process.env.NEWSLETTER_SENDER_EMAIL ?? 'newsletter@reseauevolvecapital.com').trim(),
    name: (process.env.NEWSLETTER_SENDER_NAME ?? 'Evolve Capital').trim(),
  }
}

/** Destinataires de l'envoi de test (CSV → liste nettoyée, sans doublons vides). */
export function testRecipients(): string[] {
  return (process.env.NEWSLETTER_TEST_RECIPIENTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

/** Id de la liste de diffusion membres Brevo (cible de la campagne). null si absent/invalide. */
export function membersListId(): number | null {
  const raw = (process.env.BREVO_MEMBERS_LIST_ID ?? '').trim()
  if (raw === '') return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}
