// Handler pur de l'Edge Function `on-user-first-login` (NTF-002).
//
// Ce module ne contient AUCUN I/O concret ni import du composant React Email :
// tout passe par `WelcomeDeps`. Il est donc testable en isolation (pas de
// résolution de @evolve/design-system / @react-email côté Deno). L'entrypoint de
// production (`index.ts`) câble les vraies implémentations Brevo + rendu HTML.

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ---- Schéma d'entrée ----
// Accepte un appel direct { user_id } OU un webhook auth dont le payload porte le
// user dans `record.id` ou `user.id` (selon la forme du hook). On normalise.
const bodySchema = z.union([
  z.object({ user_id: z.string().min(1) }),
  z.object({ record: z.object({ id: z.string().min(1) }) }),
  z.object({ user: z.object({ id: z.string().min(1) }) }),
])

function extractUserId(body: z.infer<typeof bodySchema>): string {
  if ('user_id' in body) return body.user_id
  if ('record' in body) return body.record.id
  return body.user.id
}

// ---- Payload Brevo ----
export interface BrevoEmailPayload {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  sender: { email: string; name: string }
}

// ---- Dépendances injectables ----
export interface WelcomeDeps {
  createClient: typeof createClient
  /** Envoie un email transactionnel via l'API Brevo. */
  sendBrevoEmail: (payload: BrevoEmailPayload) => Promise<void>
  /** Rend le HTML de l'email de bienvenue (composant React Email). */
  renderWelcomeHtml: (args: {
    memberFirstName: string
    clubName: string
    appUrl?: string
  }) => Promise<string>
}

// ---- Helpers ----
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Prénom à partir du full_name (1er token) ; fallback géré côté composant. */
function firstNameOf(fullName: string | null): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}

export const BREVO_SUBJECT = 'Bienvenue dans ton club Evolve Capital'

/**
 * Construit le handler HTTP à partir de dépendances injectées.
 * Logique pure : aucune référence directe à l'I/O.
 */
export function createWelcomeHandler(deps: WelcomeDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // 1. Validation / normalisation du corps.
    let userId: string
    try {
      const parsed = bodySchema.safeParse(await req.json())
      if (!parsed.success) {
        return json({ error: 'Corps invalide : { user_id } (ou webhook auth) attendu.' }, 400)
      }
      userId = extractUserId(parsed.data)
    } catch {
      return json({ error: 'Corps JSON illisible.' }, 400)
    }

    // 2. Client service-role (bypass RLS) — jamais exposé au client.
    const supabase: SupabaseClient = deps.createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Lecture de l'utilisateur + drapeau d'idempotence.
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, email, full_name, welcome_sent')
      .eq('id', userId)
      .maybeSingle()
    if (userErr) {
      return json({ error: `Lecture user échouée: ${userErr.message}` }, 500)
    }
    if (!user) {
      return json({ error: `Utilisateur introuvable: ${userId}` }, 404)
    }

    // 4. IDEMPOTENCE — déjà envoyé : on ne renvoie rien.
    if (user.welcome_sent === true) {
      return json({ sent: false, reason: 'already_sent', user_id: userId })
    }

    // 5. Résolution du nom de club (1re adhésion connue via memberships→clubs).
    let clubName = ''
    {
      const { data: membership, error: mErr } = await supabase
        .from('memberships')
        .select('clubs(name)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      if (mErr) {
        return json({ error: `Lecture club échouée: ${mErr.message}` }, 500)
      }
      // La jointure peut être objet ou tableau selon la version du client : on normalise.
      const club = membership?.clubs
      const c = Array.isArray(club) ? club[0] : club
      clubName = (c?.name ?? '').trim()
    }

    const recipient = (user.email ?? '').trim()
    if (recipient === '') {
      return json({ error: `Pas d'email pour l'utilisateur ${userId}.` }, 400)
    }

    // 6. Rendu HTML + envoi Brevo.
    try {
      const htmlContent = await deps.renderWelcomeHtml({
        memberFirstName: firstNameOf(user.full_name),
        clubName,
        appUrl: Deno.env.get('APP_URL') ?? undefined,
      })
      await deps.sendBrevoEmail({
        to: [{ email: recipient, name: (user.full_name ?? '').trim() || undefined }],
        subject: BREVO_SUBJECT,
        htmlContent,
        sender: { email: 'no-reply@evolve.capital', name: 'Evolve Capital' },
      })
    } catch (e) {
      // Envoi raté : on NE bascule PAS welcome_sent → retry possible plus tard.
      return json({ error: `Envoi email échoué: ${errMsg(e)}` }, 502)
    }

    // 7. Bascule du drapeau APRÈS succès (idempotence).
    const { error: updErr } = await supabase
      .from('users')
      .update({ welcome_sent: true })
      .eq('id', userId)
    if (updErr) {
      // L'email est parti mais le drapeau n'a pas pu être posé : on signale (un
      // retry renverrait un doublon — accepté/rare ; à durcir via RPC en V1).
      return json({ sent: true, flagged: false, warning: updErr.message, user_id: userId })
    }

    return json({ sent: true, flagged: true, user_id: userId })
  }
}
