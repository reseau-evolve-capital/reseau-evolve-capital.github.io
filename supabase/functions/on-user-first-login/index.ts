// Edge Function `on-user-first-login` — email de bienvenue au premier login (NTF-002).
//
// Contrat
// -------
//   POST { user_id }  (ou webhook auth `SIGNED_IN` dont on extrait le user_id)
//     → lit users.welcome_sent
//     → si true : IDEMPOTENT, ne renvoie rien (200 { sent: false, reason: 'already_sent' })
//     → si false : résout memberFirstName (users) + clubName (memberships→clubs),
//                  rend le HTML de WelcomeEmail, POST Brevo /v3/smtp/email,
//                  puis UPDATE users SET welcome_sent = true.
//
// Idempotence
// -----------
//   Garantie par la colonne users.welcome_sent (migration 018). Le drapeau n'est
//   basculé à true qu'APRÈS un envoi Brevo réussi : un échec réseau laisse la
//   porte ouverte pour un retry. Un re-login après succès ne renvoie rien.
//
// Architecture
// ------------
//   La logique vit dans `handler.ts` (`createWelcomeHandler(deps)`, pur, sans I/O
//   concret) — c'est là que portent les tests. Ce fichier n'est QUE l'entrypoint
//   de production : il câble les vraies implémentations Brevo + rendu HTML React
//   Email (imports lourds isolés ici pour ne pas alourdir les tests du handler).
//
// Sécurité : SUPABASE_SERVICE_ROLE_KEY (bypass RLS), strictement côté serveur.

import { createClient } from '@supabase/supabase-js'
import { createElement } from 'npm:react@^19'

import { createWelcomeHandler } from './handler.ts'
import type { BrevoEmailPayload } from './handler.ts'

import { WelcomeEmail } from '../../../packages/data/src/emails/WelcomeEmail.tsx'
import { renderEmailHtml } from '../../../packages/data/src/emails/index.ts'

/** POST l'email transactionnel sur l'API Brevo (`api-key` header). */
async function sendBrevoEmail(payload: BrevoEmailPayload): Promise<void> {
  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  if (apiKey === '') throw new Error('BREVO_API_KEY manquante.')
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Brevo ${res.status}: ${detail}`)
  }
}

/** Rendu réel du composant WelcomeEmail en HTML (React Email). */
function renderWelcomeHtml(args: {
  memberFirstName: string
  clubName: string
  appUrl?: string
}): Promise<string> {
  return renderEmailHtml(createElement(WelcomeEmail, args))
}

// ---- Entrypoint de production ----
if (import.meta.main) {
  Deno.serve(createWelcomeHandler({ createClient, sendBrevoEmail, renderWelcomeHtml }))
}
