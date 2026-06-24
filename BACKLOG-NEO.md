# BACKLOG-NEO — Système d'Opérations Natif & Fin de dépendance à la Matrice

> **Source** : `CAHIER_DES_CHARGES.md` v1.0 (2026-06-24) — Module « Système d'Opérations Natif ».
> **Branche d'intégration** : `main`. Features → `feat/*` depuis `main`.
> **Rédigé par** : lead dev / chef de projet, après audit du code réel (cf. § _Ancrage codebase_).

Ce backlog découpe le module en **5 épics** (un par sprint), chaque épic en tickets `OPS-*` au format
spec-as-prompt du projet. Les **3 décisions §10** ouvrent le Sprint 1 comme tickets **bloquants** `DEC-*`.

---

## Ancrage codebase (état réel audité — ne pas re-deviner)

Faits vérifiés dans le repo, qui priment sur le pseudo-code du cahier des charges :

| Sujet                                | Réalité du code                                                                                                                                                                                                                                                                                                                                                                                                             | Impact backlog                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Numéro de migration libre**        | Dernière = `055_network_list_members.sql`. **Prochaine = `056`**.                                                                                                                                                                                                                                                                                                                                                           | La table `operations` = `056`, puis `057`, `058`… séquentiels.                                                                     |
| **Helpers RLS**                      | `is_club_staff(uuid)`, `get_user_club_ids()`, `get_user_role_in_club(uuid)`, `is_network_admin()`, `is_network_member()`, `set_updated_at()` existent tous, `SECURITY DEFINER STABLE`, fail-closed `COALESCE(...,false)` (migr. 010/028/040).                                                                                                                                                                               | Réutiliser tels quels. `is_club_staff` couvre `treasurer`+`president`+`network_admin` → garde unique (cf. DEC-003).                |
| **Audit log**                        | Table `audit_log` (migr. 053) **écrite UNIQUEMENT via `log_audit_event(...)` SECURITY DEFINER** — l'appelant applicatif ne peut PAS `INSERT` directement. Wrapper web `withAudit`.                                                                                                                                                                                                                                          | ⚠ Le pseudo-SQL du cahier fait `INSERT INTO audit_log` en direct → **à remplacer par `log_audit_event(...)`** dans toutes les RPC. |
| **`memberships`**                    | `status member_status (active\|left)`, `is_active` GENERATED, `role member_role`. **Pas de colonne `parts`.**                                                                                                                                                                                                                                                                                                               | OPS-102 ajoute `parts`. Filtrer par `status = 'active'`.                                                                           |
| **`clubs`**                          | `settings JSONB NOT NULL DEFAULT '{}'`, `min_contribution NUMERIC NOT NULL DEFAULT 100`, `is_active`, `broker_account_ref`, `annual_investment_cap` existent.                                                                                                                                                                                                                                                               | `share_calculation_mode` etc. → clés JSONB (pas de DDL). Écriture via `update_club_settings` (migr. 025).                          |
| **`transactions`**                   | enum `transaction_type (buy\|sell\|dividend\|coupon\|other)`, colonnes `quantity/price/total/symbol/name/transaction_date/club_id`.                                                                                                                                                                                                                                                                                         | Mapping migration : `dividend`+`coupon` → `dividend_cash`.                                                                         |
| **`operations` / `price_snapshots`** | **N'existent pas.**                                                                                                                                                                                                                                                                                                                                                                                                         | OPS-101 et OPS-309 les créent.                                                                                                     |
| **Prix**                             | Pas de provider serveur : les cours viennent de `GOOGLEFINANCE` dans la Matrice → `positions.market_price_eur` au sync 2h. Une abstraction `PriceProvider` existe **côté app Node** (`packages/data/src/prices/`, PFT-007) mais **PAS** dans `supabase/functions/_shared/`.                                                                                                                                                 | OPS-310 crée la **nouvelle** abstraction edge `_shared/price-provider.ts`.                                                         |
| **Pattern Edge Function**            | `index.ts` (entrypoint + `Deno.serve` sous `import.meta.main`, deps câblées) + `handler.ts`/factory `createXHandler(deps)` (pur, testable). Client service-role. Tests `Deno.test` + `jsr:@std/assert`.                                                                                                                                                                                                                     | Toute nouvelle edge function suit ce patron (DI testable).                                                                         |
| **Pattern RLS+RPC**                  | `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL FROM public` + **GRANT explicites** (auto-expose DÉSACTIVÉ) ; RPC `SECURITY DEFINER SET search_path = public, auth, pg_catalog`, gardes fail-closed, `REVOKE ALL ON FUNCTION FROM public` + `GRANT EXECUTE TO authenticated`.                                                                                                                                                     | Patron `038_polls.sql` = référence à copier.                                                                                       |
| **pg_cron**                          | `cron.unschedule(...) WHERE EXISTS` puis `cron.schedule(...)` ; déclenche les edge via `net.http_post` + `current_setting('app.*')`/Vault (migr. 013/032).                                                                                                                                                                                                                                                                  | OPS-315 ajoute `sync-prices-every-2h` sur ce patron.                                                                               |
| **Web admin**                        | Routes `apps/web/app/(app)/admin/{,/members,/cotisations,/votes,/retours,/invitations,/settings}` ; nav `AdminTabs.tsx` (7 onglets) ; garde `getAdminContext(userId)` (`lib/data/request.ts`) → `null` si pas staff → `Forbidden`. RPC appelées via Server Actions `admin/actions.ts` enveloppées `withAudit`, erreurs PG mappées (`42501`→forbidden). Client `createServerClient` (RLS), **jamais service-role côté web**. | Onglet « Opérations » + écrans dans ce groupe, même garde, même patron Server Action.                                              |
| **portfolio.ts**                     | `totalFromAggregates()` / `liquidityFromAggregates()` lisent `portfolio_aggregates` (labels normalisés `portefeuille`/`especes`).                                                                                                                                                                                                                                                                                           | Sprint 5 : repointer ces lectures vers `operations` (`get_club_cash_balance`/`get_club_positions_from_ops`).                       |
| **i18n**                             | `apps/web/messages/{fr,en}.json` (fr = vérité), test de parité `lib/i18n/messages-parity.test.ts`, `useTranslations`/`getTranslations`.                                                                                                                                                                                                                                                                                     | Tout copy UI → namespace `operations.*` ajouté **fr ET en**.                                                                       |
| **Tests UI**                         | Storybook `play` (`packages/ui`), vitest + `jest-axe` colocalisés, spec `cursor-pointer`.                                                                                                                                                                                                                                                                                                                                   | Tout composant `@evolve/ui` : story `play` + test axe + cursor-pointer vert.                                                       |

### Notes d'arbitrage technique (corrections au cahier des charges — à valider en DEC ou inline)

1. **`record_operation` ne peut PAS être `STABLE`** (il `INSERT`) — le cahier le déclare `STABLE`, c'est un bug : ce sera `VOLATILE` (défaut). Idem `settle_contributions_wave`, `cancel_operation` (VOLATILE).
2. **Audit via `log_audit_event(...)`**, pas `INSERT INTO audit_log` (cf. tableau).
3. **Vue `member_share_dual`** : créer en `WITH (security_invoker = on)` (Postgres 15 / Supabase) pour que la RLS de `memberships`/`operations` s'applique à l'appelant — sinon fuite cross-club. Sera un critère d'acceptation d'OPS-304.
4. **Cohérence `cash_delta`** : pour `buy`/`sell`, le signe et la valeur (`±quantity×unit_price×fx_rate`) sont **validés dans `record_operation`** (et par 2 CHECK déjà prévus pour `dividend_stock`/`valuation`). On ajoute un CHECK `member_id` requis pour `contribution`/`penalty`/`member_exit`.
5. **`get_club_positions_from_ops`** : la sous-requête `last_unit_price` doit aussi exclure les lignes annulées et inclure `valuation` (prix manuel non coté) — précisé en OPS-203.

---

## Vue d'ensemble des épics

| Épic                                                          | Sprint | Périmètre (1 phrase)                                                                                                                                             | Tickets                  | Sortie                                                                |
| ------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| **E-OPS-1 — Fondation DB & Migration**                        | 1      | La table `operations` existe, est sécurisée (RLS+RPC), et contient l'historique legacy migré de façon idempotente, validé sur les 4 clubs.                       | DEC-001→003, OPS-101→107 | Solde espèces `operations` = Matrice à ±1 €.                          |
| **E-OPS-2 — Saisie trésorier**                                | 2      | Le trésorier saisit/annule cotisations, achats, ventes, dividendes depuis l'app via RPC, et voit solde + opérations en temps réel.                               | OPS-201→207              | Saisie d'une cotisation/achat/dividende, solde cohérent.              |
| **E-OPS-3 — Calcul dual des quotes-parts + Provider de prix** | 3      | Les modes Simple et OPCVM sont calculés en parallèle (preview trésorier) et la NAV s'appuie sur un provider de prix abstrait (Sheets → Twelve Data) cross-clubs. | OPS-301→305, OPS-309→316 | Mode Simple = Matrice ; NAV `price_snapshots` = NAV Matrice à ±0,5 %. |
| **E-OPS-4 — Settlement OPCVM & Paramètres club**              | 4      | Workflow de settlement OPCVM (vague, NAV, allocation de parts définitive) + le président configure le mode de calcul + affichage membre selon mode.              | OPS-401→405              | Settlement complet, parts allouées, valeur membre juste, push envoyé. |
| **E-OPS-5 — Fin de dépendance à la Matrice**                  | 5      | Désactivation du sync club par club après convergence, positions/prix calculés depuis `operations`+`price_snapshots`, dépréciation des tables legacy.            | OPS-501→505              | Sync OFF sur ≥1 club, app stable sans Matrice.                        |

**Légende estimation** : **S** ≤ 0,5 j · **M** 1–2 j · **L** 3–5 j · **XL** > 5 j (à re-découper).
**Rôles** : `BE` backend (SQL/RPC/Edge) · `FE` frontend (Next.js/UI) · `FS` fullstack.

---

# E-OPS-1 — Sprint 1 : Fondation DB & Migration

**Objectif d'épic** : poser la table centrale `operations` (append-only, RLS, RPC-only), migrer l'historique
legacy de façon idempotente, et **prouver la cohérence** (solde espèces) sur les 4 clubs avant tout le reste.
**Les 3 décisions ci-dessous sont bloquantes : aucun ticket d'implémentation ne démarre tant qu'elles ne sont
pas entérinées par l'owner.**

---

### DEC-001 — Décision : nombre & périmètre des clubs actifs à migrer

> 🎯 **Objectif** : figer combien de clubs entrent dans la migration et le critère de « migration stable », car ils conditionnent l'Edge Function et l'écran de vérification.

📋 **Description technique**
Le cahier §10.1 pré-tranche **4 clubs actifs** ayant des données dans `contribution_months` + `transactions`. À entériner formellement avant build :

- la boucle de `migrate-to-operations` itère sur ces 4 `club_id` (pas tous les clubs de la base) ;
- l'écran de vérification (OPS-106) affiche les 4 clubs simultanément (network admin) ;
- « migration stable » = delta solde espèces **= 0 sur chacun des 4 clubs**.
  Action owner : confirmer la liste exacte des 4 `club_id` (ou la requête qui les identifie : `clubs.is_active = true AND sheet_id IS NOT NULL` ?) et le seuil de tolérance (±1 € arrondi, cf. critère Sprint 1).

✅ **Critères d'acceptation**

- [ ] La liste des `club_id` (ou la requête de sélection) est écrite et validée par l'owner.
- [ ] Le seuil de tolérance solde espèces est acté (défaut : ±1 €).
- [ ] Décision consignée dans `docs/audits/design-reference-map.md` (ou doc sprint).

🔗 **Dépendances** : aucune (ticket d'ouverture).
⏱ **Estimation** : S
👤 **Qui** : lead dev + owner

---

### DEC-002 — Décision : stratégie provider de prix (abstraction dès Sprint 3)

> 🎯 **Objectif** : entériner l'option « provider de prix indépendant avec couche d'abstraction » dès le Sprint 3, qui débloque le calcul NAV OPCVM et la sortie de Matrice.

📋 **Description technique**
Cahier §10.2 pré-tranche **Option A** : abstraction `PriceProvider` (edge), **`GoogleSheetsProvider`** initial (coût 0, PriceSheet réseau unique aux 4 clubs), **`TwelveDataProvider`** cible (8 $/mois, batch multi-symbol, Euronext), switch par `PRICE_PROVIDER` en Vault sans redéploiement. Optimisation critique : **symboles uniques cross-clubs, 1 seul appel API**.
À entériner : (a) on accepte le coût Twelve Data à terme ; (b) **où vit l'abstraction** — décision lead : **nouvelle** `supabase/functions/_shared/price-provider.ts` (l'abstraction Node existante `packages/data/src/prices/` est côté app, runtime différent, non réutilisable telle quelle en Deno) ; (c) format de symbole interne canonique (`NASDAQ:NVDA`, `EPA:MC`).

✅ **Critères d'acceptation**

- [ ] Option A confirmée + budget Twelve Data acté (ou « rester Sheets en V1 »).
- [ ] Emplacement de l'abstraction tranché (edge `_shared` vs réutilisation Node) et consigné.
- [ ] Format de symbole interne documenté (mapping vers chaque provider).

🔗 **Dépendances** : aucune.
⏱ **Estimation** : S
👤 **Qui** : lead dev + owner

---

### DEC-003 — Décision : autorité de correction post-settlement OPCVM

> 🎯 **Objectif** : figer qui peut annuler/corriger une opération (et une cotisation settlée), car cela détermine la garde des RPC d'écriture.

📋 **Description technique**
Cahier §10.3 pré-tranche : **trésorier autorisé seul**, sans workflow de validation à deux étapes ; président et network admin héritent (tout ce que fait le trésorier). **Conséquence code** : garde unique `is_club_staff(club_id)` dans `record_operation`/`cancel_operation`/`settle_contributions_wave` (couvre treasurer+president+network_admin) ; le network admin global passe aussi par `is_network_admin()`. L'avertissement UI « correction au prix actuel de la part » suffit comme garde de bon sens.
À entériner : pas d'approbation supplémentaire à implémenter (sinon re-scope Sprint 2/4).

✅ **Critères d'acceptation**

- [ ] Confirmation « `is_club_staff` seul, pas de double validation ».
- [ ] Décision consignée ; impacte les gardes d'OPS-201/202/401.

🔗 **Dépendances** : aucune.
⏱ **Estimation** : S
👤 **Qui** : lead dev + owner

---

### OPS-101 — Migration `056` : table `operations` (table + index + RLS + grants)

> 🎯 **Objectif** : créer la table centrale `operations`, append-only, sécurisée RLS + écriture RPC-only.

📋 **Description technique**
Migration `supabase/migrations/056_operations.sql`, sur le patron `038_polls.sql` :

- `CREATE TABLE public.operations (...)` selon cahier §4.1 (colonnes, types, `CHECK` `operations_type_check`/`operations_status_check`/`operations_source_check`/`dividend_stock`/`valuation`). **Ajouter** un CHECK : `membership_id` requis pour `type IN ('contribution','penalty','member_exit')` ; `symbol` requis pour `type IN ('buy','sell','dividend_cash','dividend_stock','valuation')`.
- 6 index du cahier (`idx_operations_club_date`, `_type`, `_member`, `_active`, `_pending_settlement`, `_symbol`).
- Trigger `set_operations_updated_at BEFORE UPDATE ... EXECUTE FUNCTION public.set_updated_at()` (fonction existante).
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; REVOKE ALL FROM public; GRANT SELECT TO authenticated;` (**pas** d'INSERT/UPDATE/DELETE à `authenticated` → écriture RPC-only).
- Policy `operations_select_club_member` (cahier §4.1) : `club_id = ANY(get_user_club_ids()) AND COALESCE((SELECT is_active ...), false)`.
- Regénérer `packages/data/src/supabase/types.gen.ts` (`make db-types`).

✅ **Critères d'acceptation**

- [ ] `make db-reset` applique la migration sans erreur ; `operations` visible.
- [ ] RLS : un membre du club lit les opérations de SON club ; **0 ligne** pour un club tiers (test `rls-isolation`).
- [ ] `authenticated` n'a **aucun** droit INSERT/UPDATE/DELETE direct (tentative → `42501`).
- [ ] Les 6 CHECK rejettent les lignes invalides (test SQL : `dividend_stock` avec `cash_delta≠0` → erreur ; `contribution` sans `membership_id` → erreur).
- [ ] `types.gen.ts` régénéré et commité ; `make typecheck` vert.

🔗 **Dépendances** : DEC-001/002/003.
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-102 — Migration `057` : colonne `memberships.parts`

> 🎯 **Objectif** : ajouter le cache `parts` pour le mode OPCVM, sans casser le mode Simple.

📋 **Description technique**
`057_memberships_parts.sql` : `ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS parts NUMERIC(18,8) DEFAULT 0;` + `COMMENT` (cahier §4.2 : mis à jour par `settle_contributions_wave`, sémantique mode OPCVM). Vérifier qu'aucune policy/vue existante ne `SELECT *` de manière fragile. Regénérer `types.gen.ts`.

✅ **Critères d'acceptation**

- [ ] Colonne présente, défaut `0`, nullable.
- [ ] Aucune régression : `make lint typecheck test` vert (les vues/`member_quote_part` existantes intactes).
- [ ] `types.gen.ts` à jour.

🔗 **Dépendances** : DEC-003 (rôles), peut être //isé avec OPS-101 (fichier de migration distinct).
⏱ **Estimation** : S
👤 **Qui** : BE

---

### OPS-103 — RPC `get_club_cash_balance(club_id)`

> 🎯 **Objectif** : exposer le solde espèces calculé depuis `operations` (Σ `cash_delta` confirmés non annulés).

📋 **Description technique**
Dans `056_operations.sql` (ou `058`), `CREATE FUNCTION public.get_club_cash_balance(p_club_id uuid) RETURNS NUMERIC LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_catalog` = `SELECT COALESCE(SUM(cash_delta),0) FROM operations WHERE club_id = p_club_id AND is_cancelled = FALSE AND status = 'confirmed'`. **Garde lecture** : `SECURITY DEFINER` bypasse la RLS → ajouter en tête une garde `IF NOT (p_club_id = ANY(get_user_club_ids())) THEN RAISE EXCEPTION 'insufficient_privilege'`. `REVOKE ALL ON FUNCTION FROM public; GRANT EXECUTE TO authenticated`.

✅ **Critères d'acceptation**

- [ ] Renvoie `0` sur club vide (jamais NULL).
- [ ] Un membre d'un autre club → `42501` (fail-closed).
- [ ] Ignore lignes `is_cancelled`/`status≠confirmed` (test SQL avec fixtures).

🔗 **Dépendances** : OPS-101.
⏱ **Estimation** : S
👤 **Qui** : BE

---

### OPS-104 — Edge Function `migrate-to-operations` (idempotente)

> 🎯 **Objectif** : alimenter `operations` depuis `contribution_months` + `transactions` sans doublon, relançable.

📋 **Description technique**
`supabase/functions/migrate-to-operations/` sur le patron DI (`index.ts` entrypoint + `handler.ts` `createMigrateHandler(deps)`), client **service-role**. Logique cahier §6.1 :

- `migrateContributions(clubId)` : `contribution_months` `status='paid' AND paid_at IS NOT NULL` → op `contribution`, `cash_delta=+amount`, `operation_date=paid_at`, `source='matrice_migration'`, `metadata={legacy_table, original_id, legacy_year, legacy_month}`.
- `migrateTransactions(clubId)` : `transactions` → `buy`/`sell`/`dividend_cash` (`dividend`+`coupon`)/`fee` (autres) ; `cash_delta` selon table §5.1.
- **Idempotence** : avant chaque insert, `SELECT 1 FROM operations WHERE metadata->>'original_id'=$id AND source='matrice_migration'` → skip si trouvé.
- Entrée : POST `{ club_id }` ; sortie structurée `{ club_id, inserted, skipped, by_type }`.
- Auth : déclencheur manuel network admin → vérifier le rôle (header service-role + garde applicative) — pas d'exposition publique.
- Tests `Deno.test` : insertion correcte par type, **2e run = 0 insert** (idempotence), mapping `cash_delta` signé, club inexistant.

✅ **Critères d'acceptation**

- [ ] Run 1 insère N opérations ; **run 2 insère 0** (idempotent, même `metadata.original_id`).
- [ ] `cash_delta` : `buy` négatif, `sell`/`dividend` positif, `contribution` positif.
- [ ] `dividend_stock` (si présent en legacy) → `cash_delta=0` (respecte le CHECK).
- [ ] Tests Deno verts (`deno test` sur le dossier).
- [ ] Aucune écriture hors `operations` (lecture seule des tables legacy).

🔗 **Dépendances** : OPS-101 ; DEC-001 (liste clubs).
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-105 — Lancement de la migration sur les 4 clubs + rapport de cohérence

> 🎯 **Objectif** : exécuter `migrate-to-operations` sur les 4 clubs et produire le rapport de cohérence legacy vs operations.

📋 **Description technique**
Procédure (doc + commande `make`/script) : appel de l'Edge Function pour chacun des 4 `club_id`, puis calcul des 3 deltas du cahier §6.2 :

- solde espèces : `portfolio_aggregates` (label `Espèces`, via `liquidityFromAggregates` côté lecture) vs `get_club_cash_balance()` → doit être 0 (±tolérance DEC-001) ;
- nb cotisations : `COUNT(contribution_months paid)` vs `COUNT(operations contribution)` ;
- nb transactions : `COUNT(transactions)` vs `COUNT(operations buy|sell|dividend_cash)`.
  Rapport persistant `docs/audits/migration-operations-<date>.md` (1 ligne / club / métrique / delta).

✅ **Critères d'acceptation**

- [ ] Les 4 clubs migrés ; rapport généré et commité.
- [ ] **Delta solde espèces = 0 (±1 €) sur les 4 clubs** (critère Sprint 1 du cahier §8).
- [ ] Tout delta non nul documenté avec hypothèse de cause (input pour OPS-107).

🔗 **Dépendances** : OPS-104, OPS-103.
⏱ **Estimation** : M
👤 **Qui** : BE (+ owner pour validation)

---

### OPS-106 — Écran « Vérification migration » (trésorier / network admin)

> 🎯 **Objectif** : afficher le tableau de comparaison legacy vs operations dans l'app, pour validation visuelle par le trésorier.

📋 **Description technique**
Nouvelle vue dans le groupe admin (ou `/reseau` pour le network admin, vue 4 clubs simultanés — cf. DEC-001). Server Component lisant via `createServerClient` :

- pour le club courant (trésorier) : 3 lignes du §6.2 (métrique, legacy, operations, delta, statut ✓/✗) ;
- pour network admin : grille des 4 clubs.
  Lecture des nombres via `get_club_cash_balance` (RPC) + `count` RLS sur les tables. Tokens design-system, formatage `@evolve/utils` (`formatEUR`), états `empty`/`error`, light **et** dark, i18n `operations.verification.*` (fr+en). Composant présentationnel (`PortfolioTable`-like) dans `@evolve/ui` avec story `play` + test `jest-axe` + cursor-pointer.

✅ **Critères d'acceptation**

- [ ] Trésorier voit les 3 deltas de son club ; un delta 0 est marqué ✓, non-0 ✗ (token `data-negative`, jamais `#E93E3A`).
- [ ] Network admin voit les 4 clubs.
- [ ] Garde : un membre non-staff n'accède pas (redirige `Forbidden`).
- [ ] i18n fr+en (parité OK), rendu light+dark conforme.
- [ ] Story `play` + `jest-axe` 0 violation + `cursor-pointer.spec` vert.

🔗 **Dépendances** : OPS-103, OPS-105.
⏱ **Estimation** : L
👤 **Qui** : FS

---

### OPS-107 — DTO/types `operations` dans `packages/data` + helpers de lecture

> 🎯 **Objectif** : exposer un typage métier strict + helpers d'accès `operations` réutilisables (web), pattern DTO du projet.

📋 **Description technique**
`packages/data/src/operations/` : `types.ts` (`OperationType`, `OperationStatus`, `OperationRow` dérivé de `types.gen.ts`), `mappers/` (row brut → DTO métier), `index.ts` exporté via le barrel `packages/data/src/index.ts`. Helpers de lecture (RLS, `ServerClient`) : `getClubCashBalance(supabase, clubId)` (wrap RPC), `listRecentOperations(supabase, clubId, limit)`. Tests Vitest sur les mappers (edge cases : `cash_delta` null, `symbol` absent, op annulée).

✅ **Critères d'acceptation**

- [ ] Types stricts, zéro `any`, `noUncheckedIndexedAccess` respecté.
- [ ] Mappers testés (Vitest) ; jamais `NaN`/`undefined` en sortie (fallback `null`).
- [ ] Barrel à jour ; `apps/web` importe depuis `@evolve/data`.

🔗 **Dépendances** : OPS-101 (types.gen).
⏱ **Estimation** : M
👤 **Qui** : BE

---

# E-OPS-2 — Sprint 2 : Interface de saisie trésorier

**Objectif d'épic** : permettre au trésorier de saisir et annuler des opérations depuis l'app via RPC, et de
voir le solde espèces + l'historique en temps réel. **Critère** : enregistrer une cotisation, un achat et un
dividende, solde espèces cohérent avec Bourse Direct.

---

### OPS-201 — RPC `record_operation`

> 🎯 **Objectif** : créer une opération depuis l'app, garde staff, audit, cohérence `cash_delta`.

📋 **Description technique**
`058_operations_rpc_write.sql`. `CREATE FUNCTION public.record_operation(...) RETURNS uuid LANGUAGE plpgsql **VOLATILE** SECURITY DEFINER SET search_path = public, auth, pg_catalog` (⚠ **pas STABLE**, cf. note d'arbitrage 1). Signature cahier §4.4.1. Logique :

- garde `IF NOT is_club_staff(p_club_id) THEN RAISE EXCEPTION 'insufficient_privilege'` (fail-closed) ;
- **validation métier** selon `type` (table §5.1) : `buy`→`cash_delta = -(quantity*unit_price*fx_rate)` (tolérance arrondi), `membership_id`/`symbol` requis selon type, `contribution.cash_delta ≥ clubs.min_contribution` (warn ou reject — à acter) ;
- résoudre `recorded_by` = membership active du caller ;
- `INSERT ... status='confirmed'` ;
- **audit via `log_audit_event('record_operation', auth.uid(), 'operations', v_new_id, jsonb_build_object('type',...,'cash_delta',...))`** (PAS d'INSERT direct) ;
- `REVOKE ALL ON FUNCTION FROM public; GRANT EXECUTE TO authenticated`.

✅ **Critères d'acceptation**

- [ ] Non-staff → `42501` ; staff → opération créée, `id` renvoyé.
- [ ] `buy` avec `cash_delta` incohérent vs `quantity×unit_price×fx` → rejet (`22023`).
- [ ] Ligne `audit_log` créée via `log_audit_event` (action `record_operation`).
- [ ] Tests SQL (pgTAP ou script) sur chaque type ; `make test` vert.

🔗 **Dépendances** : OPS-101, DEC-003.
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-202 — RPC `cancel_operation`

> 🎯 **Objectif** : annuler une opération non settlée (append-only : flag, jamais DELETE), garde staff, audit.

📋 **Description technique**
Même migration. `cancel_operation(p_operation_id uuid, p_reason text) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER`. Logique cahier §4.4.2 : récupérer l'op (404 si absente), garde `is_club_staff(v_op.club_id)`, refuser si déjà annulée, **refuser si `parts_allocated IS NOT NULL`** (protection OPCVM settlé → passer par `correction`), `UPDATE ... is_cancelled=true, status='cancelled', cancelled_at/by, cancellation_reason`. Audit `log_audit_event('cancel_operation', ...)`.

✅ **Critères d'acceptation**

- [ ] Op inexistante → erreur claire ; déjà annulée → erreur.
- [ ] Op settlée OPCVM (`parts_allocated` non NULL) → **refus** explicite.
- [ ] Après annulation, `get_club_cash_balance` ignore la ligne.
- [ ] Audit log créé ; garde staff vérifiée.

🔗 **Dépendances** : OPS-201.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-203 — RPC `get_club_positions_from_ops`

> 🎯 **Objectif** : reconstituer les positions (quantité, dernier prix, cash investi) depuis `operations`.

📋 **Description technique**
`get_club_positions_from_ops(p_club_id uuid) RETURNS TABLE(...) LANGUAGE sql SECURITY DEFINER STABLE` (cahier §4.4.5) + garde lecture `p_club_id = ANY(get_user_club_ids())`. Précisions (note d'arbitrage 5) : la sous-requête `last_unit_price` exclut `is_cancelled` et **considère `valuation`** comme source de prix la plus récente si postérieure à la dernière transaction ; `total_quantity` = Σ(`buy`+`dividend_stock`) − Σ(`sell`) ; `HAVING quantity > 0`.

✅ **Critères d'acceptation**

- [ ] Quantité agrégée correcte (buy + dividend_stock − sell), positions soldées exclues (`HAVING > 0`).
- [ ] `last_unit_price` = prix le plus récent (transaction OU valuation), hors annulées.
- [ ] Garde cross-club fail-closed ; renvoie 0 ligne pour club tiers.
- [ ] Tests SQL avec fixtures multi-opérations.

🔗 **Dépendances** : OPS-101.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-204 — UI « Nouvelle opération » (formulaire multi-type)

> 🎯 **Objectif** : un formulaire trésorier qui couvre les types V1 (`contribution`, `buy`, `sell`, `dividend_cash`, `dividend_stock`, `fee`, `penalty`, `valuation`) et appelle `record_operation`.

📋 **Description technique**
Onglet « Opérations » ajouté à `AdminTabs.tsx` ; route `apps/web/app/(app)/admin/operations/`. Formulaire (client component + Server Action `recordOperationAction` enveloppée `withAudit`, appelant `supabase.rpc('record_operation', {...})`, erreurs mappées via `mapPgError`). Champs conditionnels selon `type` (cf. §5.1) : membre (sélecteur memberships actives) pour contribution/penalty/member_exit ; symbol/asset_name/quantity/unit_price/currency/fx_rate pour buy/sell/dividend/valuation ; **calcul auto + affichage du `cash_delta`** signé avant submit. Composant présentationnel `OperationForm` dans `@evolve/ui` (tokens, cibles ≥44px, focus glow, cursor-pointer). i18n `operations.form.*` (fr+en).

✅ **Critères d'acceptation**

- [ ] Trésorier enregistre une cotisation, un achat, un dividende → 3 lignes `operations` créées.
- [ ] `cash_delta` affiché et signé correctement avant envoi (achat négatif).
- [ ] Erreur `forbidden`/`invalid` rendue proprement (pas de crash, message FR/EN).
- [ ] Story `play` (remplissage + submit simulé), `jest-axe` 0, cursor-pointer vert, light+dark.

🔗 **Dépendances** : OPS-201, OPS-107.
⏱ **Estimation** : XL
👤 **Qui** : FS

---

### OPS-205 — UI « Opérations récentes » du club (+ annulation)

> 🎯 **Objectif** : lister les opérations récentes du club, avec action d'annulation (staff) appelant `cancel_operation`.

📋 **Description technique**
Sous la route `/admin/operations` : table des dernières opérations (date, type badge, membre/actif, montant `cash_delta`, statut, source). Lecture via `listRecentOperations` (RLS). Action d'annulation (avec motif obligatoire) via Server Action → `cancel_operation`. Lignes annulées barrées/grisées. Composant `OperationsTable` dans `@evolve/ui`. i18n + light/dark + cursor-pointer.

✅ **Critères d'acceptation**

- [ ] Liste triée par `operation_date DESC`, pagination/limite raisonnable.
- [ ] Annulation : modale motif → ligne passe `cancelled`, solde recalculé.
- [ ] Op settlée OPCVM : bouton annuler désactivé + tooltip « utiliser une correction ».
- [ ] Story `play` + axe 0 + cursor-pointer vert.

🔗 **Dépendances** : OPS-202, OPS-107.
⏱ **Estimation** : L
👤 **Qui** : FS

---

### OPS-206 — UI « Solde espèces temps réel »

> 🎯 **Objectif** : afficher le solde espèces du club (depuis `get_club_cash_balance`) en tête de l'espace Opérations.

📋 **Description technique**
KPI carte en tête de `/admin/operations`, lit `getClubCashBalance` (RPC). Formatage `formatEUR` (NBSP), états empty/error, peut être négatif (rendu neutre, jamais brand-red). Re-fetch après chaque saisie/annulation (revalidate). i18n.

✅ **Critères d'acceptation**

- [ ] Solde = Σ `cash_delta` confirmés ; cohérent après saisie/annulation (revalidation).
- [ ] Jamais `NaN`/`undefined` ; `—` si erreur.
- [ ] Négatif rendu en token neutre/`data-negative` selon sémantique, pas `#E93E3A`.

🔗 **Dépendances** : OPS-103, OPS-204.
⏱ **Estimation** : M
👤 **Qui** : FE

---

### OPS-207 — QA Sprint 2 : cohérence solde + e2e saisie trésorier

> 🎯 **Objectif** : prouver runtime que la saisie est sécurisée, gated, et que le solde reste cohérent (critère Sprint 2).

📋 **Description technique**
Cycle QA (`qa-orchestrator`) ciblé : unit (RPC/mappers), e2e Playwright (login trésorier seed → saisie cotisation+achat+dividende → vérifie solde ; login membre simple → 403 sur `/admin/operations`), a11y (axe), visual light/dark vs design-system. Seed : club + trésorier + memberships dédiés (isoler du club E2E `aaaa`, cf. patron seed votes). Scorecard ≥ 97 %.

✅ **Critères d'acceptation**

- [ ] e2e : trésorier saisit 3 ops, solde affiché = somme attendue.
- [ ] e2e : membre non-staff → `Forbidden` sur l'espace Opérations.
- [ ] `make lint typecheck test` exit 0 ; e2e workers=1 verts ; cursor-pointer vert.
- [ ] Rapport QA `docs/qa/QA_REPORT_<date>.md` PASS.

🔗 **Dépendances** : OPS-204→206.
⏱ **Estimation** : L
👤 **Qui** : FS + QA agents

---

# E-OPS-3 — Sprint 3 : Calcul dual des quotes-parts + Provider de prix

**Objectif d'épic** : calculer Mode Simple ET Mode OPCVM en parallèle (preview trésorier) et rendre la NAV
indépendante de la Matrice via un provider de prix abstrait cross-clubs. **Critères** : Mode Simple = Matrice ;
NAV `price_snapshots` = NAV Matrice à ±0,5 % ; switch provider par Vault sans redéploiement ; 1 appel API tous clubs.

---

### OPS-301 — RPC `get_member_share_simple`

> 🎯 **Objectif** : quote-part Mode Simple = Σ(contributions membre) / Σ(contributions club), valorisée par la NAV.

📋 **Description technique**
`059_share_modes.sql`. `get_member_share_simple(p_club_id uuid) RETURNS TABLE(membership_id, total_contributed, detention_pct_simple) LANGUAGE sql SECURITY DEFINER STABLE` + garde lecture cross-club. `detention_pct = Σ cash_delta (type=contribution, non annulé) du membre / Σ club` (NULLIF pour éviter /0). `value_membre = NAV × pct` calculé côté app (NAV = positions/aggregates legacy + `get_club_cash_balance` pendant transition, cf. §5.2).

✅ **Critères d'acceptation**

- [ ] Σ des `detention_pct_simple` du club = 1 (±arrondi) si ≥1 contribution.
- [ ] Club sans contribution → pct NULL (pas de /0).
- [ ] Garde cross-club fail-closed.
- [ ] **Mode Simple = ce qu'affiche la Matrice** sur ≥1 club (validation OPS-305).

🔗 **Dépendances** : OPS-101.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-302 — RPC `get_member_share_opcvm`

> 🎯 **Objectif** : quote-part Mode OPCVM = `memberships.parts` × (NAV / Σ parts).

📋 **Description technique**
`get_member_share_opcvm(p_club_id uuid) RETURNS TABLE(membership_id, parts_owned, parts_pct) LANGUAGE sql SECURITY DEFINER STABLE` + garde. `parts_pct = parts / NULLIF(Σ parts club, 0)`. `value_membre = parts_pct × NAV` (app). Tient compte uniquement des memberships `status='active'`.

✅ **Critères d'acceptation**

- [ ] Σ `parts_pct` = 1 (±arrondi) si Σ parts > 0 ; sinon NULL.
- [ ] Garde cross-club fail-closed.
- [ ] Cohérent avec les parts allouées par OPS-401 (test après settlement).

🔗 **Dépendances** : OPS-102.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-303 — Edge Function `calculate-share-modes`

> 🎯 **Objectif** : calculer les deux modes en parallèle pour un club (preview trésorier), traitement potentiellement lourd hors requête web.

📋 **Description technique**
`supabase/functions/calculate-share-modes/` (patron DI). Entrée POST `{ club_id }` (appel trésorier authentifié — vérifier rôle). Combine `get_member_share_simple` + `get_member_share_opcvm` + NAV, renvoie un tableau par membre `{ membership_id, name, simple_pct, simple_value, opcvm_parts, opcvm_pct, opcvm_value, delta }`. Tests Deno (DI) : cohérence, club vide, somme des pourcentages.

✅ **Critères d'acceptation**

- [ ] Renvoie les deux modes par membre + delta, en 1 réponse.
- [ ] Auth : non-staff rejeté.
- [ ] Tests Deno verts ; pas de service-role exposé au client.

🔗 **Dépendances** : OPS-301, OPS-302.
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-304 — Vue `member_share_dual` (security_invoker)

> 🎯 **Objectif** : exposer en une vue les deux modes (Simple + OPCVM) par membre, RLS-safe.

📋 **Description technique**
`CREATE VIEW public.member_share_dual WITH (security_invoker = on) AS ...` (cahier §7) — **`security_invoker = on` obligatoire** (note d'arbitrage 3) pour que la RLS de `memberships`/`operations` s'applique à l'appelant. `GRANT SELECT ON member_share_dual TO authenticated` (explicite, auto-expose off). Window function pour `detention_pct_simple`.

✅ **Critères d'acceptation**

- [ ] Un membre du club A ne voit **que** les lignes du club A via la vue (test RLS).
- [ ] `detention_pct_simple` cohérent avec OPS-301 ; `parts_owned` exposé.
- [ ] `make test` vert ; vue dans `types.gen.ts`.

🔗 **Dépendances** : OPS-301, OPS-302.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-305 — UI « Comparatif Simple vs OPCVM » (trésorier)

> 🎯 **Objectif** : tableau preview trésorier des deux modes côte à côte, pour valider la cohérence avant bascule.

📋 **Description technique**
Vue `/admin/operations/quotes-parts` (staff only). Appelle `calculate-share-modes` (ou lit `member_share_dual`). Tableau 2 colonnes par membre (Simple / OPCVM) + delta + total. Tokens, `formatEUR`/`formatPct`, light/dark, i18n `operations.shares.*`. Bandeau « preview trésorier — mode affiché aux membres : {mode actif} ». Composant `@evolve/ui` + story `play` + axe + cursor-pointer.

✅ **Critères d'acceptation**

- [ ] Le trésorier voit les 2 colonnes ; **colonne Simple = Matrice** (validation manuelle, consignée).
- [ ] Garde staff ; membre simple → Forbidden.
- [ ] i18n fr+en, light+dark, axe 0, cursor-pointer vert.

🔗 **Dépendances** : OPS-303 (ou OPS-304).
⏱ **Estimation** : L
👤 **Qui** : FS

---

### OPS-309 — Migration `060` : table `price_snapshots`

> 🎯 **Objectif** : stocker les cours collectés par le provider de prix (clé du calcul NAV indépendant).

📋 **Description technique**
`060_price_snapshots.sql` : table `price_snapshots(id, symbol text, price numeric(18,6), currency char(3), captured_at timestamptz, source text, created_at)` + index `(symbol, captured_at DESC)`. RLS : `ENABLE`, `REVOKE ALL FROM public`, `GRANT SELECT TO authenticated` (lecture cross-clubs OK — un cours n'est pas nominatif ; à confirmer), écriture **service-role uniquement** (sync-prices). Pas de PII → SELECT large acceptable. Regénérer types.

✅ **Critères d'acceptation**

- [ ] Table + index créés ; RLS activée ; `authenticated` lecture seule.
- [ ] Écriture interdite à `authenticated` (service-role only).
- [ ] `types.gen.ts` à jour.

🔗 **Dépendances** : DEC-002.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-310 — Abstraction `_shared/price-provider.ts` + factory `getProvider()`

> 🎯 **Objectif** : interface `PriceProvider` + factory pilotée par `PRICE_PROVIDER` (Vault), point unique d'extension.

📋 **Description technique**
`supabase/functions/_shared/price-provider.ts` (Deno) : interfaces `PriceResult`/`PriceProvider` (cahier §10.2), `getProvider()` lisant `Deno.env.get('PRICE_PROVIDER') ?? 'google_sheets'` → switch. Format symbole interne canonique (DEC-002). Tests Deno : factory renvoie le bon provider, défaut, provider inconnu → throw.

✅ **Critères d'acceptation**

- [ ] `getProvider()` mappe `google_sheets`/`twelve_data` ; inconnu → erreur explicite.
- [ ] Interface stable documentée ; aucun couplage métier (seul fichier à toucher pour un nouveau provider).
- [ ] Tests Deno verts.

🔗 **Dépendances** : DEC-002.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-311 — `GoogleSheetsProvider` (provider initial, coût zéro)

> 🎯 **Objectif** : implémenter le provider Google Sheets proxy (PriceSheet réseau unique), même pattern technique que `sync`.

📋 **Description technique**
`GoogleSheetsProvider implements PriceProvider` : lit le PriceSheet (un seul Sheet commun aux 4 clubs, `PRICE_SHEET_ID`) via le `readSheet`/JWT RS256 déjà éprouvé dans `sync/readSheet.ts`. `fetchPrices(symbols)` → mappe les lignes du PriceSheet vers `PriceResult[]`. Tests Deno avec fixtures.

✅ **Critères d'acceptation**

- [ ] `fetchPrices` renvoie un `PriceResult` par symbole connu, `null`/absent géré.
- [ ] Symbole inconnu du PriceSheet → non bloquant (warning).
- [ ] Tests Deno verts (fixtures Sheet).

🔗 **Dépendances** : OPS-310, OPS-313.
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-312 — `TwelveDataProvider` (provider cible, prêt à activer)

> 🎯 **Objectif** : implémenter le provider Twelve Data (batch multi-symbol) activable par Vault sans redéploiement.

📋 **Description technique**
`TwelveDataProvider implements PriceProvider` : `fetchPrices(symbols)` → **un seul** appel batch (`/price?symbol=a,b,c`) avec `TWELVE_DATA_API_KEY`, mapping symbole interne → format Twelve Data + parsing réponse → `PriceResult[]`. Gestion quota/erreurs (best-effort, log). Tests Deno avec fetch stubbé.

✅ **Critères d'acceptation**

- [ ] **Un seul** appel API pour N symboles (batch) — vérifié en test (fetch stub compte 1 appel).
- [ ] Mapping symbole correct (Euronext `EPA:MC` → format provider).
- [ ] `PRICE_PROVIDER=twelve_data` active ce provider via `getProvider()` sans changement de code métier.
- [ ] Tests Deno verts.

🔗 **Dépendances** : OPS-310.
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-313 — PriceSheet réseau (Google Sheet commun) + Vault

> 🎯 **Objectif** : provisionner le Google Sheet de prix commun aux 4 clubs et les variables Vault associées.

📋 **Description technique**
Tâche ops/config : créer le PriceSheet (colonnes symbole + `=GOOGLEFINANCE(...)`), le partager au service account Google existant (`GOOGLE_SA_KEY_BASE64`). Ajouter au Vault Supabase : `PRICE_PROVIDER=google_sheets`, `PRICE_SHEET_ID`, `TWELVE_DATA_API_KEY` (placeholder). Documenter dans `ARCHITECTURE.md` §8 (env vars).

✅ **Critères d'acceptation**

- [ ] PriceSheet accessible par le service account (probe OK).
- [ ] Variables Vault posées (3) ; documentées.
- [ ] Aucune clé secrète commitée.

🔗 **Dépendances** : DEC-002.
⏱ **Estimation** : M
👤 **Qui** : BE (ops)

---

### OPS-314 — Edge Function `sync-prices` (symboles uniques cross-clubs)

> 🎯 **Objectif** : collecter les symboles uniques de tous les clubs en 1 requête SQL, 1 appel provider, insérer dans `price_snapshots`.

📋 **Description technique**
`supabase/functions/sync-prices/` (patron DI, service-role). Pipeline cahier §7 : `SELECT DISTINCT symbol FROM operations WHERE symbol IS NOT NULL` (ou positions legacy pendant transition) tous clubs confondus → `getProvider().fetchPrices(uniqueSymbols)` (**1 appel**) → `INSERT price_snapshots`. Idempotence raisonnable (1 snapshot horodaté par run). Tests Deno : collecte unique (NVIDIA dans 3 clubs → 1 fetch), insertion, provider switch.

✅ **Critères d'acceptation**

- [ ] Un symbole partagé par N clubs est fetché **une seule fois**.
- [ ] `price_snapshots` peuplé avec `source` = nom du provider.
- [ ] Bascule provider via Vault sans redéploiement (test avec les 2 providers stubbés).
- [ ] Tests Deno verts.

🔗 **Dépendances** : OPS-309, OPS-310, OPS-311.
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-315 — Cron `sync-prices-every-2h` (pg_cron)

> 🎯 **Objectif** : déclencher `sync-prices` toutes les 2 h, patron cron idempotent existant.

📋 **Description technique**
`061_cron_sync_prices.sql` : `cron.unschedule('sync-prices-every-2h') WHERE EXISTS ...` puis `cron.schedule('sync-prices-every-2h', '0 */2 * * *', $$ SELECT net.http_post(url := current_setting('app.sync_prices_url', true), headers := ..., body := '{}'::jsonb); $$)`. Renseigner `app.sync_prices_url` (patron migr. 032/Vault).

✅ **Critères d'acceptation**

- [ ] Job planifié, idempotent (re-run migration sans doublon de job).
- [ ] Déclenche bien `sync-prices` (vérif manuelle / log).
- [ ] 180 crédits/jour ≈ estimation cahier (4 clubs × ~15 symboles × 12 runs) — documenté.

🔗 **Dépendances** : OPS-314.
⏱ **Estimation** : S
👤 **Qui** : BE

---

### OPS-316 — NAV depuis `price_snapshots` (au lieu de `positions.market_price_eur`)

> 🎯 **Objectif** : faire lire la valorisation par le calcul NAV depuis `price_snapshots`, prouver l'équivalence ±0,5 %.

📋 **Description technique**
Adapter le calcul de NAV (app/Edge) : `NAV = Σ(quantity_from_ops × dernier price_snapshots[symbol]) + get_club_cash_balance`. Conserver le chemin legacy en parallèle (feature flag) pour comparer. Helper `packages/data` `navFromSnapshots(...)`. Tests unitaires + script de comparaison legacy vs snapshots sur les 4 clubs.

✅ **Critères d'acceptation**

- [ ] **NAV(price_snapshots) = NAV(positions.market_price_eur) à ±0,5 %** sur les 4 clubs (rapport consigné).
- [ ] Fallback propre si un symbole n'a pas de snapshot (`—`/exclusion documentée, jamais NaN).
- [ ] Tests verts ; flag de bascule documenté.

🔗 **Dépendances** : OPS-309, OPS-314, OPS-203.
⏱ **Estimation** : L
👤 **Qui** : FS

---

# E-OPS-4 — Sprint 4 : Settlement OPCVM & Paramètres club

**Objectif d'épic** : workflow de settlement OPCVM complet (vague hebdo, NAV saisie, allocation de parts
définitive), configuration du mode par le président, affichage membre selon le mode actif, push sur settlement.
**Critère** : un settlement complet alloue les parts et la valeur membre est correctement calculée.

---

### OPS-401 — RPC `settle_contributions_wave`

> 🎯 **Objectif** : settler toutes les cotisations `pending` d'un club (prix de part = NAV / Σ parts), allouer les parts, de façon définitive.

📋 **Description technique**
`062_settle_wave.sql`. `settle_contributions_wave(p_club_id uuid, p_reference_nav numeric, p_settlement_date date default current_date) RETURNS jsonb LANGUAGE plpgsql **VOLATILE** SECURITY DEFINER` (cahier §4.4.3). Logique : garde `is_club_staff` ; vérifier `settings->>'share_calculation_mode' = 'opcvm'` (sinon RAISE) ; `v_total_parts = Σ parts (active)` ; `v_price_per_part = (v_total_parts=0 ? 1.0 : p_reference_nav / v_total_parts)` ; boucle sur les cotisations `confirmed, non annulées, settlement_date IS NULL` → `parts = cash_delta / price`, `UPDATE operations(settlement_date, parts_allocated, part_price_at_settlement)`, `UPDATE memberships.parts += parts`. Audit `log_audit_event('settle_contributions_wave', ...)`. Retour `{settled_count, total_parts_created, price_per_part}`.

✅ **Critères d'acceptation**

- [ ] Non-OPCVM → RAISE ; non-staff → `42501`.
- [ ] 1er settlement (0 part) → prix part = 1 €.
- [ ] Après settlement : chaque cotisation a `parts_allocated` + `part_price_at_settlement` ; `memberships.parts` incrémenté ; somme cohérente.
- [ ] Re-run : 0 cotisation re-settlée (les `settlement_date` non NULL sont exclues) → idempotent.
- [ ] Audit log créé ; tests SQL verts.

🔗 **Dépendances** : OPS-102, OPS-201, DEC-003.
⏱ **Estimation** : XL
👤 **Qui** : BE

---

### OPS-402 — UI « Settlement » (vague, NAV, confirmation définitive)

> 🎯 **Objectif** : écran trésorier listant les cotisations pending, saisie de la NAV, avertissement « définitif », confirmation.

📋 **Description technique**
`/admin/operations/settlement` (staff, OPCVM only). Liste cotisations `pending` (vague courante), champ NAV (€), preview prix de part + parts par membre, **avertissement explicite « le settlement est définitif »** (modale double-confirm type `SensitiveConfirmModal`, token `data-warning`/`data-negative`, jamais brand-red), Server Action → `settle_contributions_wave`. Affiche le résultat (`settled_count`, prix de part). i18n `operations.settlement.*`. Composant `@evolve/ui` + story `play` + axe + cursor-pointer.

✅ **Critères d'acceptation**

- [ ] Cotisations pending listées ; preview parts correct avant confirmation.
- [ ] Double confirmation obligatoire ; après succès, liste vidée + résumé.
- [ ] Mode Simple → écran masqué/désactivé.
- [ ] Story `play`, axe 0, cursor-pointer vert, light+dark, i18n fr+en.

🔗 **Dépendances** : OPS-401.
⏱ **Estimation** : XL
👤 **Qui** : FS

---

### OPS-403 — UI Paramètres club : mode de calcul (président)

> 🎯 **Objectif** : permettre au président de basculer `share_calculation_mode` (simple ↔ opcvm) via `update_club_settings`.

📋 **Description technique**
Étendre `/admin/settings` : sélecteur de mode + paramètres `contribution_settlement` (batch_day, batch_hour_utc, reference_nav). Server Action → `update_club_settings` (RPC existante migr. 025, **étendre** pour accepter ces clés JSONB avec garde président). Avertissement sur la portée du changement (impacte l'affichage membre). i18n. **Garde** : `get_user_role_in_club = 'president'` (ou network_admin), pas tout staff (décision : seul le président bascule le mode — à confirmer, sinon `is_club_staff`).

✅ **Critères d'acceptation**

- [ ] Président bascule simple↔opcvm ; persisté dans `clubs.settings`.
- [ ] Trésorier (non-président) : selon décision, accès restreint au mode (consigné).
- [ ] `update_club_settings` valide les valeurs (mode ∈ {simple,opcvm}) ; audit log.
- [ ] i18n fr+en, light+dark.

🔗 **Dépendances** : OPS-101, extension `update_club_settings`.
⏱ **Estimation** : L
👤 **Qui** : FS

---

### OPS-404 — Affichage membre selon le mode actif du club

> 🎯 **Objectif** : la quote-part/valeur affichée au membre suit `share_calculation_mode` (Simple ou OPCVM).

📋 **Description technique**
Adapter les vues membre (dashboard / portefeuille) : si `settings.share_calculation_mode='opcvm'` → afficher `get_member_share_opcvm` (parts + valeur), sinon `get_member_share_simple`. Le membre ne voit **qu'un** mode (le trésorier voit les deux, OPS-305). Réutiliser les helpers `packages/data`. i18n. Ne pas régresser l'attestation (la valo portefeuille reste alignée sur `/portfolio`).

✅ **Critères d'acceptation**

- [ ] Club en mode Simple → membre voit la quote-part Simple ; mode OPCVM → parts + valeur OPCVM.
- [ ] Aucun mode « preview » fuité au membre.
- [ ] Pas de régression dashboard/portefeuille/attestation (`make test` + e2e).
- [ ] i18n fr+en, light+dark.

🔗 **Dépendances** : OPS-301, OPS-302, OPS-403.
⏱ **Estimation** : L
👤 **Qui** : FS

---

### OPS-405 — Notification push « settlement confirmé »

> 🎯 **Objectif** : notifier les membres concernés quand une vague est settlée (parts allouées).

📋 **Description technique**
Sur le patron push existant (`dispatch-push`, `packages/data/src/notifications/`) : après `settle_contributions_wave` réussi, déclencher une notification (Server Action / event) « Vos parts ont été mises à jour » aux membres du club. Respecter la `NOTIFY_ALLOWLIST` en mode test. Templates i18n.

✅ **Critères d'acceptation**

- [ ] Settlement réussi → notification envoyée aux membres actifs (allowlist en test).
- [ ] Aucun envoi si settlement échoue ; best-effort (n'interrompt pas la RPC).
- [ ] Template fr+en ; test unitaire du déclenchement.

🔗 **Dépendances** : OPS-401, infra push existante.
⏱ **Estimation** : M
👤 **Qui** : BE

---

# E-OPS-5 — Sprint 5 : Fin de dépendance à la Matrice

**Objectif d'épic** : désactiver le sync Matrice club par club après convergence, calculer positions/prix depuis
`operations`+`price_snapshots`, et déprécier (sans supprimer) les tables legacy. **Critère** : ≥1 club tourne
sans Matrice, app stable.

---

### OPS-501 — Toggle `is_matrice_dependent` par club (settings)

> 🎯 **Objectif** : flag par club pour activer/désactiver la dépendance Matrice, pilotable sans déploiement.

📋 **Description technique**
Clé `clubs.settings.is_matrice_dependent` (bool, défaut `true`). Écriture via `update_club_settings` (président/network admin). Lecture côté sync + côté app (le calcul bascule sur `operations`/`price_snapshots` quand `false`). Documenter.

✅ **Critères d'acceptation**

- [ ] Flag lisible/écrivable via settings ; défaut `true` (comportement actuel inchangé).
- [ ] Audit log sur changement.
- [ ] Documenté dans `design-reference-map.md`.

🔗 **Dépendances** : OPS-403 (extension settings).
⏱ **Estimation** : M
👤 **Qui** : FS

---

### OPS-502 — Désactivation du sync club par club

> 🎯 **Objectif** : faire respecter `is_matrice_dependent=false` par le cron/Edge `sync` (ne plus écraser les données natives).

📋 **Description technique**
Modifier le cron `sync-clubs-every-2h` (migr. 013) et/ou `sync/index.ts` : exclure les clubs `settings.is_matrice_dependent = false` de la boucle (la requête `clubs WHERE sheet_id IS NOT NULL` ajoute `AND COALESCE((settings->>'is_matrice_dependent')::bool, true)`). Procédure de bascule **un club à la fois** (4 clubs), après validation OPS-105/OPS-316 sur ce club.

✅ **Critères d'acceptation**

- [ ] Un club `is_matrice_dependent=false` n'est plus synché (vérif log/snapshots).
- [ ] Les 3 autres continuent à être synchés normalement.
- [ ] Aucune écriture sync sur le club désactivé (positions/contributions natives préservées).

🔗 **Dépendances** : OPS-501 ; convergence OPS-105 + OPS-316 sur le club.
⏱ **Estimation** : L
👤 **Qui** : BE

---

### OPS-503 — Positions calculées depuis `operations` uniquement

> 🎯 **Objectif** : pour les clubs hors Matrice, servir les positions depuis `get_club_positions_from_ops` + `price_snapshots`, sans lire `positions` legacy.

📋 **Description technique**
Dans `apps/web/lib/data/portfolio.ts`, brancher : si `is_matrice_dependent=false` → positions via `get_club_positions_from_ops` + valorisation `price_snapshots` (`navFromSnapshots`), sinon chemin legacy actuel (`positions`/`portfolio_aggregates`). Conserver `totalFromAggregates`/`liquidityFromAggregates` comme fallback legacy. Pas de NaN/empty.

✅ **Critères d'acceptation**

- [ ] Club hors Matrice : page `/portfolio` affiche les positions reconstruites (quantité, valeur), solde espèces depuis `get_club_cash_balance`.
- [ ] Club encore Matrice : comportement inchangé.
- [ ] Parité visuelle `/portfolio` (light/dark) ; pas de régression e2e portefeuille.

🔗 **Dépendances** : OPS-203, OPS-316, OPS-502.
⏱ **Estimation** : XL
👤 **Qui** : FS

---

### OPS-504 — Dépréciation (lecture seule) des tables legacy

> 🎯 **Objectif** : marquer `contribution_months`, `transactions`, `portfolio_aggregates`, `club_reporting_daily`, `sheet_snapshots` comme legacy lecture-seule, sans suppression (cahier §3.3).

📋 **Description technique**
Pour les clubs hors Matrice : plus aucune écriture par le sync (assuré par OPS-502). Ajouter `COMMENT ON TABLE` « LEGACY — lecture seule depuis NEO, ne plus écrire ». Optionnel : politique/trigger empêchant l'écriture service-role pour les clubs `is_matrice_dependent=false` (à arbitrer — risque sur le sync des autres clubs). **Aucun DROP en V1** (règle §3.3). Documenter le plan de suppression future.

✅ **Critères d'acceptation**

- [ ] Commentaires de dépréciation posés ; doc de plan de suppression écrite.
- [ ] Aucune table supprimée ; lecture toujours possible (audit/historique).
- [ ] Les clubs encore Matrice continuent d'écrire normalement (pas de régression).

🔗 **Dépendances** : OPS-502.
⏱ **Estimation** : M
👤 **Qui** : BE

---

### OPS-505 — `positions` → vue dérivée depuis `operations` + `price_snapshots`

> 🎯 **Objectif** : à terme, remplacer la table `positions` (clubs hors Matrice) par une vue dérivée live, sans casser les consommateurs.

📋 **Description technique**
Concevoir une vue `positions_derived` (security_invoker) joignant `get_club_positions_from_ops` + dernier `price_snapshots` par symbole → colonnes équivalentes à `positions` (quantity, market_price, market_value, pump calculé). Stratégie de bascule : la couche `packages/data` lit la vue pour les clubs hors Matrice. **Ne pas DROP `positions`** (legacy conservée). PUMP calculé (cahier §5.3) en SQL ou app.

✅ **Critères d'acceptation**

- [ ] Vue `positions_derived` renvoie des positions cohérentes avec `get_club_positions_from_ops` + prix snapshot.
- [ ] PUMP calculé conforme à l'algorithme §5.3 (test sur séquence buy/sell/dividend_stock).
- [ ] RLS-safe (security_invoker) ; aucun consommateur cassé ; `positions` legacy intacte.

🔗 **Dépendances** : OPS-503.
⏱ **Estimation** : XL
👤 **Qui** : BE

---

## Récapitulatif & séquençage

- **Chemin critique** : OPS-101 → OPS-104/103 → OPS-105 (convergence) → OPS-201 → OPS-401 → OPS-316 → OPS-502 → OPS-503.
- **Parallélisable** : OPS-102 ∥ OPS-101 ; le bloc provider de prix (OPS-309→316) ∥ le bloc quotes-parts (OPS-301→305) au Sprint 3 ; UI (OPS-204/205/206) après les RPC correspondantes.
- **Ressources partagées à sérialiser** : `types.gen.ts` (régénéré à chaque migration → 1 seul implémenteur à la fois), `AdminTabs.tsx`/barrels `@evolve/data`/`@evolve/ui` (câblage par le lead), numéros de migration (056→062 réservés ici, à confirmer au moment du commit).
- **Gate « fait » par ticket** (rappel CLAUDE.md) : critères OK + `make lint typecheck test` exit 0 + tests de la couche touchée (Storybook `play` / Deno / e2e workers=1) + rendu runtime light & dark + i18n fr/en parité + doc/`design-reference-map` à jour.
- **Commits FR atomiques par ticket**, scopes Conventional Commits (`supabase|data|web|ui|infra|ci`). Push sur demande.

> ⚠ **Avant de coder** : les tickets `DEC-001/002/003` doivent être entérinés par l'owner. Les écarts au cahier
> des charges relevés en _Notes d'arbitrage technique_ (RPC `VOLATILE`, audit via `log_audit_event`, vue
> `security_invoker`, validation `cash_delta`, sélection des positions) sont des **corrections de conformité aux
> conventions réelles du repo** — à valider en revue de ce backlog.
