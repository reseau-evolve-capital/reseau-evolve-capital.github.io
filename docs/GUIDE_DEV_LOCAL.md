# Guide — Lancer l'app membre en local & tester

> Cible : la **nouvelle app membre** (`apps/web`, Next.js 16) du monorepo, sur la branche `feat/monorepo`.
> La vitrine légacy (`main`) n'est pas concernée par ce guide.
> Langue de travail : français.

---

## 1. Prérequis

- **Node 20+** et **pnpm** (le repo est un monorepo pnpm + Turborepo).
- **Supabase CLI** (installé via Homebrew : `brew install supabase/tap/supabase`).
- **Docker Desktop** lancé (la stack Supabase locale tourne dans Docker via la CLI — PAS de `docker-compose postgres` brut).

```bash
node -v        # ≥ 20
pnpm -v
supabase --version
docker info     # doit répondre (Docker démarré)
```

---

## 2. Installation

```bash
cd /Users/lionel/Documents/OMNIVENTUS/Projects/reseau-evolve-capital
git checkout feat/monorepo
pnpm install
```

Crée le fichier d'env de l'app à partir de l'exemple :

```bash
cp apps/web/.env.example apps/web/.env.local
```

Tu compléteras `NEXT_PUBLIC_SUPABASE_ANON_KEY` à l'étape suivante (valeur donnée par `supabase start`).

---

## 3. Démarrer la base Supabase locale

```bash
# -x vector,logflare évite le hang du service analytics (cf. mémoire projet)
supabase start -x vector,logflare
```

À la fin, la CLI affiche les clés et URLs. Reporte-les dans `apps/web/.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable / anon key affichée>
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

Applique les migrations + (re)génère les types si besoin :

```bash
make db-migrate      # supabase db push (15 migrations : clubs, users, positions, contributions…)
make db-types        # régénère packages/data/src/supabase/types.gen.ts
```

### Services locaux & ports

| Service                          | URL                                                       | Usage                                      |
| -------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| App membre (web)                 | http://localhost:3001                                     | l'app à tester                             |
| Supabase Studio                  | http://127.0.0.1:54323                                    | explorer/éditer la DB, lancer du SQL       |
| **Boîte mail locale (Inbucket)** | http://127.0.0.1:54324                                    | **récupérer les magic links de connexion** |
| API Supabase                     | http://127.0.0.1:54321                                    | REST/Auth                                  |
| Postgres                         | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | accès SQL direct                           |
| Storybook (design system)        | http://localhost:6006                                     | composants `@evolve/ui`                    |

---

## 4. Lancer l'application

```bash
make dev-web        # = pnpm --filter @evolve/web dev  → http://localhost:3001
# ou tout le monorepo en parallèle :
make dev
# Storybook seul :
make storybook      # → http://localhost:6006
```

---

## 5. Se connecter (magic link, en local)

Le seed crée un membre de test : **`test@example.com`** (club « Club E2E »).

1. Va sur http://localhost:3001/login
2. Saisis `test@example.com` → « Recevoir le lien ».
3. Ouvre **Inbucket** : http://127.0.0.1:54324 → ouvre le dernier email → clique le **magic link** (`/login/verify?...`).
4. Le membre a `onboarding_completed = false` → tu atterris sur **`/onboarding/step-1`**.
   - Soit tu traverses l'onboarding (3 étapes + tour),
   - soit tu marques l'onboarding terminé pour aller direct au dashboard (Studio → SQL Editor, ou en CLI) :
     ```sql
     UPDATE users SET onboarding_completed = true WHERE email = 'test@example.com';
     ```

> Aucun email réel n'est envoyé en local : tout est capté par Inbucket.

---

## 6. (Optionnel) Injecter des données de démo

Le seed est **minimal** : un club + un membre, **sans positions ni cotisations**. Par défaut, le dashboard et le portefeuille afficheront donc leurs **états « vides »** (c'est voulu, et un bon test en soi). Pour voir l'UI **peuplée**, lance ce SQL dans **Studio → SQL Editor** (http://127.0.0.1:54323) :

```sql
-- Quelques positions pour /portfolio (valo snapshot ; le live retombe dessus si aucun provider configuré)
insert into positions (club_id, name, symbol, category, sector, quantity, currency,
                       market_value, book_value, allocation_pct, pump, gain_loss_pct, gain_loss_eur,
                       is_active, synced_at)
values
 ('aaaaaaaa-0000-0000-0000-000000000001','META PLATFORMS','NASDAQ:META','Actions','Technologie',248,'EUR',
   145050, 113216, 33.5, 456.5, 28.1, 31834, true, now()),
 ('aaaaaaaa-0000-0000-0000-000000000001','NVIDIA','NASDAQ:NVDA','Actions','Technologie',2957,'EUR',
   506577, 125586, 50.2, 42.5, 303.4, 380991, true, now()),
 ('aaaaaaaa-0000-0000-0000-000000000001','JOHNSON & JOHNSON','NYSE:JNJ','Actions','Santé',120,'EUR',
   18000, 16500, 12.1, 137.5, 9.1, 1500, true, now())
on conflict (club_id, symbol) do nothing;

-- Synthèse cotisation + détail mensuel pour /contributions (rattachés à la membership du membre test)
with mb as (
  select m.id as membership_id, m.club_id
  from memberships m join users u on u.id = m.user_id
  where u.email = 'test@example.com'
)
insert into contributions (membership_id, club_id, months_count, detention_pct, total_contributed,
                           penalties, net_market_value, status, amount_due, synced_at)
select membership_id, club_id, 6, 0.0899, 600, 0, 12345.67, 'ok', 0, now() from mb
on conflict (membership_id) do nothing;

with mb as (
  select m.id as membership_id, m.club_id
  from memberships m join users u on u.id = m.user_id
  where u.email = 'test@example.com'
)
insert into contribution_months (membership_id, club_id, year, month, amount, status, paid_at, synced_at)
select membership_id, club_id, 2026, g.month, 100, 'paid', make_date(2026, g.month, 5), now()
from mb, generate_series(1, 6) as g(month)
on conflict (membership_id, year, month) do nothing;

-- Le dashboard lit la vue matérialisée : la rafraîchir après insert
refresh materialized view member_quote_part;
```

> Recharge la page : `/dashboard` et `/portfolio` montrent désormais des données. Adapte/duplique librement.

---

## 6 bis. Synchroniser depuis une VRAIE matrice Google Sheets (flux complet, optionnel)

L'étape 6 injecte des données à la main. Pour tester le **vrai flux produit** (Google Sheets → Edge Function `sync` → Postgres → app), il faut une matrice Google et un service account.

**Prérequis (une fois) :**

1. **Service account Google** (console.cloud.google.com) avec l'API **Google Sheets** activée. Télécharge la clé JSON, encode-la en base64 :
   ```bash
   base64 -i service-account.json | tr -d '\n'    # → valeur de GOOGLE_SA_KEY_BASE64
   ```
2. **Partage ta matrice** Google Sheets (en lecture) avec le `client_email` du service account.
3. Crée `supabase/functions/.env` (gitignoré) avec le secret **et l'id de ta matrice** :
   ```bash
   GOOGLE_SA_KEY_BASE64=<la_valeur_base64_ci-dessus>
   SHEET_ID=<id de ta matrice>      # dans l'URL Google : .../spreadsheets/d/<SHEET_ID>/edit
   ```
4. Pose le `sheet_id` sur le club **automatiquement** (lit `SHEET_ID` de l'env — plus de SQL à la main) :
   ```bash
   SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '\"')" \
     make db-set-sheet                    # club seed (aaaaaaaa-…-0001, cf. supabase/seed.sql)
   # autre club : make db-set-sheet CLUB_ID=<uuid>
   ```
   > L'UUID `aaaaaaaa-0000-0000-0000-000000000001` est celui du club « Club E2E » créé par `supabase/seed.sql` — c'est la cible par défaut, rien à recopier.

**À chaque sync :**

```bash
# Terminal A : stack Supabase (si pas déjà lancée)
supabase start -x vector,logflare

# Terminal B : servir les Edge Functions avec le secret Google
#   (⚠ le runtime auto de `supabase start` ne charge PAS supabase/functions/.env →
#    il FAUT ce `functions serve --env-file` pour que GOOGLE_SA_KEY_BASE64 soit présent)
supabase functions serve --env-file supabase/functions/.env

# Terminal C : déclencher le sync (récupère la clé service_role automatiquement)
SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '\"')" \
  make db-sync                         # club seed par défaut
# ou un club précis :
SUPABASE_SERVICE_ROLE_KEY="…" make db-sync CLUB_ID=<uuid-du-club>
```

Le script `scripts/sync-sheets.mjs` affiche la réponse (`success`, `synced_sheets`, `errors`, `warnings`, `snapshots`) et **sort en code ≠ 0 s'il y a des erreurs dures**. Ordre d'import imposé : **PARAMETRAGES → Base → Portefeuille → HISTORIQUE → COTISATIONS → Details cotisations** (Base d'abord car sa colonne email est la clé de matching).

> ⚠ **Bug connu (bloque la sync live, à corriger)** : l'Edge Function `sync` ne boote pas dans le runtime Deno —
> `packages/utils/src/index.ts` ré-exporte `./format` etc. **sans extension `.ts`**, que Deno refuse
> (`Module not found … Maybe add a '.ts' extension`). `make db-set-sheet` et le déclencheur fonctionnent ;
> c'est le worker `sync` qui échoue (`BOOT_ERROR`). Fix prévu dans le sprint pré-prod (voir reste-à-faire).

**Vérifier l'import en DB** (Studio → SQL) :

```sql
SELECT id, name, sheet_id, synced_at FROM clubs WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001';
SELECT count(*) FROM users;     SELECT count(*) FROM positions;     SELECT count(*) FROM contributions;
SELECT sheet_name, status, row_count, created_at FROM sheet_snapshots ORDER BY created_at DESC LIMIT 6;
REFRESH MATERIALIZED VIEW member_quote_part;   -- le dashboard lit cette vue
```

> Sans `GOOGLE_SA_KEY_BASE64` + `sheet_id` réel, le sync renvoie une erreur (DNS / 503) : c'est attendu, le flux a juste besoin d'une vraie matrice.

---

## 7. Parcours de test manuels (à suivre dans le navigateur)

### Parcours A — Connexion & onboarding

1. `/login` → email `test@example.com` → Inbucket → magic link.
2. Vérifie la redirection onboarding (membre non onboardé) ou le dashboard (si `onboarding_completed = true`).
3. Déconnexion / réouverture sans session → `/dashboard` doit rediriger vers `/login`.

### Parcours B — Dashboard membre (`/dashboard`)

1. **Sans données** : état vide rassurant (« le trésorier doit synchroniser »).
2. **Avec données** (étape 6) : Hero « valorisation nette » + 3 KPI (détention, total cotisé, statut).
3. Tap sur le Hero → **modale détail quote-part** ; `Échap` la ferme.
4. Mobile (DevTools ≤ 768px) : **pull-to-refresh** (tirer vers le bas en haut de page) → spinner d'actualisation.
5. `SyncBanner` : visible seulement si le rôle ≥ trésorier (le seed est `member` → masqué ; pour le voir : `UPDATE memberships SET role='treasurer' WHERE …`).

### Parcours C — Portefeuille (`/portfolio`)

1. Le lien « Cotisations/Portefeuille » de la BottomNav (mobile) doit ouvrir l'écran.
2. **Donut d'allocation par secteur** + total au centre ; légende sous le donut.
3. **Desktop (≥768px)** : tableau triable — clique un en-tête (Valeur, +/- %…), la flèche `↑/↓` change, l'ordre aussi. Navigation clavier : `Tab` sur une ligne + `Entrée` → ouvre la modale.
4. **Mobile (<768px)** : cartes `DataRow` à la place du tableau (pas les deux).
5. **Filtres (nuqs)** : clique une pastille de secteur (ex. « Santé ») → seules ces positions restent ; l'URL gagne `?sector=Santé&sort=…&dir=…` → **recharge la page**, l'état est conservé (partageable).
6. **Valo live** : sans provider de prix configuré, la colonne « Cours » affiche `—` mais Valeur/donut restent alimentés par le snapshot (jamais d'écran vide). Cf. `docs/PRICE_PROVIDER.md`.
7. Clique une position → **modale détail** (quantité, PRU, cours, valeur, +/-, % du portefeuille) ; `Échap` ferme. Une perte est en `data-negative` (jamais rouge brand).

### Parcours D — Cotisations (`/contributions`) — _disponible après le Sprint 6_

1. Statut (à jour / retard / exempté) + total cotisé + quote-part.
2. Timeline mensuelle groupée par année (cellules `CotisationMonth`) ; tap/clic d'une cellule → tooltip/détail du mois.
3. État retard → bandeau d'alerte doux avec montant dû.

---

## 8. Tests automatisés

```bash
# Unitaires + composants (Vitest + jest-axe) sur tout le monorepo
make test                      # = pnpm turbo test   (NB: n'inclut PAS Playwright)
pnpm --filter @evolve/ui exec vitest run src/molecules/AllocationDonut   # un dossier ciblé

# Storybook (contrat visuel + play functions)
make storybook

# E2E Playwright (apps/web) — nécessite la stack Supabase démarrée + la clé service_role
SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '"')" \
  pnpm --filter @evolve/web exec playwright test
# Un flow précis :
SUPABASE_SERVICE_ROLE_KEY="$(supabase status -o env | grep -i service_role | cut -d= -f2 | tr -d '"')" \
  pnpm --filter @evolve/web exec playwright test portfolio.spec.ts
```

> Le harness E2E se connecte via un magic link admin (GoTrue) et **mocke les routes API** pour un rendu déterministe — il n'a pas besoin des données de démo de l'étape 6.

```bash
# Suite d'isolation RLS (cross-club) — nécessite la stack locale démarrée
pnpm --filter @evolve/data test:rls

# Edge Function sync (Deno) — NON inclus dans `make test`
deno test --allow-env --config supabase/functions/sync/deno.json \
  supabase/functions/sync/__tests__/sync.test.ts

# Lighthouse (pages publiques /login + 404)
pnpm lighthouse
```

> 📊 **Inventaire complet des tests, couverture par couche et trous connus : [docs/TESTS.md](./TESTS.md).**
> Couverture actuelle : ~663 cas (570 Vitest + 45 e2e Playwright + 27 Storybook play + 21 Deno sync).

---

## 9. Qualité avant de pousser (les 3 + gardes CI)

```bash
make typecheck lint test       # les trois, comme la CI
pnpm --filter @evolve/web lint # explicitement (règles react-hooks strictes)
make build                     # build complet (vérifie les routes)

# Les 3 gardes design-system (rejouées localement comme dans .github/workflows/ci.yml) :
grep -rE '#[0-9A-Fa-f]{6}' packages/ui/src --include='*.tsx' --include='*.ts' \
  | grep -v '\.test\.' | grep -v '\.stories\.' | grep -v 'tokens/index' && echo "❌ hex en dur" || echo "✓ pas de hex"
grep -r "from 'lucide-react'" packages/ui/src --include='*.tsx' --include='*.ts' \
  | grep -v 'atoms/Icon/Icon.tsx' && echo "❌ import lucide direct" || echo "✓ lucide via Icon"
grep -r 'brand-red\|E93E3A' packages/ui/src/molecules/TrendBadge/ \
  | grep -v '\.test\.' | grep -v '\.stories\.' && echo "❌ brand-red dans TrendBadge" || echo "✓ TrendBadge OK"
```

La CI distante tourne sur `git push origin feat/monorepo` (typecheck + lint + test + 3 gardes). **Ne pas merger sur `main`** tant que le Sprint 0 monorepo n'est pas clôturé.

---

## 10. Dépannage

| Symptôme                                     | Cause / solution                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `supabase start` se fige                     | Lancer `supabase start -x vector,logflare` (désactive l'analytics qui hang).                          |
| Port `3001` occupé                           | `lsof -ti :3001 \| xargs kill` puis relancer `make dev-web`.                                          |
| E2E : `generate_link 401 / no_authorization` | `SUPABASE_SERVICE_ROLE_KEY` absent → le fournir via `supabase status -o env` (cf. §8).                |
| Magic link introuvable                       | Regarder Inbucket http://127.0.0.1:54324 (aucun email réel en local).                                 |
| `/dashboard` ou `/portfolio` vide            | Seed minimal sans données → injecter la démo (§6) puis `refresh materialized view member_quote_part`. |
| Types DB désynchronisés                      | `make db-types` après toute migration.                                                                |
| Repartir de zéro (DB)                        | `make db-reset` ⚠️ **destructif** (wipe + replay migrations + seed).                                  |

---

### Aide-mémoire

```bash
make help          # liste les cibles Make
make dev-web        # app sur :3001
make db-start       # supabase (préférer: supabase start -x vector,logflare)
make typecheck lint test
make test-e2e       # Playwright (penser à la clé service_role)
```
