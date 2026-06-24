# Rapport de cohérence — migration legacy → `operations` (OPS-105)

**Date** : 2026-06-25
**Auteur** : IMPLEMENTER backend / analyste de données (orchestration vague OPS-1xx)
**Ticket** : OPS-105 (cahier §6.2 — convergence legacy vs module Opérations natif)
**Périmètre** : exécution de l'Edge `migrate-to-operations` + rapport de convergence des 3 métriques §6.2.

---

## 1. Contexte & décisions

Le module Opérations natif (table `operations`, migrations `057`/`058`/`059`) remplace la dérivation
Matrice comme source de vérité de la trésorerie et des parts. L'Edge `migrate-to-operations` (POST
`{club_id}`, Bearer service-role) reporte le LEGACY (`contribution_months` payées + `transactions`
boursières) vers `operations`, en **lecture seule** sur les tables sources (LD-6), avec une
**idempotence par tuple naturel** (jamais l'`id` legacy volatil — cf. en-tête `handler.ts`).

OPS-105 **mesure et documente** l'écart entre les deux mondes, **sans injecter aucune opération de
calage**.

### Décisions actées

- **DEC-001 — Sélection des clubs à migrer (prod)** : `is_active = TRUE AND sheet_id IS NOT NULL`.
  Un club archivé ou non rattaché à une Matrice n'est pas migré.
- **DEC-002 — Tolérance solde espèces** : `|delta| ≤ 1 €` (arrondi NUMERIC(18,4) + cumul de
  centimes). Au-delà → écart à expliquer avant calage.
- **DEC-003 — Convergence = documenter, pas injecter** : un écart non nul sur le solde espèces n'est
  PAS comblé par une opération artificielle. La cause probable (solde d'ouverture Matrice non porté
  par le legacy) est documentée et rediscutée avant Sprint 2.

### ⚠ Limite de la preuve locale

La DB **locale** (`make db-reset`) ne contient PAS les 4 vrais clubs de prod ni leurs vrais soldes
Matrice. Le critère « delta = 0 ±1 € sur les 4 clubs RÉELS » **n'est donc pas prouvable en local** :
c'est une **action de validation PROD par l'owner** (cf. §5). Ce qui est prouvé ici = le
**MÉCANISME** (mapping, signes cash, idempotence, convergence des compteurs) sur 2 fixtures
contrôlées.

### Définition des 3 métriques (cahier §6.2)

| Métrique            | Legacy                                                                                                                            | Operations                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Solde espèces**   | `portfolio_aggregates.market_value` du label normalisé `especes` (cf. `apps/web/lib/data/portfolio.ts` `liquidityFromAggregates`) | `get_club_cash_balance(club_id)` = Σ `cash_delta` (actives + confirmées)        |
| **Nb cotisations**  | `COUNT(contribution_months WHERE status='paid' AND paid_at IS NOT NULL)`                                                          | `COUNT(operations WHERE type='contribution' AND NOT is_cancelled)`              |
| **Nb transactions** | `COUNT(transactions)`                                                                                                             | `COUNT(operations WHERE type IN (buy,sell,dividend_cash) AND NOT is_cancelled)` |

> `delta = operations − legacy`. Un delta espèces **négatif** signifie qu'`operations` est **en
> dessous** de la Matrice (du cash que le legacy ne porte pas, typiquement un solde d'ouverture).

---

## 2. Fixtures locales (preuve du mécanisme)

Deux clubs contrôlés semés via `supabase/migrations/__checks__/OPS-105_convergence_fixtures.sql`
(données legacy **identiques**, seul le solde Espèces Matrice diffère) :

|                | Cotisations payées      | Transactions                                                      | Σ cash_delta attendu | Espèces Matrice                                                         |
| -------------- | ----------------------- | ----------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------- |
| **CONVERGENT** | +100 +150 +200 (= +450) | buy AAPL 10@50 = −500 ; sell MSFT 5@40 = +200 ; dividend 30 = +30 | **+180**             | **180,00 €**                                                            |
| **OUVERTURE**  | idem (+450)             | idem (−270)                                                       | **+180**             | **5 180,00 €** (= +180 + **5 000 € d'apport initial absent du legacy**) |

Détails : une cotisation `due` (non payée) est aussi semée sur CONVERGENT → elle ne **doit pas** être
migrée (filtre `status='paid'`), ce que les compteurs confirment (3 et non 4).

### Tableau de convergence — 1 ligne / club / métrique

| Club       | Métrique        |     Legacy | Operations |           Delta | Statut               |
| ---------- | --------------- | ---------: | ---------: | --------------: | :------------------- |
| CONVERGENT | solde_especes   |   180,00 € |   180,00 € |      **0,00 €** | ✓ OK (≤ ±1 €)        |
| CONVERGENT | nb_cotisations  |          3 |          3 |           **0** | ✓ OK                 |
| CONVERGENT | nb_transactions |          3 |          3 |           **0** | ✓ OK                 |
| OUVERTURE  | solde_especes   | 5 180,00 € |   180,00 € | **−5 000,00 €** | ✗ ÉCART À DOCUMENTER |
| OUVERTURE  | nb_cotisations  |          3 |          3 |           **0** | ✓ OK                 |
| OUVERTURE  | nb_transactions |          3 |          3 |           **0** | ✓ OK                 |

**Lecture** :

- **CONVERGENT** : convergence parfaite des 3 métriques → le mapping (cash signé buy/sell/dividend,
  cotisations) et la somme `get_club_cash_balance` sont corrects.
- **OUVERTURE** : compteurs identiques, mais solde espèces inférieur de **5 000 €** côté operations.
  C'est **exactement** le cas prévu par DEC-003 : la Matrice porte un **solde d'ouverture / apport
  initial** que le legacy (`contribution_months` + `transactions`) ne contient pas. Aucune opération
  de calage n'est injectée ; l'écart est **documenté** et à rediscuter en prod si observé.

---

## 3. Sorties brutes des runs `migrate-to-operations`

Edge servie en local : `supabase functions serve migrate-to-operations --no-verify-jwt --env-file supabase/functions/.env`.
POST `{club_id}` avec `Authorization: Bearer <SERVICE_ROLE_KEY local>`.

```jsonc
// CONVERGENT — 1er run
{"ok":true,"club_id":"cccc1111-0000-0000-0000-000000000001","inserted":6,"skipped":0,
 "by_type":{"contribution":3,"buy":1,"sell":1,"dividend_cash":1},"skipped_invalid":[]}

// OUVERTURE — 1er run
{"ok":true,"club_id":"cccc2222-0000-0000-0000-000000000001","inserted":6,"skipped":0,
 "by_type":{"contribution":3,"buy":1,"sell":1,"dividend_cash":1},"skipped_invalid":[]}
```

### Idempotence RUNTIME (≠ test Deno)

Re-run de la migration sur le club **CONVERGENT** (sans nettoyage entre les deux appels) :

```jsonc
// CONVERGENT — RE-RUN
{
  "ok": true,
  "club_id": "cccc1111-0000-0000-0000-000000000001",
  "inserted": 0,
  "skipped": 6,
  "by_type": {},
  "skipped_invalid": [],
}
```

`inserted:0, skipped:6` → l'idempotence par **tuple naturel** est prouvée en conditions réelles
(client Supabase + PostgREST `.is(null)` sur `symbol`/`quantity`), pas seulement dans les tests
unitaires Deno.

---

## 4. Reproduire en local

```bash
# 1. DB propre (migrations 057/058/059 + seed)
make db-reset

# 2. Semer les 2 fixtures contrôlées
psql "$(supabase status -o env | sed -n 's/^DB_URL="\(.*\)"/\1/p')" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/__checks__/OPS-105_convergence_fixtures.sql

# 3. Servir l'Edge (laisser tourner)
supabase functions serve migrate-to-operations --no-verify-jwt --env-file supabase/functions/.env

# 4. Migrer chaque club fixture (SRK = SERVICE_ROLE_KEY de `supabase status -o env`)
curl -s -X POST http://127.0.0.1:54321/functions/v1/migrate-to-operations \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d '{"club_id":"cccc1111-0000-0000-0000-000000000001"}'
curl -s -X POST http://127.0.0.1:54321/functions/v1/migrate-to-operations \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d '{"club_id":"cccc2222-0000-0000-0000-000000000001"}'

# 5. Calculer les 3 deltas
psql "$(supabase status -o env | sed -n 's/^DB_URL="\(.*\)"/\1/p')" \
  -f supabase/migrations/__checks__/OPS-105_deltas.sql
```

Gotchas de mise en service de l'Edge en local (utiles pour la prod) :

- **`verify_jwt = false`** est épinglé pour `migrate-to-operations` dans `config.toml` (la fonction
  vérifie elle-même que le Bearer == clé service-role ; sans ce pin, un redeploy CLI repasse
  `verify_jwt=true` et casse l'appel — incident connu juin 2026).
- **`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`** ne sont PAS dans `supabase/functions/.env` : la
  CLI les injecte automatiquement dans le runtime (`Deno.env.get`). En **prod**, le service-role
  doit être posé comme **secret** de la fonction (cf. §5.2).
- `--no-verify-jwt` au `functions serve` ne dispense pas du Bearer : l'auth est faite **dans** la
  fonction (`token !== serviceKey` → 401).

---

## 5. VALIDATION PROD — action owner

La convergence €-réelle sur les 4 vrais clubs **n'est pas démontrable en local**. Procédure pas à pas
côté owner (à exécuter sur le projet prod `kiwcjtilwihioswdsjjv`) :

### 5.1 Déployer le schéma

1. Déployer les migrations `057_operations.sql`, `058_memberships_parts.sql`,
   `059_get_club_cash_balance.sql` en prod (via le runbook `docs/deploy/SUPABASE_PROD.md` /
   `make supabase-deploy-prod CONFIRM=yes`).

### 5.2 Déployer l'Edge

2. Déployer `migrate-to-operations` (`supabase functions deploy --use-api` ; `verify_jwt=false`
   vient de `config.toml`) **et** s'assurer que le secret `SUPABASE_SERVICE_ROLE_KEY` (clé prod) est
   bien disponible pour la fonction.

### 5.3 Identifier les clubs (DEC-001)

3. ```sql
   SELECT id, name FROM clubs WHERE is_active AND sheet_id IS NOT NULL;
   ```

### 5.4 Migrer

4. Pour **chaque** club retourné : `POST /functions/v1/migrate-to-operations` avec
   `Authorization: Bearer <SERVICE_ROLE_KEY prod>` et `{"club_id":"<id>"}`. Relever la sortie JSON
   (`inserted`, `skipped`, `by_type`, `skipped_invalid`).

### 5.5 Relever les 3 deltas

5. Adapter `supabase/migrations/__checks__/OPS-105_deltas.sql` aux vrais `club_id` (remplacer le CTE
   `clubs_fx` par la liste réelle), ou exécuter par club le triplet :
   - solde espèces : `portfolio_aggregates` (label `especes`) **vs** `get_club_cash_balance(id)`
   - nb cotisations : `contribution_months paid` **vs** `operations type='contribution'`
   - nb transactions : `transactions` **vs** `operations type IN (buy,sell,dividend_cash)`

### 5.6 Interpréter

6. **Tout delta solde espèces > ±1 €** (DEC-002) → documenter la cause (solde d'ouverture Matrice
   probable, comme la fixture OUVERTURE) et **rediscuter avant Sprint 2** — NE PAS injecter
   d'opération de calage (DEC-003).

### Tableau prod à remplir (vrais chiffres — VIDE)

| Club (nom)    | Métrique        | Legacy | Operations | Delta | Statut | Cause si écart |
| ------------- | --------------- | -----: | ---------: | ----: | :----- | :------------- |
| _(à remplir)_ | solde_especes   |        |            |       |        |                |
| _(à remplir)_ | nb_cotisations  |        |            |       |        |                |
| _(à remplir)_ | nb_transactions |        |            |       |        |                |
| _(à remplir)_ | solde_especes   |        |            |       |        |                |
| …             | …               |        |            |       |        |                |

---

## 6. Conclusion

- **Mécanisme PROUVÉ en local** : mapping legacy → `operations` correct (cotisations + buy/sell/
  dividend, signes cash, filtre `paid`/`transaction_date`), `get_club_cash_balance` cohérent, et
  **idempotence runtime** (re-run `inserted:0`). Le club CONVERGENT converge sur les 3 métriques.
- **Cas « solde d'ouverture » validé** : le club OUVERTURE montre bien un delta espèces non nul
  (−5 000 €) avec des compteurs identiques → confirme que l'écart espèces attendu en prod vient d'un
  apport initial Matrice non porté par le legacy, exactement comme prévu par la décision owner
  (DEC-003 : documenter sans injecter).
- **Convergence €-réelle = gate PROD** à valider par l'owner (§5), table à remplir avec les vrais
  chiffres.

### Artefacts

- `supabase/migrations/__checks__/OPS-105_convergence_fixtures.sql` — seed des 2 fixtures.
- `supabase/migrations/__checks__/OPS-105_deltas.sql` — calcul des 3 deltas.
- Handler/Edge : `supabase/functions/migrate-to-operations/{handler,index}.ts`.
- Schéma : migrations `057`/`058`/`059`.
