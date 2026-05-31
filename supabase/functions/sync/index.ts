// Edge Function `sync` — ingestion d'une matrice Google Sheets vers Postgres.
//
// Contrat (SHE-006) :
//   POST { club_id }  →  lit clubs.sheet_id  →  importe 6 feuilles dans l'ORDRE IMPÉRATIF
//   PARAMETRAGES → Base → Portefeuille → HISTORIQUE → COTISATIONS → Details cotisations.
//   Chaque feuille : readSheet → parse → map → upsert → snapshot. Aucun parallélisme.
//   Tolérance aux pannes partielles : une feuille en échec n'interrompt pas les suivantes.
//   Idempotence : upserts onConflict (sauf transactions : delete+insert, cf. plus bas).
//
// Sécurité : utilise SUPABASE_SERVICE_ROLE_KEY (bypass RLS), strictement côté serveur.
// Réf : DATA_MODEL §4 (mapping), §5 (cycle de sync), CLAUDE.md (conventions sync).

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { readSheet } from './readSheet.ts'
import { createSnapshot } from './snapshot.ts'
import type { SnapshotStatus } from './snapshot.ts'
import { alertSentry } from './sentry.ts'
import {
  parseParametrages,
  parseBase,
  parsePortefeuille,
  parseHistorique,
  parseCotisations,
} from './sheetParsers.ts'

import { mapParametragesToClub } from '../../../packages/data/src/sheets/mappers/parametrages.mapper.ts'
import { mapBaseRowToMember } from '../../../packages/data/src/sheets/mappers/base.mapper.ts'
import { mapPortefeuilleRows } from '../../../packages/data/src/sheets/mappers/portefeuille.mapper.ts'
import { mapHistoriqueRows } from '../../../packages/data/src/sheets/mappers/historique.mapper.ts'
import { mapCotisationsRows } from '../../../packages/data/src/sheets/mappers/cotisations.mapper.ts'
import { mapDetailsCotisationsRows } from '../../../packages/data/src/sheets/mappers/detailsCotisations.mapper.ts'

import type {
  UserUpsert,
  MembershipUpsert,
  MembershipLookup,
} from '../../../packages/data/src/types/sheets.ts'

// ---- Schéma d'entrée ----
const bodySchema = z.object({ club_id: z.string().min(1) })

// ---- Helpers de réponse ----
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Message d'erreur lisible quelle que soit la valeur catchée. */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Recharge les memberships du club avec le full_name (jointure users) pour les lookups par nom. */
async function loadMembershipLookups(
  supabase: SupabaseClient,
  clubId: string
): Promise<MembershipLookup[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, user_id, users!inner(full_name)')
    .eq('club_id', clubId)
  if (error) throw new Error(`Chargement memberships échoué: ${error.message}`)
  type Row = { id: string; user_id: string; users: { full_name: string } | { full_name: string }[] }
  return (data ?? []).map((r: Row) => {
    // La jointure peut être typée objet ou tableau selon la version du client : on normalise.
    const u = Array.isArray(r.users) ? r.users[0] : r.users
    return { id: r.id, user_id: r.user_id, full_name: u?.full_name ?? '' }
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  const startTime = Date.now()

  // 1. Validation du corps.
  let clubId: string
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: 'Corps invalide : { club_id: string } attendu.' }, 400)
    }
    clubId = parsed.data.club_id
  } catch {
    return json({ error: 'Corps JSON illisible.' }, 400)
  }

  // 2. Client service role (bypass RLS) — jamais exposé côté client.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 3. Résolution du sheet_id du club.
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('sheet_id')
    .eq('id', clubId)
    .maybeSingle()
  if (clubErr) {
    return json({ error: `Lecture du club échouée: ${clubErr.message}` }, 500)
  }
  if (!club) {
    return json({ error: `Club introuvable: ${clubId}` }, 404)
  }
  const sheetId = (club.sheet_id ?? '').trim()
  if (sheetId === '') {
    return json({ error: 'Pas de Google Sheets configuré pour ce club.' }, 400)
  }

  // ---- État de la sync ----
  const syncedSheets: string[] = []
  const errors: string[] = []
  const snapshots: Record<string, { status: SnapshotStatus; checksum: string; row_count: number }> =
    {}

  /** Exécute une feuille en isolant ses erreurs : échec → snapshot failed + errors[], pas d'abort. */
  async function runSheet(sheetName: string, handler: () => Promise<void>): Promise<void> {
    try {
      await handler()
      syncedSheets.push(sheetName)
    } catch (e) {
      const message = errMsg(e)
      errors.push(`${sheetName}: ${message}`)
      // Snapshot d'échec (best-effort — on n'aggrave pas une panne par une 2e exception).
      try {
        snapshots[sheetName] = await createSnapshot(
          supabase,
          clubId,
          sheetName,
          { error: message },
          0,
          'failed',
          message
        )
      } catch {
        // ignore : l'échec de snapshot ne doit pas masquer l'erreur d'origine.
      }
    }
  }

  // ===========================================================================
  // ORDRE IMPÉRATIF — aucune parallélisation (Promise.all interdit ici).
  // ===========================================================================

  // 1) PARAMETRAGES → clubs
  await runSheet('PARAMETRAGES', async () => {
    const raw = await readSheet(sheetId, 'PARAMETRAGES')
    const rows = parseParametrages(raw)
    const clubUpsert = mapParametragesToClub(rows, sheetId)
    const { error } = await supabase
      .from('clubs')
      .upsert({ id: clubId, ...clubUpsert }, { onConflict: 'id' })
    if (error) throw new Error(`upsert clubs: ${error.message}`)
    snapshots['PARAMETRAGES'] = await createSnapshot(
      supabase,
      clubId,
      'PARAMETRAGES',
      raw,
      raw.length,
      'success'
    )
  })

  // 2) Base → users + memberships (feuille ancre, importée en premier)
  await runSheet('Base', async () => {
    const raw = await readSheet(sheetId, 'Base')
    const rows = parseBase(raw)
    const users: UserUpsert[] = []
    const membershipByEmail = new Map<string, MembershipUpsert>()
    const rowErrors: string[] = []
    for (const row of rows) {
      try {
        const { user, membership } = mapBaseRowToMember(row, clubId)
        users.push(user)
        membershipByEmail.set(user.email, membership)
      } catch (e) {
        // Une ligne invalide (email/statut) ne bloque pas l'import des autres.
        rowErrors.push(errMsg(e))
      }
    }
    if (users.length > 0) {
      const { error: uErr } = await supabase.from('users').upsert(users, { onConflict: 'email' })
      if (uErr) throw new Error(`upsert users: ${uErr.message}`)
    }
    // Re-sélection des id par email pour rattacher user_id aux memberships.
    const emails = users.map((u) => u.email)
    const { data: userRows, error: selErr } = await supabase
      .from('users')
      .select('id, email')
      .in('email', emails)
    if (selErr) throw new Error(`select users: ${selErr.message}`)
    const idByEmail = new Map(
      (userRows ?? []).map((u: { id: string; email: string }) => [u.email, u.id])
    )
    const memberships = [...membershipByEmail.entries()]
      .map(([email, m]) => {
        const userId = idByEmail.get(email)
        return userId ? { user_id: userId, ...m } : null
      })
      .filter((m): m is { user_id: string } & MembershipUpsert => m !== null)
    if (memberships.length > 0) {
      const { error: mErr } = await supabase
        .from('memberships')
        .upsert(memberships, { onConflict: 'user_id,club_id' })
      if (mErr) throw new Error(`upsert memberships: ${mErr.message}`)
    }
    // Status partial si des lignes ont été rejetées sans bloquer l'import.
    const status: SnapshotStatus = rowErrors.length > 0 ? 'partial' : 'success'
    if (rowErrors.length > 0) errors.push(`Base (lignes ignorées): ${rowErrors.join(' | ')}`)
    snapshots['Base'] = await createSnapshot(
      supabase,
      clubId,
      'Base',
      raw,
      raw.length,
      status,
      rowErrors.length > 0 ? rowErrors.join(' | ') : null
    )
  })

  // 3) Portefeuille → positions (les lignes d'agrégat vont dans le snapshot, pas dans positions)
  await runSheet('Portefeuille', async () => {
    const raw = await readSheet(sheetId, 'Portefeuille')
    const rows = parsePortefeuille(raw)
    const { positions, aggregateRows } = mapPortefeuilleRows(rows, clubId)
    const synced_at = new Date().toISOString()
    const positionsWithMeta = positions.map((p) => ({ ...p, is_active: true, synced_at }))
    if (positionsWithMeta.length > 0) {
      const { error } = await supabase
        .from('positions')
        .upsert(positionsWithMeta, { onConflict: 'club_id,symbol' })
      if (error) throw new Error(`upsert positions: ${error.message}`)
    }
    // raw_data enrichi : matrice brute + lignes d'agrégat isolées (Provision, Espèces, total…).
    snapshots['Portefeuille'] = await createSnapshot(
      supabase,
      clubId,
      'Portefeuille',
      { rows: raw, aggregateRows },
      raw.length,
      'success'
    )
  })

  // 4) HISTORIQUE → transactions
  // Idempotence : la feuille HISTORIQUE n'a pas de clé naturelle stable par ligne.
  // On purge donc les transactions du club puis on ré-insère l'intégralité (delete+insert).
  // Choix assumé : 2 syncs successives produisent le même état final en DB.
  //
  // LIMITATION CONNUE — fenêtre non atomique : le delete et l'insert sont DEUX
  // round-trips réseau distincts, hors transaction. Si le process meurt entre les
  // deux (timeout, crash, redéploiement de la function), les transactions du club
  // restent VIDES jusqu'à la sync suivante. Auto-cicatrisant : la prochaine sync
  // (~toutes les 2h via pg_cron) ré-insère l'intégralité. Risque accepté en V0.
  // TODO(SHE/OPS): durcir via RPC transactionnelle (BEGIN; DELETE; INSERT; COMMIT) avant la prod.
  await runSheet('HISTORIQUE', async () => {
    const raw = await readSheet(sheetId, 'HISTORIQUE')
    const rows = parseHistorique(raw)
    const transactions = mapHistoriqueRows(rows, clubId)
    const synced_at = new Date().toISOString()
    const { error: delErr } = await supabase.from('transactions').delete().eq('club_id', clubId)
    if (delErr) throw new Error(`delete transactions: ${delErr.message}`)
    if (transactions.length > 0) {
      const { error: insErr } = await supabase
        .from('transactions')
        .insert(transactions.map((t) => ({ ...t, synced_at })))
      if (insErr) throw new Error(`insert transactions: ${insErr.message}`)
    }
    snapshots['HISTORIQUE'] = await createSnapshot(
      supabase,
      clubId,
      'HISTORIQUE',
      raw,
      raw.length,
      'success'
    )
  })

  // 5) COTISATIONS → contributions (lookup membres par full_name)
  await runSheet('COTISATIONS', async () => {
    const memberships = await loadMembershipLookups(supabase, clubId)
    const raw = await readSheet(sheetId, 'COTISATIONS')
    const rows = parseCotisations(raw)
    const { contributions, unmatched, unknownStatuses } = mapCotisationsRows(
      rows,
      clubId,
      memberships
    )
    const synced_at = new Date().toISOString()
    if (contributions.length > 0) {
      const { error } = await supabase.from('contributions').upsert(
        contributions.map((c) => ({ ...c, synced_at })),
        { onConflict: 'membership_id' }
      )
      if (error) throw new Error(`upsert contributions: ${error.message}`)
    }
    const notes: string[] = []
    if (unmatched.length > 0) notes.push(`Membres non résolus: ${unmatched.join(', ')}`)
    if (unknownStatuses.length > 0) notes.push(`Statuts inconnus: ${unknownStatuses.join(', ')}`)
    const status: SnapshotStatus = notes.length > 0 ? 'partial' : 'success'
    snapshots['COTISATIONS'] = await createSnapshot(
      supabase,
      clubId,
      'COTISATIONS',
      raw,
      raw.length,
      status,
      notes.length > 0 ? notes.join(' | ') : null
    )
  })

  // 6) Details cotisations → contribution_months (matrice brute passée directement au mapper)
  await runSheet('Details cotisations', async () => {
    const memberships = await loadMembershipLookups(supabase, clubId)
    const raw = await readSheet(sheetId, 'Details cotisations')
    const { months, unmatched } = mapDetailsCotisationsRows(raw, clubId, memberships, new Date())
    const synced_at = new Date().toISOString()
    if (months.length > 0) {
      const { error } = await supabase.from('contribution_months').upsert(
        months.map((m) => ({ ...m, synced_at })),
        { onConflict: 'membership_id,year,month' }
      )
      if (error) throw new Error(`upsert contribution_months: ${error.message}`)
    }
    const status: SnapshotStatus = unmatched.length > 0 ? 'partial' : 'success'
    snapshots['Details cotisations'] = await createSnapshot(
      supabase,
      clubId,
      'Details cotisations',
      raw,
      raw.length,
      status,
      unmatched.length > 0 ? `En-têtes non résolus: ${unmatched.join(', ')}` : null
    )
  })

  // ===========================================================================
  // Post-sync.
  // ===========================================================================

  // Rafraîchissement de la vue matérialisée.
  // On ne rafraîchit la MV que si TOUTES les feuilles ont réussi : sur une sync
  // partielle, les données sont incohérentes (ex. positions importées mais Base en
  // échec) et recalculer les quote-parts produirait des chiffres faux. On préfère
  // laisser la MV sur son dernier état cohérent et attendre la prochaine sync.
  if (errors.length === 0) {
    try {
      const { error } = await supabase.rpc('refresh_member_quote_part')
      if (error) throw new Error(error.message)
    } catch (e) {
      errors.push(`refresh_member_quote_part: ${errMsg(e)}`)
    }
  }

  // Horodatage de la dernière sync du club.
  // Le client Supabase renvoie les erreurs dans { error } (il ne throw pas) : on
  // déstructure et on remonte dans errors[] pour ne pas masquer un update raté.
  {
    const { error } = await supabase
      .from('clubs')
      .update({ synced_at: new Date().toISOString() })
      .eq('id', clubId)
    if (error) errors.push(`update clubs.synced_at: ${error.message}`)
  }

  // Alerte Sentry si >= 2 erreurs accumulées.
  if (errors.length >= 2) {
    await alertSentry(Deno.env.get('SENTRY_DSN'), {
      club_id: clubId,
      errors,
      sheets: syncedSheets,
    })
  }

  return json({
    success: errors.length === 0,
    club_id: clubId,
    synced_sheets: syncedSheets,
    errors,
    duration_ms: Date.now() - startTime,
    snapshots,
  })
})
