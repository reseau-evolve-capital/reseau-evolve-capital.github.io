// Edge Function `sheet-probe` — NET-004 : dry-run de validation d'une matrice Google Sheets
// avant rattachement d'un club au réseau (assistant « lancer un club », NET-006).
//
// Contrat
// -------
//   POST { sheet_id }   (l'UI extrait l'ID depuis une URL Google Sheets côté NET-006 ;
//                        cette fonction accepte aussi une URL/ID brut, défensivement)
//     headers : Authorization: Bearer <JWT user>   (verify_jwt par défaut = true)
//   → garde caller = network_admin (rpc is_network_admin sur un client porté par le JWT du caller) ;
//   → LECTURE SEULE de la feuille via le Service Account (mêmes credentials que `sync`) :
//       liste les onglets, compare aux onglets attendus, compte members/positions (preview) ;
//   → 200 { ok, foundTabs, missingTabs, preview: { members, positions }, warnings }.
//
// ⚠️ DRY-RUN PUR — AUCUNE écriture (ni DB, ni Sheets). On ne touche QUE des endpoints de
//    LECTURE Google (`spreadsheets.get` métadonnées + `spreadsheets.values.get` quelques lignes)
//    et l'unique RPC de garde `is_network_admin` (SELECT fail-closed, migration 040).
//
// Erreurs actionnables (HTTP + champ `error`) :
//   403 forbidden        — caller non network_admin (ou rpc en erreur → fail-closed).
//   400 invalid_id       — sheet_id manquant / URL non parsable.
//   404 invalid_id       — feuille introuvable (Google 404).
//   403 not_shared       — feuille non partagée en lecture avec le Service Account (Google 403).
//   200 { ok:false, missingTabs:[…] } — onglet(s) bloquant(s) absent(s) (missing_tabs).
//
// Injection de dépendances (pattern `sync`/SHE-008) : `createClient`, `listSheetTabs`,
// `readSheet`, `serviceAccountEmail` passent par `SheetProbeDeps` → tests SANS réseau réel.
//
// Réf : supabase/functions/sync/{index,readSheet}.ts (ordre/noms d'onglets RÉELS, auth SA),
// migration 040 (is_network_admin), CLAUDE.md (RLS least-privilege, SA partagé).

import { createClient } from 'npm:@supabase/supabase-js@^2'

import {
  listSheetTabs as listSheetTabsImpl,
  serviceAccountEmail,
  SheetMetaError,
} from './listSheetTabs.ts'
import { readSheet as readSheetImpl } from '../sync/readSheet.ts'
import { parseBase, parsePortefeuille } from '../sync/sheetParsers.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Onglets attendus — DÉRIVÉS de ce que `sync` lit RÉELLEMENT (supabase/functions/sync/index.ts).
// Ce sont les NOMS D'ONGLETS passés à readSheet (= ce que l'admin doit nommer dans SA feuille),
// PAS les étiquettes internes de snapshot. Source de vérité :
//   sync lit (ordre impératif) : PARAMETRAGES → Base → POSITIONS → REPORTING(opt) → HISTORIQUE
//                                → COTISATIONS → Details cotisations.
// ⚠️ Le backlog cite « Portefeuille »/« POSITIONS » : l'onglet RÉEL lu par sync est « POSITIONS »
//    (cf. index.ts : `readSheet(sheetId, 'POSITIONS')` ; l'étiquette « Portefeuille » est juste le
//    label de snapshot). On valide donc « POSITIONS ». REPORTING est OPTIONNELLE (warning, pas bloquant).
// ─────────────────────────────────────────────────────────────────────────────

/** Onglets BLOQUANTS : absent ⇒ ok=false + missingTabs. Noms EXACTS lus par sync. */
export const REQUIRED_TABS = [
  'PARAMETRAGES',
  'Base',
  'POSITIONS',
  'HISTORIQUE',
  'COTISATIONS',
  'Details cotisations',
] as const

/** Onglets OPTIONNELS : absent ⇒ warning, jamais bloquant (parité avec runOptionalSheet de sync). */
export const OPTIONAL_TABS = ['REPORTING'] as const

// ─────────────────────────────────────────────────────────────────────────────
// CORS — cette fonction est invoquée depuis le browser / une Server Action (≠ les autres
// Edge functions du repo, déclenchées par trigger/cron en service-role). On gère donc le
// préflight OPTIONS et on autorise l'en-tête Authorization (JWT du caller).
// ─────────────────────────────────────────────────────────────────────────────
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  })
}

/** Message d'erreur lisible quelle que soit la valeur catchée. */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Extrait l'ID d'une feuille depuis une URL Google Sheets, OU renvoie l'entrée telle quelle si
 * c'est déjà un ID brut. Défensif (l'UI NET-006 fait l'extraction en amont) : on tolère les deux.
 * Formats gérés : `https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0`, ID nu (`1aBc…`).
 * Renvoie null si rien d'exploitable.
 */
export function extractSheetId(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  // URL Google Sheets : .../spreadsheets/d/<ID>/...
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (urlMatch?.[1]) return urlMatch[1]
  // ID brut : les IDs Sheets sont alphanumériques + tirets/underscores (pas d'espace ni de slash).
  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Injection de dépendances (pattern SyncDeps / SHE-008).
// ─────────────────────────────────────────────────────────────────────────────
export interface SheetProbeDeps {
  createClient: typeof createClient
  /** Liste les titres d'onglets d'une feuille (lecture seule métadonnées). */
  listSheetTabs: (sheetId: string) => Promise<string[]>
  /** Lit une plage d'un onglet (lecture seule valeurs). */
  readSheet: (sheetId: string, sheetName: string, range?: string) => Promise<string[][]>
  /** Email du Service Account (pour le message « partage la feuille avec … »). */
  serviceAccountEmail: () => string | null
}

/** Forme de la réponse succès (contrat NET-004). */
export interface SheetProbeResult {
  ok: boolean
  foundTabs: string[]
  missingTabs: string[]
  preview: { members: number; positions: number }
  warnings: string[]
}

/**
 * Construit le handler HTTP de `sheet-probe` à partir de dépendances injectées.
 * Toute la logique vit ici ; l'entrypoint de production câble les vraies implémentations.
 */
export function createSheetProbeHandler(deps: SheetProbeDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // 0. Préflight CORS.
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
    if (req.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405)
    }

    // 1. Garde caller = network_admin. Client porté par le JWT du caller (PAS service-role) :
    //    is_network_admin() lit auth.uid() et est fail-closed (false si non listé / non authentifié).
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = deps.createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    {
      const { data: isAdmin, error } = await supabase.rpc('is_network_admin')
      if (error || isAdmin !== true) {
        return json({ error: 'forbidden' }, 403)
      }
    }

    // 2. Validation du corps : { sheet_id }. On tolère un ID brut OU une URL Google Sheets.
    let rawSheetId: unknown
    try {
      const body = (await req.json()) as { sheet_id?: unknown }
      rawSheetId = body?.sheet_id
    } catch {
      return json({ error: 'invalid_id', message: 'Corps JSON illisible.' }, 400)
    }
    if (typeof rawSheetId !== 'string') {
      return json({ error: 'invalid_id', message: 'Champ « sheet_id » (string) attendu.' }, 400)
    }
    const sheetId = extractSheetId(rawSheetId)
    if (!sheetId) {
      return json(
        {
          error: 'invalid_id',
          message: 'ID ou URL Google Sheets invalide.',
        },
        400
      )
    }

    // 3. Liste des onglets (lecture seule métadonnées). Traduit les erreurs Google en
    //    réponses actionnables : 403 → not_shared, 404 → invalid_id.
    let foundTabs: string[]
    try {
      foundTabs = await deps.listSheetTabs(sheetId)
    } catch (e) {
      if (e instanceof SheetMetaError) {
        if (e.httpStatus === 403) {
          const sa = deps.serviceAccountEmail()
          return json(
            {
              error: 'not_shared',
              message: sa
                ? `Partage la feuille en lecture avec ${sa}.`
                : 'Partage la feuille en lecture avec le compte de service.',
            },
            403
          )
        }
        if (e.httpStatus === 404) {
          return json({ error: 'invalid_id', message: 'Feuille Google Sheets introuvable.' }, 404)
        }
      }
      // Autre erreur (OAuth, SA manquante, réponse inattendue) → 500.
      return json({ error: 'probe_failed', message: errMsg(e) }, 500)
    }

    // 4. Comparaison aux onglets attendus.
    const foundSet = new Set(foundTabs)
    const missingTabs = REQUIRED_TABS.filter((t) => !foundSet.has(t))
    const warnings: string[] = []
    for (const opt of OPTIONAL_TABS) {
      if (!foundSet.has(opt)) {
        warnings.push(
          `Onglet optionnel « ${opt} » absent : le graphe d'évolution du dashboard ne sera pas alimenté (non bloquant).`
        )
      }
    }
    if (missingTabs.length > 0) {
      warnings.push(`Onglet(s) bloquant(s) manquant(s) : ${missingTabs.join(', ')}.`)
    }

    // 5. Preview LECTURE SEULE (quelques lignes). On compte members (Base) et positions
    //    (POSITIONS), sans planter si un onglet manque. Une vraie position = symbole non vide
    //    (les lignes d'agrégat « TOTAL »/« ESPECES » ont un symbole forcé vide côté parser).
    let members = 0
    let positions = 0

    if (foundSet.has('Base')) {
      try {
        const raw = await deps.readSheet(sheetId, 'Base', 'A1:J50')
        members = parseBase(raw).filter((r) => r.fullName.trim() !== '').length
      } catch (e) {
        warnings.push(`Preview « Base » indisponible : ${errMsg(e)}`)
      }
    }
    if (foundSet.has('POSITIONS')) {
      try {
        const raw = await deps.readSheet(sheetId, 'POSITIONS', 'A1:W50')
        positions = parsePortefeuille(raw).filter((r) => r.symbol.trim() !== '').length
      } catch (e) {
        warnings.push(`Preview « POSITIONS » indisponible : ${errMsg(e)}`)
      }
    }

    return json({
      ok: missingTabs.length === 0,
      foundTabs,
      missingTabs,
      preview: { members, positions },
      warnings,
    } satisfies SheetProbeResult)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrypoint de production — câble les vraies dépendances. Démarre le serveur uniquement
// quand le module est l'entrée principale (pas à l'import en test).
// ─────────────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  Deno.serve(
    createSheetProbeHandler({
      createClient,
      listSheetTabs: listSheetTabsImpl,
      readSheet: readSheetImpl,
      serviceAccountEmail,
    })
  )
}
