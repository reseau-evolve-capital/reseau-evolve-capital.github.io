# PROMPT ORCHESTRATEUR — DSH-011 · Sync feuille REPORTING → historique graphe dashboard

> À coller dans une **nouvelle session Claude Code**, dans un **git worktree isolé** (`feat/dsh-011-reporting-sync` depuis `main`).
> Branche cible : **`feat/dsh-011-reporting-sync`** — **toujours créée depuis `main` à jour** (worktree dédié). Rebase sur `main` avant PR. Cette feature touche surtout data/sync : peu de risque UI, mais la **gate QA finale** doit prouver que **toute l'app reste fonctionnelle** (navigation, états dashboard, PWA/offline).
>
> **Contexte produit** : la matrice Google Sheets contient l'onglet **`REPORTING`** — série quotidienne club (valorisation portefeuille, cotisations cumulées, plus-value, ratio performance). C'est la source naturelle pour alimenter le graphe « Évolution » du dashboard V2. L'agent Dashboard V2 (`docs/tickets/PROMPT-DEV-DASHBOARD-V2-AB.md`) livre l'UI + **données demo** ; **ce ticket** livre le **pipeline data réel** que V2 branchera ensuite (`chart_data_source: 'live'`).

---

Tu es le **LEAD ORCHESTRATEUR** du ticket **DSH-011**.
Tu ne codes pas toi-même les grosses features : tu **DÉCOMPOSES**, **DISPATCHES** des sub-agents, fais tourner **dev → test → QA**, et **ARBITRES**. Travaille en français.

═══════════════════════════════════════════════════════════════════════════ 0. CADRE & GARDE-FOUS (non négociables — lis CLAUDE.md en entier d'abord)
═══════════════════════════════════════════════════════════════════════════

- Branche : **`feat/dsh-011-reporting-sync`** depuis **`main`** (jamais depuis une branche feature en cours). **NE JAMAIS refactorer la vitrine** (`apps/vitrine`).
- **Règle de fin de ticket** : le monorepo doit être **100 % fonctionnel** à la livraison — pas seulement le pipeline REPORTING. Un sub-agent **QA** valide navigation, états dashboard, régressions E2E et comportement PWA/offline (§9).
- **PÉRIMÈTRE STRICT — data pipeline uniquement** :
  - Migration Postgres + RLS
  - DTO / mapper / parser REPORTING (`packages/data`, `supabase/functions/sync`)
  - Couche lecture serveur **`apps/web/lib/data/dashboard-chart.ts`** (nouveau fichier)
  - Tests unitaires + tests sync Deno
  - MAJ `REC/DATA_MODEL.md` §2 (nouvelle table)
- **INTERDIT dans ce ticket** (réservés au sprint Dashboard V2 A/B ou follow-up UI) :
  - `DashboardViewV2`, `DashboardEvolutionChart`, composants `@evolve/ui` du graphe
  - Flag A/B Vercel, analytics GA4, `dashboard-chart-demo.ts`
  - Modifier le comportement visuel de `DashboardView.tsx` (V1)
  - Brancher le graphe V2 sur les données live (follow-up **DSH-012** — voir §8)
- Langue : FR. **Conventional Commits**, scopes `{ supabase | data | sheets | utils | web }`.
- Commits atomiques. **PUSH uniquement si l'owner le demande.**
- TypeScript strict, zéro `any`. Pattern DTO strict (RowDTO → mapper → upsert).
- `packages/ui` ne dépend JAMAIS de `packages/data`.

═══════════════════════════════════════════════════════════════════════════

1. ANALYSE — ÉTAT DES LIEUX (audité 2026-06-11)
   ═══════════════════════════════════════════════════════════════════════════

### 1.1 Feuille REPORTING (matrice Evolve Capital)

Structure observée sur la matrice prod (capture owner, juin 2026) :

| Col   | En-tête (ligne 2)         | Exemple                | Rôle                                                                           |
| ----- | ------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| **A** | Date                      | `dimanche, 03/05/2026` | Jour civil (week-end inclus)                                                   |
| **B** | Valorisation portefeuille | `697 286,83`           | Total club (≈ ligne agrégat « Portefeuille » POSITIONS)                        |
| **C** | Cotisations               | `311 301,24`           | Cotisations cumulées club (quasi constante sur une fenêtre courte)             |
| **D** | Plus-value                | `385 985,59`           | Gain = B − C (parfois vide sur les dernières lignes)                           |
| **E** | Performance               | `2,24`                 | Ratio B/C (≈ multiple de performance, **pas** un % — ex. 697286/311301 ≈ 2,24) |

- ~2 000+ lignes historiques (depuis 2018) — une ligne par jour.
- Les colonnes D/E peuvent être vides sur les jours les plus récents (formules Sheets en retard) : **recalculer côté mapper si manquant** (D = B−C, E = B/C si C > 0).

### 1.2 Sync actuel (`supabase/functions/sync/index.ts`)

Ordre impératif aujourd'hui (6 feuilles) :

```
PARAMETRAGES → Base → Portefeuille (onglet POSITIONS) → HISTORIQUE → COTISATIONS → Details cotisations
```

**REPORTING n'est pas importée.** Les snapshots JSONB (`sheet_snapshots`) ne suffisent pas : non requêtable efficacement pour un graphe (pattern déjà tranché pour les agrégats portefeuille → table `portfolio_aggregates`, migration 029).

### 1.3 Schéma Postgres actuel (dashboard)

| Objet                         | Rôle                              | Limite pour le graphe                                    |
| ----------------------------- | --------------------------------- | -------------------------------------------------------- |
| `member_quote_part` (vue)     | Quote-part **instantanée** membre | Pas d'historique                                         |
| `contributions.detention_pct` | Fraction quote-part (ex. 0.0902)  | Stable entre cotisations ; change quand un membre cotise |
| `portfolio_aggregates`        | Total club **instantané**         | Pas de série temporelle                                  |
| `sheet_snapshots`             | Audit brut JSONB                  | Non exploitable pour courbe                              |

Décision Sprint 4 (volontaire) : pas de table snapshots membre — composants graphe créés mais non alimentés (`docs/superpowers/plans/2026-05-31-sprint4-e-dsh-dashboard.md` § Décision #2).

### 1.4 Hypothèse membre ← club (validée produit)

> « Chaque cotisation unique varie de la même manière que le portefeuille. »

En pratique V0 :

```
quote_part_membre(date) ≈ portfolio_value(date) × detention_pct_actuel
```

- **Avantage** : une seule série club en DB (~2 000 lignes/club) au lieu de N membres × jours.
- **Limite documentée** : si `detention_pct` a changé historiquement (nouvelle cotisation), la courbe rétroactive est approximative. Acceptable V0 pour 7J/30J/90J ; pour MAX, filtrer `date >= joined_at` du membre.
- **Alternative rejetée V0** : table `member_quote_part_snapshots` alimentée à chaque sync — duplication, et la feuille REPORTING ne porte pas les quote-parts individuelles.

### 1.5 Chevauchement avec Dashboard V2 A/B

| Zone                          | Agent Dashboard V2 AB          | Ce ticket DSH-011                                         |
| ----------------------------- | ------------------------------ | --------------------------------------------------------- |
| UI graphe + demo              | ✅                             | ❌                                                        |
| `getDashboardData()` existant | Geler (sauf analytics mineur)  | ❌ ne pas modifier                                        |
| Nouveau `dashboard-chart.ts`  | Consommer plus tard (DSH-012)  | ✅ créer                                                  |
| Migration + sync REPORTING    | ❌ explicitement hors scope V2 | ✅                                                        |
| `types.gen.ts`                | Peut diverger en parallèle     | Régénérer en fin de branche ; rebaser sur `main` avant PR |

**Contrat d'intégration pour V2** (à respecter dans les types exportés) :

```ts
// apps/web/lib/data/dashboard-chart.ts — contrat stable pour DSH-012

export type DashboardChartPeriod = '7d' | '30d' | '90d' | '1y' | 'max'

export interface DashboardChartPoint {
  /** ISO date calendaire (YYYY-MM-DD), timezone UTC midnight */
  date: string
  /** Quote-part membre dérivée (EUR), formaté côté UI via formatEUR */
  value: number
}

export interface DashboardChartVariation {
  amount: number // delta EUR sur la période
  percent: number // fraction (0.0455 = +4,55 %), pour TrendBadge / formatPct
}

export interface DashboardChartData {
  source: 'live'
  /** Série complète triée ASC ; le client filtre par période */
  series: DashboardChartPoint[]
  variations: {
    d1: DashboardChartVariation | null
    d30: DashboardChartVariation | null
    max: DashboardChartVariation | null
  }
  /** Meta debug / QA — pas exposée GA4 */
  meta: {
    clubId: string
    pointCount: number
    firstDate: string | null
    lastDate: string | null
    detentionPctUsed: number
    joinedAtCutoff: string | null
  }
}

/** Retourne null si aucune ligne REPORTING en base (V2 reste en mode demo). */
export async function getDashboardChartData(
  supabase: ServerClient,
  userId: string,
  clubId: string,
  opts: { detentionPct: number; joinedAt: string | null }
): Promise<DashboardChartData | null>
```

V2 fera ensuite :

```ts
const chartLive = await getDashboardChartData(supabase, userId, clubId, {
  detentionPct: initialData.detentionPct,
  joinedAt: initialData.member.joinedAt,
})
const chart = chartLive ?? mergeDemoChart(initialData) // demo module existant V2
const chartDataSource = chartLive ? 'live' : 'demo'
```

═══════════════════════════════════════════════════════════════════════════ 2. DÉCISION ARCHITECTURALE — INTÉGRER DANS LE SYNC (pas un script séparé)
═══════════════════════════════════════════════════════════════════════════

**Recommandation : étendre l'Edge Function `/sync` existante** (7ᵉ feuille), pas un cron/script autonome.

| Critère                     | Sync intégré                        | Script séparé                |
| --------------------------- | ----------------------------------- | ---------------------------- |
| Déclenchement               | Même `pg_cron` / POST `/api/sync`   | Nouveau cron + auth à câbler |
| Audit                       | `sheet_snapshots` + checksum        | À dupliquer                  |
| Credentials Google          | `GOOGLE_SA_KEY_BASE64` déjà injecté | Duplication                  |
| Cohérence `clubs.synced_at` | Un seul run                         | Risque de dérive             |
| Pattern codebase            | Identique aux 6 feuilles            | Exception                    |

**Position dans l'ordre de sync** : après **Portefeuille**, avant **HISTORIQUE** — REPORTING est club-level, sans lookup membre ; cohérent de la placer après les données portefeuille instantanées.

```
… → Portefeuille → REPORTING → HISTORIQUE → …
```

Étiquette snapshot interne : **`REPORTING`** (nom d'onglet réel).

### 2.1 Résilience sync — REPORTING **optionnelle** (NON négociable)

REPORTING est une **feuille enrichissante**, pas une feuille bloquante comme Base ou COTISATIONS.
**Aucun scénario ci-dessous ne doit faire crasher le run `/sync` ni mettre `success: false` à lui seul.**

| Scénario                                                                                        | Comportement attendu                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Onglet **`REPORTING` absent** de la matrice Google (HTTP 400 « Unable to parse range » / 404)   | **Warning MOLLE** (`warnings[]`), snapshot `failed` ou `skipped` best-effort, **pas** d'entrée dans `errors[]`. Les 6 feuilles existantes continuent ; `clubs.synced_at` est MAJ si le reste OK. |
| Feuille présente mais **vide** ou sans lignes data parseables                                   | Warning MOLLE, 0 upsert, pas d'abort.                                                                                                                                                            |
| Lignes partiellement invalides (date illisible, B/C manquants)                                  | Quarantaine MOLLE (pattern Portefeuille), import du reste.                                                                                                                                       |
| Table Postgres **`club_reporting_daily` absente** (migration 034 pas encore déployée sur l'env) | Attraper l'erreur Supabase (`relation … does not exist` / code `42P01`) → **warning**, skip upsert, **sync global continue**. Ne jamais throw non attrapé.                                       |
| Upsert partiel en échec (batch N)                                                               | Log + warning ; ne pas corrompre les batches précédents.                                                                                                                                         |

**Implémentation recommandée** : introduire `runOptionalSheet(name, handler)` (ou param `optional: true` sur `runSheet`) distinct de `runSheet` standard :

- `runSheet` (existant) → erreur → `errors[]` → peut faire `success: false`
- `runOptionalSheet('REPORTING', …)` → erreur → **`warnings[]` uniquement** → `success` inchangé

Tests Deno **obligatoires** :

1. `readSheet('REPORTING')` throw (onglet absent) → sync 200, `success: true`, `errors` sans `REPORTING`, `warnings` contient une note explicite.
2. Upsert mock renvoie `42P01` → idem, pas de crash handler.
3. Feuille REPORTING OK → import normal + présence dans `synced_sheets`.

**Lecture app** : `getDashboardChartData()` retourne déjà `null` si 0 ligne — l'UI (V1 ou V2 demo) ne doit **jamais** crasher ni afficher NaN si REPORTING manque.

═══════════════════════════════════════════════════════════════════════════ 3. SCHÉMA PROPOSÉ — Migration `034_club_reporting_daily.sql`
═══════════════════════════════════════════════════════════════════════════

```sql
-- Série quotidienne club — source : feuille REPORTING (cols A–E).
-- Alimentation : Edge Function sync (service role). Lecture : membres du club (RLS).

CREATE TABLE IF NOT EXISTS club_reporting_daily (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  report_date           DATE NOT NULL,
  portfolio_value       NUMERIC(18,2) NOT NULL,   -- col B
  total_contributions   NUMERIC(18,2) NOT NULL,   -- col C
  capital_gain          NUMERIC(18,2),            -- col D (nullable si recalculé)
  performance_ratio     NUMERIC(12,6),            -- col E (= B/C si C>0)
  synced_at             TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, report_date)
);

CREATE INDEX club_reporting_daily_club_date_idx
  ON club_reporting_daily (club_id, report_date DESC);

ALTER TABLE club_reporting_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_reporting_daily: club member read"
  ON club_reporting_daily FOR SELECT
  USING (club_id IN (SELECT get_user_club_ids()));

-- Écriture : service role uniquement (sync) — aucune policy INSERT/UPDATE authenticated.
```

**Pas de soft-delete par synced_at** (contrairement à `positions`) : l'historique REPORTING est append-only / upsert par date. Une ligne absente de la feuille n'est **pas** supprimée automatiquement V0 (évite effacement accidentel si la plage lue est tronquée). Documenter en commentaire migration ; purge manuelle trésorier = V1+.

**Sanity check post-import** (warning MOLLE, pas abort) : comparer la dernière `portfolio_value` avec `portfolio_aggregates` label « Portefeuille » — écart > 1 % → `warnings[]` dans la réponse sync.

═══════════════════════════════════════════════════════════════════════════ 4. COUCHE SHEETS — Fichiers à créer / modifier
═══════════════════════════════════════════════════════════════════════════

### 4.1 DTO (`packages/data/src/types/sheets.ts`)

```ts
export interface ReportingRowDTO {
  reportDateRaw: string | null // col A brute
  portfolioValue: number | null // col B
  totalContributions: number | null // col C
  capitalGain: number | null // col D
  performanceRatio: number | null // col E
}

export interface ClubReportingDailyUpsert {
  club_id: string
  report_date: string // ISO date YYYY-MM-DD
  portfolio_value: number
  total_contributions: number
  capital_gain: number | null
  performance_ratio: number | null
  synced_at: string
}
```

### 4.2 Parser (`supabase/functions/sync/sheetParsers.ts`)

- `parseReporting(rows: string[][]): ReportingRowDTO[]`
- Sauter les 2 premières lignes si ligne 0 = titre matrice / ligne 1 = en-têtes (aligné capture : headers row 2 purple).
- Col A : extraire la date avec helper dédié **`parseReportingDate`** :
  - `"dimanche, 03/05/2026"` → `2006-05-03` (regex sur `\d{1,2}/\d{1,2}/\d{4}` après la virgule)
  - Réutiliser / étendre `parseFrDate` dans `@evolve/utils` (tests obligatoires)
- Col B–E : `toNumOrNull` (format FR existant)

### 4.3 Mapper (`packages/data/src/sheets/mappers/reporting.mapper.ts`)

- `mapReportingRows(rows: ReportingRowDTO[], clubId: string, syncedAt: string)`
- Quarantaine MOLLE : lignes sans date parseable ou sans B/C → `skipped[]` + warning
- Enrichissement : si D null et B,C ok → `capital_gain = B - C`
- Enrichissement : si E null et C > 0 → `performance_ratio = B / C`
- Validation : B ≥ 0, C ≥ 0 ; dates uniques (dernière ligne gagne en cas de doublon jour)

### 4.4 Sync handler (`supabase/functions/sync/index.ts`)

Nouveau bloc **`runOptionalSheet('REPORTING', …)`** (cf. §2.1 — pas `runSheet` classique) :

1. `readSheet(sheetId, 'REPORTING')` — si throw → catch → warning + return (pas de rethrow)
2. `parseReporting` → `mapReportingRows`
3. Upsert batch par paquets de 500 (`onConflict: 'club_id,report_date'`) — wrapper try/catch par batch + catch table absente (`42P01`)
4. `createSnapshot(…, 'REPORTING', raw, …)` best-effort
5. Sanity check vs `portfolio_aggregates` (warning MOLLE si écart > 1 %)

Mettre à jour :

- `SHEET_PREFIXES` dans `syncErrorAlert.ts` (warnings REPORTING optionnels **exclus** des alertes email sync error si seule anomalie)
- Tests Deno `sync.test.ts` :
  - fixture REPORTING OK : ordre (après Portefeuille), idempotence, date FR avec jour de semaine
  - **REPORTING absent** : sync complète des 6 autres feuilles, `success: true`
  - **table DB absente** : mock Supabase `42P01`, pas de crash

### 4.5 Tests unitaires Vitest

- `packages/utils/src/dates.test.ts` — cas `parseReportingDate` / extension `parseFrDate`
- `packages/data/src/sheets/mappers/__tests__/reporting.mapper.test.ts` — recalcul D/E, quarantaine, doublons

═══════════════════════════════════════════════════════════════════════════ 5. COUCHE LECTURE — `apps/web/lib/data/dashboard-chart.ts`
═══════════════════════════════════════════════════════════════════════════

**Ne pas modifier `getDashboardData()`** — créer un module séparé consommé plus tard par DSH-012.

Algorithme `getDashboardChartData` :

1. Query `club_reporting_daily` WHERE `club_id = ?` ORDER BY `report_date ASC` (RLS OK).
2. Si 0 ligne → `null`.
3. Filtrer `report_date >= joinedAt` si `joinedAt` parseable (période MAX membre).
4. Mapper chaque point : `{ date, value: portfolio_value * detentionPct }`.
5. Calculer variations :
   - **d1** : dernier point vs avant-dernier (si ≥ 2 points)
   - **d30** : dernier vs point le plus proche de J-30 (ou premier si historique < 30j)
   - **max** : dernier vs premier de la série filtrée
   - `percent = (end - start) / start` si start > 0 ; sinon null → pas de TrendBadge
6. Jamais retourner NaN — filtrer points invalides.

Helper pur exporté pour tests :

```ts
export function deriveMemberSeries(
  clubRows: { report_date: string; portfolio_value: number }[],
  detentionPct: number,
  joinedAt: string | null
): DashboardChartPoint[]

export function computeVariation(
  series: DashboardChartPoint[],
  daysBack: number | 'max'
): DashboardChartVariation | null
```

Tests Vitest dans `apps/web/lib/data/dashboard-chart.test.ts` (série synthétique, pas de Supabase).

**Ne pas brancher** dans `apps/web/app/(app)/dashboard/page.tsx` dans ce ticket — DSH-012 le fera pour éviter conflit avec l'agent V2 sur `page.tsx`.

═══════════════════════════════════════════════════════════════════════════ 6. ROSTER SUB-AGENTS & PLAN D'EXÉCUTION
═══════════════════════════════════════════════════════════════════════════

```
Phase 0 — Lead : lire CLAUDE.md + ce prompt + sync/index.ts + DATA_MODEL.md
          Gate baseline : make lint typecheck test
          Vérifier plage readSheet (A1:E2500 suffisant ? ajuster readSheet ou range dédiée REPORTING)

Phase 1 — DB : migration 034 + db push local + make db-types

Phase 2 — Data (parallèle après Phase 1) :
          A) utils parseReportingDate + tests
          B) DTO + mapper reporting + tests Vitest
          C) sheetParsers parseReporting + tests Deno parser

Phase 3 — Sync : intégrer runSheet REPORTING + tests handler Deno (idempotence, ordre, partial)

Phase 4 — Read layer : dashboard-chart.ts + tests purs

Phase 5 — Doc : REC/DATA_MODEL.md §2.10 club_reporting_daily + note design-reference-map (pipeline data)

Phase 6 — Gate technique :
          make lint typecheck test
          pnpm vitest run apps/web/lib/data/dashboard-chart.test.ts
          pnpm vitest run packages/data/src/sheets/mappers/__tests__/reporting.mapper.test.ts
          deno test supabase/functions/sync/__tests__/sync.test.ts
          Sync manuel local : avec ET sans onglet REPORTING → pas de crash

Phase 7 — QA E2E & non-régression (sub-agent QA obligatoire, max 3 itérations) :
          Voir §9 — scorecard bloquant avant « FAIT »
```

═══════════════════════════════════════════════════════════════════════════ 7. CRITÈRES D'ACCEPTATION (DoD)
═══════════════════════════════════════════════════════════════════════════

- [ ] Table `club_reporting_daily` créée, RLS lecture membre, écriture service role only
- [ ] Feuille REPORTING importée quand présente (7ᵉ feuille optionnelle), snapshot audit OK
- [ ] **Résilience** : onglet REPORTING absent → sync OK (`success: true`), warning explicite, 6 feuilles intactes
- [ ] **Résilience** : table `club_reporting_daily` absente (pre-migration) → sync OK, warning, pas de throw
- [ ] Parser gère `"jour, DD/MM/YYYY"` + formats FR numériques
- [ ] D/E recalculés si absents ; warnings MOLLE sur lignes rejetées
- [ ] Idempotence : 2 syncs consécutives → même nombre de lignes, valeurs identiques
- [ ] `getDashboardChartData()` retourne série dérivée membre + variations d1/d30/max
- [ ] Retourne `null` si table vide (V2 reste en demo sans crash)
- [ ] Aucun fichier UI dashboard modifié (`DashboardView*`, `page.tsx`, `@evolve/ui` graphe)
- [ ] `getDashboardData()` inchangé (diff vide ou commentaire doc uniquement)
- [ ] Tests verts (Vitest + Deno sync, dont scénarios résilience §2.1)
- [ ] **Gate QA §9** : scorecard CONVERGÉ, E2E dashboard + navigation + PWA/offline OK
- [ ] **Projet entier fonctionnel** : `make lint typecheck test` vert sur le monorepo touché
- [ ] `REC/DATA_MODEL.md` mis à jour
- [ ] Commits atomiques FR, non poussés sauf demande owner

═══════════════════════════════════════════════════════════════════════════ 8. FOLLOW-UP EXPLICITE — DSH-012 (hors scope, pour l'agent Dashboard V2)
═══════════════════════════════════════════════════════════════════════════

Ticket consommateur à enchaîner **après merge DSH-011** (peut être fait par l'agent V2 rebasé) :

1. Dans `apps/web/app/(app)/dashboard/page.tsx` : appeler `getDashboardChartData` en parallèle de `getDashboardData`
2. Passer `chartData` à `DashboardViewV2` ; merger demo si null
3. Remplacer `chart_data_source: 'demo'` par `'live'` quand série présente
4. Alimenter `TrendBadge` hero (variation 1j) depuis `variations.d1`
5. Filtrer `series` côté client selon toggle 7J/30J/90J/1A/MAX
6. Test e2e : seed REPORTING en local → graphe V2 sans label demo

**Fichiers réservés DSH-012 (ne pas toucher dans DSH-011)** :

- `apps/web/components/dashboard/DashboardViewV2.tsx`
- `apps/web/lib/data/dashboard-chart-demo.ts`
- `apps/web/app/(app)/dashboard/page.tsx`
- `docs/analytics/PLAN-DE-TAGGAGE.md`

═══════════════════════════════════════════════════════════════════════════ 9. QA FINALE — PROJET FONCTIONNEL (sub-agent obligatoire)
═══════════════════════════════════════════════════════════════════════════

Même si DSH-011 est un ticket **data**, la livraison n'est **pas** acceptable si l'app membre
régresse. L'orchestrateur dispatch un sub-agent **QA** (read + browser + Playwright) en **Phase 7**.

### 9.1 Protocole automatisé (bloquant)

```bash
make lint typecheck test
pnpm --filter @evolve/web exec playwright test dashboard.spec.ts --workers=1
pnpm --filter @evolve/web exec playwright test cursor-pointer.spec.ts --workers=1
pnpm --filter @evolve/web exec playwright test a11y.spec.ts --workers=1
# Si V2 déjà sur main au moment du rebase : ajouter dashboard-v2.spec.ts s'il existe
pnpm --filter @evolve/web exec playwright test pwa-install-banner.spec.ts --workers=1
```

Smoke navigation (Playwright ou MCP browser) — **0 régression** :

| Route                                             | Vérifier                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                                      | Hero + KPIs visibles ; états loading→loaded ; pas de NaN/undefined ; stale banner si mock ; empty state si pas de data |
| `/dashboard` V2 (si présente sur branche rebasée) | Graphe visible (demo ou live) ; toggles période 30J/MAX mobile, 7J–MAX desktop ; filtres changent la courbe sans crash |
| `/portfolio`                                      | Liste positions ; pas de régression layout                                                                             |
| `/contributions`                                  | Timeline ; pas de régression                                                                                           |
| BottomNav / Sidebar                               | Navigation fluide entre les 3 onglets ; focus clavier OK                                                               |

### 9.2 Dashboard — états à couvrir (QA manuel ou e2e)

- **Loading** : `loading.tsx` ou skeleton — pas de flash de contenu cassé
- **Loaded** : montants formatés FR (`formatEUR`)
- **Empty** : membre sans `member_quote_part` → `EmptyState`, pas de crash
- **Error** : `error.tsx` ou boundary — message FR, retry possible
- **Stale** : `syncedAt` > 2h → badge sync (existant DSH-007)
- **Chart sans historique** : `getDashboardChartData` → `null` → UI reste en demo V2 ou sans graphe V1 — **jamais d'écran blanc**

### 9.3 PWA & mode offline

Réf : `apps/web/public/sw.js`, `public/offline.html`, spec `docs/superpowers/specs/2026-06-07-pwa-install-banner-design.md`.

- Vérifier que l'ajout migration/sync **ne casse pas** l'enregistrement SW ni le manifest.
- **Offline** (prod build ou inspection SW) : navigation vers une URL non cacheable → fallback `/offline.html` ou page shell ; retour online → dashboard recharge sans erreur permanente.
- Bannière install PWA : toujours dismissable ; pas de chevauchement avec cookie consent.
- TanStack Query : en offline, le dashboard déjà visité ne crash pas (cache stale acceptable) — pas de boucle d'erreur non gérée.

> Note : Playwright dev n'exécute pas toujours le SW (prod-only) — QA documente ce qu'il a pu vérifier en build preview (`pnpm --filter @evolve/web build && pnpm start`) si nécessaire.

### 9.4 Scorecard QA (verdict bloquant)

Le sub-agent QA produit un **SCORECARD** markdown (dans la réponse ou `docs/qa/`) :

| Critère                                           | Bloquant |
| ------------------------------------------------- | -------- |
| Gate `make lint typecheck test` vert              | Oui      |
| E2E dashboard + cursor-pointer verts              | Oui      |
| Navigation 3 onglets fluide                       | Oui      |
| États dashboard (loaded/empty/stale) OK           | Oui      |
| Sync sans REPORTING ne casse pas l'app            | Oui      |
| PWA/offline : pas de régression manifest/SW       | Oui      |
| A11y : pas de nouvelle violation serious/critical | Oui      |

Verdict ∈ { **CONVERGÉ** | À CORRIGER | ARBITRAGE }. Max **3 boucles** dev→QA.

═══════════════════════════════════════════════════════════════════════════ 10. COMMITS ATTENDUS (exemples)
═══════════════════════════════════════════════════════════════════════════

```
feat(supabase): table club_reporting_daily avec rls lecture membre
feat(sheets): dto et mapper feuille reporting
feat(utils): parseReportingDate pour colonnes date avec jour de semaine
feat(supabase): sync feuille reporting optionnelle en 7e etape
test(supabase): sync resilient sans onglet ou table reporting
feat(web): couche getDashboardChartData derivee du reporting club
test(sheets): mapper reporting et sync deno reporting
docs(data): documenter club_reporting_daily dans DATA_MODEL
```

═══════════════════════════════════════════════════════════════════════════ 11. WORKTREE — DÉMARRAGE RAPIDE
═══════════════════════════════════════════════════════════════════════════

```bash
cd /Users/lionel/Documents/OMNIVENTUS/Projects/reseau-evolve-capital
git fetch origin main
git worktree add .claude/worktrees/feat-dsh-011-reporting-sync -b feat/dsh-011-reporting-sync origin/main
cd .claude/worktrees/feat-dsh-011-reporting-sync
make db-start   # si stack locale absente
make lint typecheck test   # gate baseline
# Puis exécuter les phases §6
```

---

**Roster sub-agents** : Phase 1–4 IMPLEMENTER (data/sync/web) · Phase 7 **QA** (E2E, navigation, PWA, scorecard §9).

**COMMENCE par la Phase 0, présente le plan ordonné avec vérification de la plage Google Sheets REPORTING, PUIS lance les sub-agents. Ne déclare « FAIT » qu'après scorecard QA §9 CONVERGÉ.**
