// Edge Function `sync` — ingestion d'une matrice Google Sheets vers Postgres.
//
// Contrat (SHE-006, étendu DSH-011) :
//   POST { club_id }  →  lit clubs.sheet_id  →  importe 7 feuilles dans l'ORDRE IMPÉRATIF
//   PARAMETRAGES → Base → Portefeuille → REPORTING → HISTORIQUE → COTISATIONS → Details cotisations.
//   REPORTING est OPTIONNELLE (enrichissante) : son échec ne produit que des warnings,
//   jamais d'erreur dure (success reste true). Les 6 autres feuilles sont bloquantes.
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
import type { readSheet as ReadSheetFn } from './readSheet.ts'
import { createSnapshot } from './snapshot.ts'
import type { SnapshotStatus } from './snapshot.ts'
import { alertSentry } from './sentry.ts'
import { maybeSendSyncErrorAlert } from './syncErrorAlert.ts'
import type { SendSyncErrorEmail } from './syncErrorAlert.ts'
import {
  parseParametrages,
  parseBase,
  parsePortefeuille,
  parseReporting,
  parseHistorique,
  parseCotisations,
} from './sheetParsers.ts'

import {
  mapParametragesToClub,
  mapParametragesToOfficers,
  stripEmptyClubMeta,
} from '../../../packages/data/src/sheets/mappers/parametrages.mapper.ts'
import type { ClubOfficers } from '../../../packages/data/src/sheets/mappers/parametrages.mapper.ts'
import { normalizeName } from '../../../packages/data/src/sheets/normalizeName.ts'
import { mapBaseRowToMember } from '../../../packages/data/src/sheets/mappers/base.mapper.ts'
import { resolveBaseEmail } from '../../../packages/data/src/sheets/mappers/baseEmailResolution.ts'
import {
  mapPortefeuilleRows,
  mapAggregateRows,
} from '../../../packages/data/src/sheets/mappers/portefeuille.mapper.ts'
import { mapReportingRows } from '../../../packages/data/src/sheets/mappers/reporting.mapper.ts'
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

// ---- Injection de dépendances (SHE-008) ----
// Le handler est exposé via une factory `createSyncHandler` pour permettre de
// stubber `createClient` (client Supabase) et `readSheet` (lecture Google Sheets)
// dans les tests. L'entrypoint de production câble les vraies implémentations.
// Aucune logique métier ne change : pur point d'injection (seam extraction).
export interface SyncDeps {
  createClient: typeof createClient
  readSheet: typeof ReadSheetFn
  /**
   * Envoi de l'alerte email « erreur de sync » aux trésoriers (NTF-003).
   * Injecté pour tester le seuil anti-spam 4h SANS réseau ni rendu React Email.
   * L'entrypoint de production câble la vraie implémentation (rendu + POST Brevo).
   */
  sendSyncErrorEmail: SendSyncErrorEmail
}

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

/**
 * Alerte Discord best-effort sur erreur DURE de sync (incident GOOGLEFINANCE 2026-06-14).
 * POST le contenu sur le webhook `SYNC_ALERT_DISCORD_WEBHOOK_URL`. Comme tout l'alerting
 * de cette fonction : ne throw JAMAIS et n'interrompt jamais la sync (webhook absent =
 * no-op silencieux). Le mail trésorier/président reste géré par maybeSendSyncErrorAlert.
 */
export async function notifyDiscordSyncError(
  webhookUrl: string | undefined,
  clubId: string,
  errors: string[]
): Promise<void> {
  if (!webhookUrl) return
  try {
    const content =
      `🔴 **Sync Evolve Capital — erreur**\nClub \`${clubId}\`\n` +
      errors
        .map((e) => `• ${e}`)
        .join('\n')
        .slice(0, 1800)
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  } catch {
    // Alerting best-effort : un webhook KO n'interrompt jamais la sync.
  }
}

/** Recharge les memberships du club avec le full_name (jointure users) pour les lookups par nom. */
async function loadMembershipLookups(
  supabase: SupabaseClient,
  clubId: string
): Promise<MembershipLookup[]> {
  // Désambiguïsation : memberships a DEUX FK vers users (user_id et locked_by,
  // cf. ADM-007). On qualifie l'embed par le nom de la contrainte du user_id pour
  // lever l'erreur PostgREST « more than one relationship was found ».
  // On charge aussi email + email_is_placeholder du user : la résolution Base
  // (resolveBaseEmail) en a besoin pour réutiliser l'email existant sans l'écraser
  // quand la feuille est vide. Les lookups cotisations ignorent simplement ces champs.
  const { data, error } = await supabase
    .from('memberships')
    .select(
      'id, user_id, users!memberships_user_id_fkey!inner(full_name, email, email_is_placeholder)'
    )
    .eq('club_id', clubId)
  if (error) throw new Error(`Chargement memberships échoué: ${error.message}`)
  type UserEmbed = { full_name: string; email: string | null; email_is_placeholder: boolean }
  type Row = { id: string; user_id: string; users: UserEmbed | UserEmbed[] }
  return (data ?? []).map((r: Row) => {
    // La jointure peut être typée objet ou tableau selon la version du client : on normalise.
    const u = Array.isArray(r.users) ? r.users[0] : r.users
    return {
      id: r.id,
      user_id: r.user_id,
      full_name: u?.full_name ?? '',
      email: u?.email ?? null,
      email_is_placeholder: u?.email_is_placeholder ?? false,
    }
  })
}

/**
 * Construit le handler HTTP de la fonction `sync` à partir de dépendances injectées.
 * Le corps est identique à l'ancien handler `Deno.serve` : seules les références
 * directes à `createClient`/`readSheet` passent par `deps`. Comportement runtime
 * inchangé (ordre, statuts, snapshots, onConflict, forme de réponse).
 */
export function createSyncHandler(deps: SyncDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
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
    const supabase = deps.createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Résolution du sheet_id du club + garde « club désactivé » (NET-018).
    const { data: club, error: clubErr } = await supabase
      .from('clubs')
      .select('sheet_id, is_active')
      .eq('id', clubId)
      .maybeSingle()
    if (clubErr) {
      return json({ error: `Lecture du club échouée: ${clubErr.message}` }, 500)
    }
    if (!club) {
      return json({ error: `Club introuvable: ${clubId}` }, 404)
    }

    // GARDE CLUB DÉSACTIVÉ (NET-018) — anti « sync zombie » : un club soft-désactivé par un
    // network_admin (clubs.is_active = false) ne doit JAMAIS être ré-importé tant qu'il n'est pas
    // réactivé, sinon le cron ressusciterait des données qu'on a volontairement rendues invisibles
    // à ses membres (la RLS les masque déjà via get_user_club_ids, migration 050). On REFUSE
    // proprement : 200 + success=true + `skipped: 'club_disabled'`, AUCUNE écriture, AUCUN snapshot.
    // success=true volontaire : le cron qui itère les clubs ne doit pas compter ce refus comme un
    // échec global (pas d'alerte trésorier/Discord pour une désactivation voulue).
    if (club.is_active === false) {
      return json({
        success: true,
        club_id: clubId,
        skipped: 'club_disabled',
        synced_sheets: [],
        errors: [],
        warnings: ['Club désactivé : synchronisation ignorée (NET-018).'],
        duration_ms: Date.now() - startTime,
        snapshots: {},
      })
    }

    const sheetId = (club.sheet_id ?? '').trim()
    if (sheetId === '') {
      return json({ error: 'Pas de Google Sheets configuré pour ce club.' }, 400)
    }

    // ---- État de la sync ----
    // DEUX CANAUX DISTINCTS — distinction DURE vs MOLLE (SHE-006) :
    //   errors[]   = échecs DURS d'une feuille : exception throw par readSheet/mapper,
    //                ou écriture Supabase renvoyant { error }. La feuille n'a PAS importé.
    //                Snapshot 'failed'. Bloque le refresh de la MV.
    //   warnings[] = anomalies MOLLES et récupérables : lignes en quarantaine (champ
    //                requis NULL écarté), membres non résolus, statuts inconnus. La feuille
    //                A importé (moins les lignes fautives). Snapshot 'partial'. Ces notes
    //                vont aussi dans le snapshot.error_message, mais PAS dans errors[] :
    //                elles ne doivent ni faire success=false ni bloquer le refresh de la MV
    //                (une Sheet réelle a presque toujours quelques lignes sales).
    const syncedSheets: string[] = []
    const errors: string[] = []
    const warnings: string[] = []
    // GARDE-FOU VALORISATION (incident GOOGLEFINANCE 2026-06-14) — drapeau partagé entre
    // l'étape Portefeuille (DÉTECTION du collapse) et l'étape COTISATIONS (PRÉSERVATION de
    // net_market_value). Quand les cours live (GOOGLEFINANCE) sont transitoirement vides
    // dans la feuille, la valo des positions tombe à 0, le total portefeuille s'effondre et
    // les formules « Valeur Boursière nette » des membres (= détention × total) s'effondrent
    // dans la même proportion. On REFUSE alors d'écrire ces valeurs (on conserve la dernière
    // valeur saine en base) et on escalade en erreur DURE pour alerter trésorier + président.
    let valuationUntrusted = false
    // Dirigeants extraits de PARAMETRAGES (capturés à l'étape 1) — consommés APRÈS l'import
    // Base par la réconciliation des rôles. Vide par défaut : si PARAMETRAGES échoue, la
    // réconciliation ne touche aucun rôle (les memberships restent tous 'member').
    let officers: ClubOfficers = { presidentName: null, treasurerName: null }
    const snapshots: Record<
      string,
      { status: SnapshotStatus; checksum: string; row_count: number }
    > = {}

    /** Exécute une feuille en isolant ses erreurs DURES : exception → snapshot failed + errors[], pas d'abort. */
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

    /**
     * Exécute une feuille OPTIONNELLE (enrichissante) — même structure que runSheet,
     * mais TOUTE exception devient un warning MOLLE, JAMAIS une entrée errors[].
     * DISTINCTION : une feuille BLOQUANTE (runSheet) porte des données vitales — son
     * échec doit faire success=false et déclencher les alertes (Sentry, email trésoriers).
     * Une feuille ENRICHISSANTE (ex. REPORTING, série historique du dashboard) ne doit
     * ni faire échouer le run ni alerter : onglet absent, plage illisible ou table non
     * migrée → la sync des 6 feuilles vitales reste un succès. Snapshot 'failed'
     * best-effort pour l'audit, puis on continue.
     */
    async function runOptionalSheet(
      sheetName: string,
      handler: () => Promise<void>
    ): Promise<void> {
      try {
        await handler()
        syncedSheets.push(sheetName)
      } catch (e) {
        const message = errMsg(e)
        // MOLLE uniquement : jamais errors[] pour une feuille optionnelle.
        warnings.push(`${sheetName} (optionnelle): ${message}`)
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
          // ignore : l'échec de snapshot ne doit pas masquer l'anomalie d'origine.
        }
      }
    }

    // ===========================================================================
    // ORDRE IMPÉRATIF — aucune parallélisation (Promise.all interdit ici).
    // ===========================================================================

    // 1) PARAMETRAGES → clubs
    await runSheet('PARAMETRAGES', async () => {
      const raw = await deps.readSheet(sheetId, 'PARAMETRAGES')
      const rows = parseParametrages(raw)
      const clubUpsert = mapParametragesToClub(rows, sheetId)
      // Capture des dirigeants pour la réconciliation des rôles (étape post-Base).
      officers = mapParametragesToOfficers(rows)
      // Le club EXISTE toujours quand la sync tourne (créé en amont par le réseau via le wizard,
      // ou itéré par le cron sur les clubs ayant un sheet_id) → on fait un UPDATE, pas un upsert.
      // Pourquoi pas `upsert(onConflict:'id')` : Postgres tente d'ABORD l'INSERT avec les colonnes
      // fournies ; sans `slug` (NOT NULL) il échoue AVANT la résolution ON CONFLICT. Et AVEC le
      // slug dérivé du « Nom du club », la branche DO UPDATE l'écraserait → collision clubs_slug_key
      // si ce slug est déjà pris par un autre club. L'UPDATE ne touche donc JAMAIS le slug
      // (identité applicative fixée à la création) ; il met à jour le reste (nom, ville, plafond…).
      const { slug: _slugIgnored, ...clubUpdateAll } = clubUpsert
      // Option A (anti-écrasement) : la feuille ne fait pas autorité sur ville/pays. Si elle ne
      // les fournit pas (colonnes absentes → null), on NE réécrit PAS ces colonnes pour ne pas
      // null-ifier la valeur saisie à la création du club. cf. stripEmptyClubMeta + bug ville vide.
      const clubUpdate = stripEmptyClubMeta(clubUpdateAll)
      const { error } = await supabase.from('clubs').update(clubUpdate).eq('id', clubId)
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
      const raw = await deps.readSheet(sheetId, 'Base')
      const rows = parseBase(raw)
      // RÈGLE — « l'email n'est réécrit QUE si la feuille fournit un email non vide ».
      // On charge l'état DB AVANT de construire les upserts : pour une ligne sans email en
      // source, resolveBaseEmail réutilise l'email ACTUEL du membre (placeholder OU vrai email
      // saisi par l'admin) comme clé onConflict — l'email n'est jamais écrasé, pas de doublon.
      const existingMemberships = await loadMembershipLookups(supabase, clubId)
      const users: UserUpsert[] = []
      const membershipByEmail = new Map<string, MembershipUpsert>()
      const rowErrors: string[] = []
      for (const row of rows) {
        try {
          const { user, membership, sheetEmailEmpty } = mapBaseRowToMember(row, clubId)
          // Résolution DB-aware : feuille vide → email existant réutilisé (non écrasé) ;
          // homonymes → repli placeholder + warning ; nouveau → placeholder.
          const resolved = resolveBaseEmail(user, sheetEmailEmpty, existingMemberships)
          if (resolved.warning) warnings.push(`Base: ${resolved.warning}`)
          user.email = resolved.email
          user.email_is_placeholder = resolved.email_is_placeholder
          users.push(user)
          membershipByEmail.set(user.email, membership)
        } catch (e) {
          // Une ligne au statut inconnu ne bloque pas l'import des autres. Depuis
          // migration 026, l'email VIDE ne throw plus (placeholder déterministe) :
          // seul un statut non reconnu ("Membre actif"/"Membre sorti") atterrit ici.
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
      // QUARANTAINE — memberships.joined_at est NOT NULL en DB (migration 004). Une
      // adhésion sans date d'entrée est l'anomalie : on l'écarte AVANT l'upsert pour ne
      // pas faire crasher l'insert. Les users restent TOUS upsertés (y compris ceux sans
      // email, via placeholder déterministe depuis migration 026) : aucune perte de membre.
      const validMemberships = memberships.filter((m) => m.joined_at != null)
      const droppedMembers = memberships
        .filter((m) => m.joined_at == null)
        .map((m) => {
          const u = users.find((x) => idByEmail.get(x.email) === m.user_id)
          return u?.full_name ?? m.user_id
        })
      if (validMemberships.length > 0) {
        const { error: mErr } = await supabase
          .from('memberships')
          .upsert(validMemberships, { onConflict: 'user_id,club_id' })
        if (mErr) throw new Error(`upsert memberships: ${mErr.message}`)
      }
      // Status partial si des lignes ont été rejetées (mapper) ou des memberships écartés.
      const notes: string[] = []
      if (rowErrors.length > 0) notes.push(rowErrors.join(' | '))
      if (droppedMembers.length > 0) {
        notes.push(
          `${droppedMembers.length} adhésion(s) ignorée(s) : date d'entrée absente (${droppedMembers.join(
            ', '
          )})`
        )
      }
      // MOLLE : lignes rejetées / adhésions écartées → warnings[] (la feuille a importé).
      const status: SnapshotStatus = notes.length > 0 ? 'partial' : 'success'
      if (notes.length > 0) warnings.push(`Base (lignes ignorées): ${notes.join(' | ')}`)
      snapshots['Base'] = await createSnapshot(
        supabase,
        clubId,
        'Base',
        raw,
        raw.length,
        status,
        notes.length > 0 ? notes.join(' | ') : null
      )
    })

    // 2bis) RÉCONCILIATION DES RÔLES — dérive president/treasurer depuis PARAMETRAGES.
    // ---------------------------------------------------------------------------
    // POURQUOI ICI : l'import Base (étape 2) vient d'upserter TOUS les memberships avec
    // role='member' (cf. base.mapper). PARAMETRAGES (étape 1) liste les dirigeants par nom.
    // On rapproche les noms (normalisés) des dirigeants vers users.full_name pour promouvoir
    // le bon membership. La Base étant importée AVANT, les memberships existent déjà.
    //
    // IDEMPOTENCE : l'upsert Base ne touche PLUS le rôle (préservé sur update). C'est ici la
    // seule autorité de gouvernance : SI au moins un dirigeant est résolu depuis PARAMETRAGES,
    // on réinitialise tout president/treasurer du club à 'member' puis on re-promeut les
    // dirigeants courants. Un ex-dirigeant disparu de PARAMETRAGES redevient donc 'member',
    // un membre normal reste 'member'. Re-sync = mêmes rôles.
    //
    // FAIL-SAFE : si AUCUN dirigeant n'est résolu (PARAMETRAGES vide/malformée), on ne réinitialise
    // RIEN — on ne wipe jamais le staff sur une source absente.
    //
    // SÉCURITÉ : le reset ne porte QUE sur president/treasurer (`.in('role', [...])`) — un
    // 'network_admin' (rôle global hors PARAMETRAGES, qu'il soit ou non membre de la feuille
    // Base) n'est JAMAIS rétrogradé. La promotion garde aussi `.neq('role','network_admin')`.
    //
    // ROBUSTESSE : best-effort. Un nom introuvable → warning (jamais errors[], pour ne pas
    // bloquer le refresh de la MV ni faire success=false). Une exception inattendue est
    // capturée et transformée en warning : la cohérence des rôles ne doit pas casser la sync.
    if (errors.length === 0 || syncedSheets.includes('Base')) {
      try {
        const lookups = await loadMembershipLookups(supabase, clubId)
        // Index nom normalisé → membership_id. En cas d'homonymes (même full_name
        // normalisé), le dernier gagne : cas non géré finement en V0 (warning si ambigu).
        const byName = new Map<string, string>()
        const ambiguous = new Set<string>()
        for (const m of lookups) {
          const key = normalizeName(m.full_name)
          if (key === '') continue
          if (byName.has(key)) ambiguous.add(key)
          byName.set(key, m.id)
        }

        // Cibles depuis PARAMETRAGES (source de vérité gouvernance).
        const targets: Array<{ role: 'president' | 'treasurer'; name: string }> = []
        if (officers.presidentName)
          targets.push({ role: 'president', name: officers.presidentName })
        if (officers.treasurerName)
          targets.push({ role: 'treasurer', name: officers.treasurerName })

        // Résolution nom → membership. Introuvables/ambigus → warning (best-effort, jamais bloquant).
        const matched: Array<{ id: string; role: 'president' | 'treasurer' }> = []
        for (const t of targets) {
          const key = normalizeName(t.name)
          const membershipId = byName.get(key)
          if (!membershipId) {
            warnings.push(
              `Rôles: ${t.role} introuvable pour "${t.name}" (aucun membre ne correspond).`
            )
            continue
          }
          if (ambiguous.has(key)) {
            warnings.push(
              `Rôles: "${t.name}" est ambigu (homonymes) — ${t.role} appliqué au dernier membre trouvé.`
            )
          }
          matched.push({ id: membershipId, role: t.role })
        }

        // RÉTROGRADATION fail-safe : on ne réinitialise les rôles dirigeants QUE si au moins un
        // dirigeant courant a été identifié (PARAMETRAGES exploitable). Si AUCUN n'est résolu
        // (feuille vide/malformée), on NE TOUCHE À RIEN — jamais de wipe du staff sur source
        // absente. On ne rétrograde QUE president/treasurer ; network_admin et member intacts.
        // ANTI-ÉCRASEMENT (ADM-008) : un rôle défini EN APP (role_source='manual') n'est JAMAIS
        // réécrit par la sync — ni rétrogradé au reset, ni promu. Les gardes `.neq('role_source',
        // 'manual')` ci-dessous laissent ces memberships intactes. PostgREST traite NULL (colonne
        // absente sur un env antérieur à la migration 052) comme « non égal à 'manual' » → la garde
        // est rétro-compatible : sans la colonne, le comportement historique (tout 'sheet') tient.
        if (matched.length > 0) {
          const { error: resetErr } = await supabase
            .from('memberships')
            .update({ role: 'member' })
            .eq('club_id', clubId)
            .in('role', ['president', 'treasurer'])
            .neq('role_source', 'manual')
          if (resetErr) {
            warnings.push(`Rôles: échec réinitialisation des dirigeants: ${resetErr.message}`)
          }
        }

        // PROMOTION des dirigeants courants (jamais sur un network_admin : garde .neq ; jamais sur
        // un rôle manuel : garde .neq role_source). Un membership figé en app conserve son rôle même
        // si PARAMETRAGES le mentionne — l'app est désormais l'autorité pour les rôles 'manual'.
        for (const m of matched) {
          const { error: roleErr } = await supabase
            .from('memberships')
            .update({ role: m.role })
            .eq('id', m.id)
            .neq('role', 'network_admin')
            .neq('role_source', 'manual')
          if (roleErr) {
            warnings.push(`Rôles: échec MAJ ${m.role} (membership ${m.id}): ${roleErr.message}`)
          }
        }
      } catch (e) {
        // Best-effort : aucune exception ne doit faire échouer la sync.
        warnings.push(`Rôles: réconciliation ignorée (${errMsg(e)}).`)
      }
    }

    // 3) Portefeuille → positions (les lignes d'agrégat vont dans le snapshot, pas dans positions)
    await runSheet('Portefeuille', async () => {
      // Onglet réel de la matrice : « POSITIONS » (l'étiquette de snapshot reste « Portefeuille »).
      const raw = await deps.readSheet(sheetId, 'POSITIONS')
      const rows = parsePortefeuille(raw)
      const { positions, aggregateRows } = mapPortefeuilleRows(rows, clubId)
      // QUARANTAINE — positions.quantity est NOT NULL en DB (migration 005). Le mapper
      // émet null sur une quantité illisible : on écarte ces lignes AVANT l'upsert pour
      // ne pas faire crasher l'insert (design tolérant : snapshot partiel, on continue).
      const validPositions = positions.filter((p) => p.quantity != null)
      const droppedPositions = positions.filter((p) => p.quantity == null)
      const synced_at = new Date().toISOString()

      // ---- GARDE-FOU VALORISATION (incident GOOGLEFINANCE 2026-06-14) ----
      // Signature du collapse : une position a une quantité MAIS aucune valeur boursière
      // (cours « Cours en € » vide/#N/A → market_value null/0). En régime normal, toutes
      // les positions détenues ont une valo > 0. On corrobore par la MAGNITUDE : le nouveau
      // total « Portefeuille » chute > 50 % vs la dernière valeur SAINE persistée (un vrai
      // krach en 2h garde des cours, donc ne déclenche PAS unpriced ; seul un cours manquant
      // le fait). Si suspect → on n'écrase NI positions, NI agrégats, NI net_market_value :
      // on garde la dernière valeur saine en base, et on escalade en erreur DURE (alerte).
      const aggregatesMapped = mapAggregateRows(aggregateRows, clubId)
      const newTotal =
        aggregatesMapped.find((a) => a.label.trim().toLowerCase() === 'portefeuille')
          ?.market_value ?? null
      const unpriced = validPositions.filter(
        (p) => (p.quantity ?? 0) > 0 && (p.market_value == null || p.market_value === 0)
      )
      let lastGoodTotal: number | null = null
      {
        const { data: prevAgg } = await supabase
          .from('portfolio_aggregates')
          .select('market_value')
          .eq('club_id', clubId)
          .eq('label', 'Portefeuille')
          .maybeSingle()
        const mv = (prevAgg as { market_value?: number | null } | null)?.market_value
        lastGoodTotal = mv == null ? null : Number(mv)
      }
      // On exige une BASELINE saine (dernière valeur « Portefeuille » persistée > 0) pour juger :
      // sans historique (1er sync, club neuf) on ne peut pas détecter un collapse → on laisse
      // passer. Trip si le total chute > 50 % vs baseline, OU si le total a disparu alors que des
      // positions n'ont plus de cours (signature GOOGLEFINANCE). `unpriced` enrichit l'alerte.
      // Le seuil 50 % est volontairement large : un vrai krach garde des cours (donc baisse
      // < 50 % entre 2 syncs de 2h), tandis qu'un trou de cours fait chuter le total bien plus.
      const haveBaseline = lastGoodTotal != null && lastGoodTotal > 0
      const collapseByMagnitude = haveBaseline && newTotal != null && newTotal < 0.5 * lastGoodTotal
      const totalVanished = haveBaseline && newTotal == null && unpriced.length > 0
      valuationUntrusted = collapseByMagnitude || totalVanished

      let status: SnapshotStatus
      let note: string | null
      if (valuationUntrusted) {
        // ON N'ÉCRIT RIEN (positions/agrégats) : la dernière valeur saine en base est conservée.
        const reason =
          `Valorisation REJETÉE (effondrement détecté, données conservées) : total ` +
          `${newTotal ?? '—'} € vs ${lastGoodTotal ?? '—'} € au dernier sync sain ; ` +
          `${unpriced.length} position(s) sans cours [${unpriced.map((p) => p.symbol).join(', ')}]. ` +
          `Cause probable : GOOGLEFINANCE transitoire. Vérifier les cellules « Cours en € » ` +
          `de la feuille POSITIONS, puis relancer la sync.`
        // DURE : escalade dans errors[] → success=false + alerte trésorier/président + Discord.
        errors.push(`Portefeuille: ${reason}`)
        status = 'partial'
        note = reason
      } else {
        const positionsWithMeta = validPositions.map((p) => ({ ...p, is_active: true, synced_at }))
        if (positionsWithMeta.length > 0) {
          const { error } = await supabase
            .from('positions')
            .upsert(positionsWithMeta, { onConflict: 'club_id,symbol' })
          if (error) throw new Error(`upsert positions: ${error.message}`)
        }
        // RÉCONCILIATION — désactive les positions FANTÔMES : celles présentes en base mais
        // ABSENTES de la matrice courante. Les lignes vivantes viennent d'être (ré)upsertées
        // avec ce `synced_at` (constant du run) ; toute position du club encore active avec un
        // synced_at ANTÉRIEUR n'a pas été revue → on la désactive (is_active=false) plutôt que
        // de la supprimer (on conserve l'historique). Idempotent : un re-sync ne réactive rien.
        // La lecture portfolio filtre déjà .eq('is_active', true) → les fantômes disparaissent.
        {
          const { error: deactErr } = await supabase
            .from('positions')
            .update({ is_active: false })
            .eq('club_id', clubId)
            .eq('is_active', true)
            .lt('synced_at', synced_at)
          if (deactErr) throw new Error(`deactivate positions: ${deactErr.message}`)
        }
        // AGRÉGATS (C2) — persiste les lignes à symbole vide (« Portefeuille », « Provision »,
        // « Solde : … ») dans portfolio_aggregates pour que l'app lise le TOTAL et les soldes par
        // label. Même logique de réconciliation que les positions : upsert par (club_id, label) avec
        // ce synced_at, puis désactivation des labels au synced_at antérieur (absents de la matrice).
        // Matching TOUJOURS par label (jamais par index).
        {
          const aggregates = aggregatesMapped.map((a) => ({
            ...a,
            is_active: true,
            synced_at,
          }))
          if (aggregates.length > 0) {
            const { error: aggErr } = await supabase
              .from('portfolio_aggregates')
              .upsert(aggregates, { onConflict: 'club_id,label' })
            if (aggErr) throw new Error(`upsert portfolio_aggregates: ${aggErr.message}`)
          }
          const { error: aggDeactErr } = await supabase
            .from('portfolio_aggregates')
            .update({ is_active: false })
            .eq('club_id', clubId)
            .eq('is_active', true)
            .lt('synced_at', synced_at)
          if (aggDeactErr)
            throw new Error(`deactivate portfolio_aggregates: ${aggDeactErr.message}`)
        }
        status = droppedPositions.length > 0 ? 'partial' : 'success'
        note =
          droppedPositions.length > 0
            ? `${droppedPositions.length} position(s) ignorée(s) : quantité illisible (${droppedPositions
                .map((p) => p.symbol)
                .join(', ')})`
            : null
        // MOLLE : positions à quantité illisible écartées → warnings[] (la feuille a importé).
        if (note) warnings.push(`Portefeuille (lignes ignorées): ${note}`)
      }
      // raw_data enrichi : matrice brute + lignes d'agrégat isolées (Provision, Espèces, total…).
      snapshots['Portefeuille'] = await createSnapshot(
        supabase,
        clubId,
        'Portefeuille',
        { rows: raw, aggregateRows },
        raw.length,
        status,
        note
      )
    })

    // 3bis) REPORTING → club_reporting_daily (feuille OPTIONNELLE/enrichissante, DSH-011)
    // Série quotidienne (~2 900+ lignes depuis 2018) pour le graphe d'évolution du
    // dashboard. RÈGLE D'OR : aucun scénario REPORTING ne fait success=false ni ne
    // crashe le run — tout échec part dans warnings[] (cf. runOptionalSheet).
    await runOptionalSheet('REPORTING', async () => {
      // Plage explicite A1:E10000 : la série dépasse le défaut A1:AZ2000 de readSheet
      // (qui la tronquerait silencieusement) ; seules les colonnes A–E sont utiles.
      const raw = await deps.readSheet(sheetId, 'REPORTING', 'A1:E10000')
      const rows = parseReporting(raw)
      // Un SEUL horodatage pour tout le run REPORTING (cohérence des ~2 900 lignes).
      const synced_at = new Date().toISOString()
      const { upserts, skipped } = mapReportingRows(rows, clubId, synced_at)

      // Feuille vide / aucune ligne exploitable : warning MOLLE + snapshot 'partial',
      // return SANS exception (une absence de données n'est pas un échec de feuille).
      if (upserts.length === 0) {
        const emptyNote = 'feuille REPORTING vide ou sans lignes exploitables'
        warnings.push(`REPORTING (optionnelle): ${emptyNote}`)
        try {
          snapshots['REPORTING'] = await createSnapshot(
            supabase,
            clubId,
            'REPORTING',
            raw,
            raw.length,
            'partial',
            emptyNote
          )
        } catch {
          // best-effort : un snapshot raté n'aggrave pas le cas.
        }
        return
      }

      // Upsert par paquets de 500 (la série complète serait un POST trop volumineux).
      // Idempotence : onConflict (club_id, report_date) — cf. migration 034.
      const BATCH_SIZE = 500
      let upsertedCount = 0
      for (let i = 0; i < upserts.length; i += BATCH_SIZE) {
        const batch = upserts.slice(i, i + BATCH_SIZE)
        const { error } = await supabase
          .from('club_reporting_daily')
          .upsert(batch, { onConflict: 'club_id,report_date' })
        if (error) {
          if (error.code === '42P01') {
            // Table absente (migration 034 non déployée sur cet environnement) :
            // inutile d'insister sur les paquets restants — warning explicite,
            // snapshot 'failed' best-effort, return PROPRE (jamais de throw).
            const missingNote =
              'table club_reporting_daily absente (migration 034 non déployée) — import ignoré'
            warnings.push(`REPORTING (optionnelle): ${missingNote}`)
            try {
              snapshots['REPORTING'] = await createSnapshot(
                supabase,
                clubId,
                'REPORTING',
                raw,
                raw.length,
                'failed',
                missingNote
              )
            } catch {
              // best-effort.
            }
            return
          }
          // Autre erreur : ce paquet est perdu mais les précédents restent acquis
          // (idempotence : la prochaine sync les re-tentera). On continue.
          warnings.push(
            `REPORTING (optionnelle): échec upsert paquet ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`
          )
          continue
        }
        upsertedCount += batch.length
      }

      // MOLLE : lignes en quarantaine (date illisible, B/C manquant ou négatif) →
      // warnings[] (pattern Portefeuille). Raisons tronquées aux 10 premières pour ne
      // pas générer un warning pathologique sur une feuille massivement malformée.
      const MAX_SKIPPED_SHOWN = 10
      const skippedNote =
        skipped.length > 0
          ? `${skipped.length} ligne(s) en quarantaine: ${skipped
              .slice(0, MAX_SKIPPED_SHOWN)
              .join(' | ')}${skipped.length > MAX_SKIPPED_SHOWN ? ' | …' : ''}`
          : null
      const status: SnapshotStatus = skippedNote ? 'partial' : 'success'
      if (skippedNote) warnings.push(`REPORTING (lignes ignorées): ${skippedNote}`)
      // Snapshot best-effort (try/catch) : contrairement aux feuilles bloquantes, un
      // échec de snapshot ne doit pas requalifier la feuille optionnelle en échec.
      try {
        snapshots['REPORTING'] = await createSnapshot(
          supabase,
          clubId,
          'REPORTING',
          raw,
          raw.length,
          status,
          skippedNote
        )
      } catch {
        // best-effort.
      }

      // SANITY CHECK (warning MOLLE, jamais bloquant) : la valorisation la plus récente
      // de REPORTING doit rester proche de l'agrégat « Portefeuille » importé à l'étape 3
      // (même matrice, deux feuilles — un écart > 1 % signale une feuille désynchronisée).
      try {
        if (upsertedCount > 0) {
          const latest = upserts.reduce((a, b) => (a.report_date > b.report_date ? a : b))
          const { data: agg } = await supabase
            .from('portfolio_aggregates')
            .select('market_value')
            .eq('club_id', clubId)
            .eq('label', 'Portefeuille')
            .eq('is_active', true)
            .maybeSingle()
          const aggValue = (agg as { market_value: number | null } | null)?.market_value
          if (aggValue != null && aggValue > 0) {
            const drift = Math.abs(latest.portfolio_value - aggValue) / aggValue
            if (drift > 0.01) {
              warnings.push(
                `REPORTING: écart de ${(drift * 100).toFixed(1)} % entre la dernière valorisation ` +
                  `REPORTING (${latest.portfolio_value}) et l'agrégat Portefeuille (${aggValue}).`
              )
            }
          }
        }
      } catch {
        // Sanity check best-effort : jamais bloquant.
      }
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
      const raw = await deps.readSheet(sheetId, 'HISTORIQUE')
      const rows = parseHistorique(raw)
      const transactions = mapHistoriqueRows(rows, clubId)
      // AUCUNE PERTE (migration 026) — transaction_date est désormais NULL-able en DB.
      // Une transaction sans date (date inconnue) est IMPORTÉE avec transaction_date = null,
      // jamais écartée (principe owner). On ne fabrique surtout PAS de date de remplacement.
      const datelessCount = transactions.filter((t) => t.transaction_date == null).length
      const synced_at = new Date().toISOString()
      const { error: delErr } = await supabase.from('transactions').delete().eq('club_id', clubId)
      if (delErr) throw new Error(`delete transactions: ${delErr.message}`)
      if (transactions.length > 0) {
        const { error: insErr } = await supabase
          .from('transactions')
          .insert(transactions.map((t) => ({ ...t, synced_at })))
        if (insErr) throw new Error(`insert transactions: ${insErr.message}`)
      }
      // INFORMATIF (pas une exclusion) : on signale les transactions sans date mais
      // elles sont bien en DB. Snapshot 'partial' juste pour tracer l'anomalie de source.
      const status: SnapshotStatus = datelessCount > 0 ? 'partial' : 'success'
      const note =
        datelessCount > 0
          ? `${datelessCount} transaction(s) importée(s) sans date (date inconnue en source)`
          : null
      // MOLLE : note informative (les transactions sont importées, pas perdues).
      if (note) warnings.push(`HISTORIQUE: ${note}`)
      snapshots['HISTORIQUE'] = await createSnapshot(
        supabase,
        clubId,
        'HISTORIQUE',
        raw,
        raw.length,
        status,
        note
      )
    })

    // 5) COTISATIONS → contributions (lookup membres par full_name)
    await runSheet('COTISATIONS', async () => {
      const memberships = await loadMembershipLookups(supabase, clubId)
      const raw = await deps.readSheet(sheetId, 'COTISATIONS')
      const rows = parseCotisations(raw)
      const { contributions, unmatched, unknownStatuses } = mapCotisationsRows(
        rows,
        clubId,
        memberships
      )
      const synced_at = new Date().toISOString()
      if (contributions.length > 0) {
        let rows_ = contributions.map((c) => ({ ...c, synced_at }))
        // GARDE-FOU VALORISATION — si l'étape Portefeuille a rejeté la valo (cours
        // GOOGLEFINANCE vides), net_market_value des membres est lui aussi effondré (formule
        // Sheet = détention × total). On PRÉSERVE alors la valeur en base (dernière saine) et
        // on laisse passer les autres colonnes (détention, total cotisé, statut, dû) qui ne
        // dépendent pas des cours. L'erreur DURE a déjà été poussée par l'étape Portefeuille.
        if (valuationUntrusted) {
          const ids = contributions.map((c) => c.membership_id)
          const { data: prev } = await supabase
            .from('contributions')
            .select('membership_id, net_market_value')
            .in('membership_id', ids)
          const prevMap = new Map(
            ((prev ?? []) as Array<{ membership_id: string; net_market_value: number | null }>).map(
              (p) => [p.membership_id, p.net_market_value]
            )
          )
          rows_ = rows_.map((r) =>
            prevMap.has(r.membership_id)
              ? { ...r, net_market_value: prevMap.get(r.membership_id) ?? r.net_market_value }
              : r
          )
          warnings.push(
            'COTISATIONS: net_market_value préservé (valorisation rejetée ce run, voir Portefeuille).'
          )
        }
        const { error } = await supabase
          .from('contributions')
          .upsert(rows_, { onConflict: 'membership_id' })
        if (error) throw new Error(`upsert contributions: ${error.message}`)
      }
      const notes: string[] = []
      if (unmatched.length > 0) notes.push(`Membres non résolus: ${unmatched.join(', ')}`)
      if (unknownStatuses.length > 0) notes.push(`Statuts inconnus: ${unknownStatuses.join(', ')}`)
      // MOLLE : membres non résolus / statuts inconnus → warnings[] (la feuille a importé).
      const status: SnapshotStatus = notes.length > 0 ? 'partial' : 'success'
      if (notes.length > 0) warnings.push(`COTISATIONS: ${notes.join(' | ')}`)
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
      const raw = await deps.readSheet(sheetId, 'Details cotisations')
      const { months, unmatched } = mapDetailsCotisationsRows(raw, clubId, memberships, new Date())
      const synced_at = new Date().toISOString()
      if (months.length > 0) {
        const { error } = await supabase.from('contribution_months').upsert(
          months.map((m) => ({ ...m, synced_at })),
          { onConflict: 'membership_id,year,month' }
        )
        if (error) throw new Error(`upsert contribution_months: ${error.message}`)
      }
      // MOLLE : en-têtes (noms de membres) non résolus → warnings[] (la feuille a importé).
      const status: SnapshotStatus = unmatched.length > 0 ? 'partial' : 'success'
      if (unmatched.length > 0)
        warnings.push(`Details cotisations: En-têtes non résolus: ${unmatched.join(', ')}`)
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

    // member_quote_part est désormais une VUE normale (migration 030), toujours à jour : il
    // n'y a plus de vue matérialisée à rafraîchir post-sync. L'ancien appel RPC
    // refresh_member_quote_part() a été retiré ici (la fonction subsiste en no-op idempotent
    // côté DB pour ne casser aucun appelant résiduel). Les quote-parts reflètent immédiatement
    // les données importées (memberships LEFT JOIN contributions) sans étape de refresh.

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

    // Alerte Sentry dès la 1re erreur DURE accumulée (jamais sur de simples warnings).
    if (errors.length >= 1) {
      await alertSentry(Deno.env.get('SENTRY_DSN'), {
        club_id: clubId,
        errors,
        sheets: syncedSheets,
      })
    }

    // Alerte EMAIL aux trésoriers dès la 1re erreur DURE (NTF-003).
    // Best-effort + seuil anti-spam 4h géré dans maybeSendSyncErrorAlert :
    // ne throw jamais, ne change rien à la réponse de sync. On agrège les
    // messages d'erreur (nettoyés en interne) en un texte métier lisible.
    if (errors.length > 0) {
      await maybeSendSyncErrorAlert(supabase, clubId, errors.join(' | '), {
        sendEmail: deps.sendSyncErrorEmail,
      })
      // Alerte Discord en parallèle du mail (best-effort, webhook optionnel).
      await notifyDiscordSyncError(Deno.env.get('SYNC_ALERT_DISCORD_WEBHOOK_URL'), clubId, errors)
    }

    // success n'encode QUE les erreurs dures ; warnings est un ajout non-breaking.
    return json({
      success: errors.length === 0,
      club_id: clubId,
      synced_sheets: syncedSheets,
      errors,
      warnings,
      duration_ms: Date.now() - startTime,
      snapshots,
    })
  }
}

// ---- Entrypoint de production ----
// Câble les vraies dépendances (client Supabase réel + readSheet Google Sheets).
// Démarre le serveur uniquement quand le module est l'entrée principale (pas à l'import en test).
if (import.meta.main) {
  // Rendu Brevo chargé PARESSEUSEMENT et via un specifier OPAQUE (variable).
  // Raison : `sendSyncErrorEmailBrevo` tire React Email + @evolve/design-system
  // (`.tsx`/JSX) — un arbre que le graphe de boot Deno pré-résoudrait s'il voyait
  // un `import()` à littéral, échouant en BOOT_ERROR. En différant l'import à
  // l'envoi RÉEL d'un email d'erreur (rare) et en masquant le specifier, l'arbre
  // sort du graphe de boot : le chemin de lecture Sheets démarre sans lui.
  const sendSyncErrorEmail: SendSyncErrorEmail = async (ctx) => {
    const brevoSpec = './sendSyncErrorEmailBrevo.ts'
    const { sendSyncErrorEmailBrevo } = await import(brevoSpec)
    return sendSyncErrorEmailBrevo(ctx)
  }
  Deno.serve(createSyncHandler({ createClient, readSheet, sendSyncErrorEmail }))
}
