// Edge Function `feedback-dispatch` — entrypoint de production (Feedback Widget V0).
//
// Contrat
// -------
//   POST { record }  (appelé par le trigger Postgres `feedback_after_insert`, migration 036)
//     headers : Authorization: Bearer <service_role_key>
//   → vérifie le Bearer (doit valoir SUPABASE_SERVICE_ROLE_KEY)
//   → instancie le client Supabase service-role (bypass RLS, server-only)
//   → délègue toute la logique au handler PUR (handler.ts) : triage Claude Haiku,
//     UPDATE ai_*, fan-out Discord/Notion/GitHub/Brevo, UPDATE des flags/liens.
//   → 200 { ok: true, result } | 401 si Bearer invalide.
//
// Architecture : ce fichier ne contient QUE le câblage I/O (auth, client Supabase).
// La logique (prompts, parsing JSON Claude, fan-out résilient) vit dans handler.ts,
// testée en isolation (deps injectées). Les imports lourds (`npm:@supabase/supabase-js`)
// sont isolés ici pour ne pas alourdir les tests du handler.
//
// Sécurité : SUPABASE_SERVICE_ROLE_KEY + toutes les clés tierces (ANTHROPIC_API_KEY,
// GITHUB_TOKEN, NOTION_TOKEN, BREVO_API_KEY, DISCORD_FEEDBACK_WEBHOOK_URL) sont
// strictement server-only (Deno.env). Jamais shippées au client, jamais hardcodées.
//
// SECRETS À POSER (par environnement, hors code) :
//   supabase secrets set ANTHROPIC_API_KEY=...           # 1er appel Anthropic du repo
//   supabase secrets set DISCORD_FEEDBACK_WEBHOOK_URL=...
//   supabase secrets set GITHUB_TOKEN=...                # PAT avec scope `repo` (issues)
//   supabase secrets set GITHUB_REPO=omniventus/reseau-evolve-capital
//   supabase secrets set NOTION_TOKEN=...                # integration token
//   supabase secrets set NOTION_FEEDBACK_DB_ID=...       # DB Notion "feedback"
//   # BREVO_API_KEY : déjà posée (Edge Function send-email).
//   # SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY : injectées par la plateforme.

import { createClient } from 'npm:@supabase/supabase-js@^2'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@^2'

import { dispatchFeedback } from './handler.ts'
import type { AiTriage, FeedbackRecord, FeedbackUpdater } from './handler.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Adapte le client Supabase service-role à l'interface FeedbackUpdater du handler. */
function makeUpdater(client: SupabaseClient): FeedbackUpdater {
  return {
    async updateAi(id: string, ai: AiTriage): Promise<void> {
      const { error } = await client
        .from('feedback')
        .update({
          ai_title: ai.title,
          ai_severity: ai.severity,
          ai_summary: ai.summary,
          ai_category: ai.category,
        })
        .eq('id', id)
      if (error) throw new Error(`updateAi: ${error.message}`)
    },
    async updateDestinations(id, fields): Promise<void> {
      const { error } = await client.from('feedback').update(fields).eq('id', id)
      if (error) throw new Error(`updateDestinations: ${error.message}`)
    },
  }
}

if (import.meta.main) {
  Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    // Vérifie l'appel : doit présenter le Bearer service_role (posé par le trigger).
    const auth = req.headers.get('Authorization') ?? ''
    const bearer = auth.replace(/^Bearer\s+/i, '')
    if (serviceKey === '' || bearer !== serviceKey) {
      return json({ error: 'unauthorized' }, 401)
    }

    let body: { record?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'invalid_json' }, 400)
    }
    const record = body.record as FeedbackRecord | undefined
    if (!record || typeof record.id !== 'string' || typeof record.type !== 'string') {
      return json({ error: 'missing_record' }, 400)
    }

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    try {
      const result = await dispatchFeedback(
        {
          env: (name) => Deno.env.get(name),
          fetch,
          updater: makeUpdater(client),
          adminFeedbackUrl: (id) =>
            `${supabaseUrl.replace(/\/$/, '')}/project/_/editor?feedback=${id}`,
        },
        record
      )
      return json({ ok: true, result })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return json({ ok: false, error: message }, 500)
    }
  })
}
