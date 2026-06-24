// Edge Function `migrate-to-operations` — migration legacy → operations (cahier §6.1).
//
// Déclenchement
// -------------
//   POST /functions/v1/migrate-to-operations   Body = { club_id: string }
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//   → 200 { club_id, inserted, skipped, by_type, skipped_invalid? }
//
//   Déclencheur MANUEL network admin uniquement (service-role). N'est JAMAIS appelée par le
//   browser ni en anon. verify_jwt = false (config.toml) : le gateway ne valide pas la clé
//   service-role (non-JWT) → la fonction vérifie ELLE-MÊME que le Bearer == SERVICE_ROLE_KEY,
//   puis utilise SERVICE_ROLE en interne pour lire les tables legacy et écrire `operations`.
//
// LECTURE SEULE sur le legacy (LD-6) : on ne touche jamais contribution_months / transactions /
// positions. Seule écriture = INSERT operations.
//
// IDEMPOTENCE par TUPLE NATUREL (LD-2) : findExistingOperation interroge operations sur
// (club_id, type, operation_date, symbol, quantity, cash_delta) restreint à source='matrice_migration'.
// On n'utilise JAMAIS metadata.original_id (= transactions.id volatil) comme clé.

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import { migrateToOperations } from './handler.ts'
import { alertSentry } from '../_shared/sentry.ts'
import type {
  ContributionRow,
  MigrateDeps,
  NaturalKey,
  OperationInsert,
  TransactionRow,
} from './handler.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Extrait le Bearer de l'en-tête Authorization (ou null). */
function bearer(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

/** Câble les vraies deps sur un client service-role. */
function buildDeps(supabase: SupabaseClient): MigrateDeps {
  return {
    listPaidContributions: async (clubId: string): Promise<ContributionRow[]> => {
      // Cotisations PAYÉES du club, jointes à memberships pour le club-scoping (cahier §6.1).
      const { data, error } = await supabase
        .from('contribution_months')
        .select('id, membership_id, amount, paid_at, year, month, memberships!inner(club_id)')
        .eq('memberships.club_id', clubId)
        .eq('status', 'paid')
        .not('paid_at', 'is', null)
      if (error) throw new Error(`Lecture contribution_months échouée: ${error.message}`)
      return (data ?? []).map((r) => ({
        id: r.id as string,
        membership_id: r.membership_id as string,
        amount: Number(r.amount ?? 0),
        paid_at: r.paid_at as string,
        year: Number(r.year ?? 0),
        month: Number(r.month ?? 0),
      }))
    },

    listTransactions: async (clubId: string): Promise<TransactionRow[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, symbol, name, quantity, price, total, transaction_date')
        .eq('club_id', clubId)
        .not('transaction_date', 'is', null)
      if (error) throw new Error(`Lecture transactions échouée: ${error.message}`)
      return (data ?? []).map((r) => ({
        id: r.id as string,
        type: r.type as string,
        symbol: (r.symbol as string | null) ?? null,
        name: (r.name as string | null) ?? null,
        quantity: r.quantity != null ? Number(r.quantity) : null,
        price: r.price != null ? Number(r.price) : null,
        total: r.total != null ? Number(r.total) : null,
        transaction_date: r.transaction_date as string,
      }))
    },

    findExistingOperation: async (key: NaturalKey): Promise<boolean> => {
      // Tuple naturel, restreint aux ops déjà migrées (source='matrice_migration').
      // .eq ne matche pas NULL en PostgREST → .is() pour symbol/quantity nullables.
      let q = supabase
        .from('operations')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', key.club_id)
        .eq('type', key.type)
        .eq('source', 'matrice_migration')
        .eq('operation_date', key.operation_date)
        .eq('cash_delta', key.cash_delta)
      q = key.symbol == null ? q.is('symbol', null) : q.eq('symbol', key.symbol)
      q = key.quantity == null ? q.is('quantity', null) : q.eq('quantity', key.quantity)
      const { count, error } = await q
      if (error) throw new Error(`Vérif idempotence échouée: ${error.message}`)
      return (count ?? 0) > 0
    },

    insertOperation: async (op: OperationInsert): Promise<void> => {
      const { error } = await supabase.from('operations').insert({
        club_id: op.club_id,
        type: op.type,
        status: op.status,
        cash_delta: op.cash_delta,
        membership_id: op.membership_id,
        symbol: op.symbol,
        asset_name: op.asset_name,
        quantity: op.quantity,
        unit_price: op.unit_price,
        operation_date: op.operation_date,
        source: op.source,
        metadata: op.metadata,
      })
      if (error) throw new Error(`Insert operations échoué: ${error.message}`)
    },

    log: (level, msg, meta) => {
      const line = `[migrate-to-operations] ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`
      if (level === 'error') console.error(line)
      else if (level === 'warn') console.warn(line)
      else console.log(line)
    },
  }
}

// ---- Entrypoint de production ----
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    if (req.method !== 'POST') {
      return json({ ok: false, error: 'Méthode non autorisée' }, 405)
    }

    // Auth : Bearer DOIT être la clé service-role (déclencheur network admin server-side).
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const token = bearer(req)
    if (serviceKey === '' || token !== serviceKey) {
      return json({ ok: false, error: 'Non autorisé' }, 401)
    }

    let clubId: string | null = null
    try {
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
      if (body && typeof body.club_id === 'string' && body.club_id.trim() !== '') {
        clubId = body.club_id
      }
    } catch {
      clubId = null
    }
    if (!clubId) {
      return json({ ok: false, error: 'club_id requis' }, 400)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)

    try {
      const deps = buildDeps(supabase)
      const result = await migrateToOperations(deps, clubId)
      return json({ ok: true, ...result })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const dsn = Deno.env.get('SENTRY_DSN')
      await alertSentry(dsn, {
        club_id: clubId,
        errors: [message],
        sheets: ['migrate-to-operations'],
      }).catch(() => {})
      return json({ ok: false, error: message }, 500)
    }
  })
}

export { buildDeps, bearer }
