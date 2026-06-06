// Implémentation de production de l'envoi d'alerte « erreur de sync » (NTF-003).
//
// Rend le composant React Email `SyncErrorEmail` en HTML puis POST sur l'API
// Brevo `/v3/smtp/email`. Best-effort : toute défaillance est avalée (l'alerting
// ne doit jamais faire échouer la sync). La logique pure (seuil 4h, trésoriers,
// nettoyage du message, assemblage payload) vit dans syncErrorAlert.ts ; ce
// module n'est QUE le câblage réseau + rendu, donc non couvert par les tests
// unitaires (qui injectent un faux `sendEmail`).
//
// IMPORT CÔTÉ DENO — choix documenté :
// React Email (`@react-email/render`) et React sont importés via specifier
// `npm:` (résolution npm native de Deno/Edge Runtime), tout comme `zod` et
// `@supabase/supabase-js` dans deno.json. Le composant `SyncErrorEmail.tsx` est
// importé par chemin relatif depuis `packages/data` ; ses imports de tokens
// (`@evolve/design-system`) et de `@react-email/components` se résolvent aussi
// en `npm:`. On NE passe PAS par le barrel `packages/data/src/emails/index.ts`
// (édité en parallèle par d'autres tickets) : import direct du fichier composant.

import { createElement } from 'npm:react@^19'
import { render } from 'npm:@react-email/render@^1'

import { SyncErrorEmail } from '../../../packages/data/src/emails/SyncErrorEmail.tsx'
import { buildBrevoPayload } from './syncErrorAlert.ts'
import type { SendSyncErrorEmail } from './syncErrorAlert.ts'

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

/** Envoi réel : rend le HTML, POST sur Brevo. Best-effort (swallow). */
export const sendSyncErrorEmailBrevo: SendSyncErrorEmail = async (ctx) => {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) return // pas de clé configurée → on n'alerte pas (best-effort).
  try {
    const html = await render(
      createElement(SyncErrorEmail, {
        clubName: ctx.clubName,
        syncTime: ctx.syncTime,
        errorMessage: ctx.errorMessage,
        appUrl: Deno.env.get('APP_URL') ?? undefined,
      })
    )
    const payload = buildBrevoPayload(ctx, html)
    await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Alerting best-effort : on n'interrompt jamais la sync à cause de Brevo.
  }
}
