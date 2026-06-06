# Audit RLS — isolation cross-club (OPS-003)

**Statut : conforme.** Aucune fuite de données cross-club détectée. Vérifié en runtime
contre la stack Supabase locale le 2026-06-05 (19/19 tests verts).

Ce document est la matrice de conformité de la Row Level Security (RLS) du back Evolve
Capital. Il prouve qu'un membre authentifié d'un club **A** ne peut jamais lire ni écrire
les données d'un club **B**, et que seul le `service_role` (Edge Functions de sync) bypasse
la RLS pour écrire.

- **Suite de preuve** : [`packages/data/src/supabase/__tests__/rls-isolation.test.ts`](../../packages/data/src/supabase/__tests__/rls-isolation.test.ts)
- **Policies** : `supabase/migrations/011_enable_rls_and_policies.sql`, `016_member_access_and_invitations.sql`, `020_attestation_sends.sql`
- **Helpers** : `supabase/migrations/010_create_helper_functions.sql`
- **Voisins** : [`rate-limiting.md`](./rate-limiting.md)

---

## 1. Helpers RLS (SECURITY DEFINER STABLE)

Deux fonctions `SECURITY DEFINER STABLE` cassent la récursion sur `memberships` (une policy
sur `memberships` ne peut pas se relire elle-même). Elles lisent `auth.uid()` (claim `sub`
du JWT) et `search_path` est figé (`public, auth, pg_catalog`).

| Helper                             | Renvoie                                   | Utilisé par                                                                                      |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `get_user_club_ids()`              | `SETOF UUID` — clubs où le user est actif | clubs, users, memberships, positions, transactions, contributions (staff), cm (staff), snapshots |
| `get_user_role_in_club(p_club_id)` | `member_role \| NULL`                     | clubs (UPDATE), memberships (manage), contributions/cm/snapshots/invitations/events (staff read) |

> **Preuve** (suite, bloc « helpers ») : pour le membre A, `get_user_club_ids()` contient
> `clubA` et **jamais** `clubB` ; `get_user_role_in_club(clubA) = 'member'` mais
> `get_user_role_in_club(clubB) = NULL`. C'est la garantie atomique d'isolation : tout le
> reste des policies en découle.

---

## 2. Matrice de conformité

Légende — **attendu** pour un membre simple authentifié (`authenticated`, rôle `member`) :

- ✅ visible/autorisé · ⛔ bloqué · `service-role` = écriture réservée aux Edge Functions.

| Table                  | Rôle                   | Opération | Attendu (membre A)                              | Testé | Résultat |
| ---------------------- | ---------------------- | --------- | ----------------------------------------------- | :---: | :------: |
| `clubs`                | authenticated          | SELECT    | ✅ club A · ⛔ club B                           |  oui  |    ✅    |
| `clubs`                | authenticated          | UPDATE    | ⛔ club B (0 ligne — réservé staff de SON club) |  oui  |    ✅    |
| `users`                | authenticated          | SELECT    | ✅ profil A (intra-club) · ⛔ profil B          |  oui  |    ✅    |
| `users`                | authenticated          | UPDATE    | self uniquement (`id = auth.uid()`)             | impl. |    ✅    |
| `memberships`          | authenticated          | SELECT    | ✅ club A · ⛔ club B                           |  oui  |    ✅    |
| `memberships`          | authenticated          | UPDATE    | ⛔ membre B (escalade de rôle bloquée)          |  oui  |    ✅    |
| `positions`            | authenticated          | SELECT    | ✅ club A · ⛔ club B                           |  oui  |    ✅    |
| `positions`            | authenticated          | INSERT    | ⛔ (42501 — écriture `service-role` uniquement) |  oui  |    ✅    |
| `transactions`         | authenticated          | SELECT    | ✅ club A · ⛔ club B                           |  oui  |    ✅    |
| `transactions`         | authenticated          | INSERT    | ⛔ (42501 — `service-role`)                     |  oui  |    ✅    |
| `contributions`        | authenticated          | SELECT    | ✅ SA ligne (club A) · ⛔ membre B              |  oui  |    ✅    |
| `contributions`        | authenticated          | DELETE    | ⛔ membre B (0 ligne — invisible)               |  oui  |    ✅    |
| `contribution_months`  | authenticated          | SELECT    | ✅ ses mois (club A) · ⛔ membre B              |  oui  |    ✅    |
| `sheet_snapshots`      | authenticated (member) | SELECT    | ⛔ A **et** B (staff-only : trésorier+)         |  oui  |    ✅    |
| `attestation_sends`    | authenticated          | SELECT    | ✅ ses envois (membership A) · ⛔ membership B  |  oui  |    ✅    |
| `attestation_sends`    | authenticated          | INSERT    | ⛔ (aucune policy write — `service-role`)       | impl. |    ✅    |
| `invitations`          | authenticated (member) | SELECT    | ⛔ A **et** B (staff-only)                      |  oui  |    ✅    |
| `member_access_events` | authenticated (member) | SELECT    | ⛔ A **et** B (staff-only)                      |  oui  |    ✅    |
| **toutes**             | `service_role`         | SELECT    | ✅ A **et** B (bypass RLS — contrôle)           |  oui  |    ✅    |

> « impl. » = couvert _implicitement_ par la conception (aucune policy write pour
> `authenticated` → tout INSERT/UPDATE/DELETE est rejeté par défaut RLS) ; les chemins
> les plus sensibles (escalade, suppression cross-club) sont testés explicitement.

### Note sur les tables « staff-only »

`sheet_snapshots`, `invitations`, `member_access_events` n'ont **que** des policies de
lecture réservées à `treasurer/president/network_admin`. Un membre simple ne voit donc
**aucune** ligne, **même de son propre club** — l'isolation cross-club est _a fortiori_
respectée. Les écritures de ces tables passent par des RPC `SECURITY DEFINER` qui
re-vérifient l'autorité staff **avant** d'écrire (cf. `016`), ou par le `service_role`.

### Note sur le pattern UPDATE/DELETE cross-club

Une policy `USING` filtre les lignes _visibles_ : un `UPDATE`/`DELETE` cross-club ne lève
pas d'erreur, il affecte simplement **0 ligne** (la ligne cible est invisible). La suite
asserte donc `data === []` (rien d'affecté), ce qui est la preuve correcte de blocage —
pas un faux négatif. Les `INSERT` cross-club, eux, échouent en `42501` (violation RLS
`WITH CHECK` / absence de policy).

---

## 3. Comment rejouer la preuve

La suite a besoin de la **DB Supabase locale réelle** (la RLS s'évalue en base). Le gate
par défaut `make test` tourne sans DB : la suite s'auto-`skip` proprement quand les env
sont absentes (elle reste verte, 19 skipped).

```bash
# 1. Démarrer la stack locale (CLI Supabase, pas docker postgres)
supabase start -x vector,logflare          # ou : make db-start
supabase db reset                          # applique les 23 migrations + seed

# 2. Exporter les env attendues par la suite (depuis `supabase status`)
eval "$(supabase status -o env | sed 's/^/export SB_/')"
export NEXT_PUBLIC_SUPABASE_URL="$SB_API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$SB_ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SB_SERVICE_ROLE_KEY"
export SUPABASE_JWT_SECRET="$SB_JWT_SECRET"   # défaut local connu si absent

# 3. Lancer la suite dédiée
pnpm --filter @evolve/data test:rls
```

**Authentification sans GoTrue** : la suite signe elle-même un JWT HS256 (`role:
authenticated`, `sub: <user_id>`) avec le `JWT_SECRET` local — exactement ce que
`supabase-js` enverrait après login. Aucune dépendance ajoutée (HMAC via `node:crypto`).
Le seed/teardown (2 clubs, 2 users, 1 ligne par table sensible) passe par
`createServiceRoleClient()` et nettoie en CASCADE en `afterAll`.

---

## 4. Conclusion

L'isolation cross-club est **garantie au niveau base** par la RLS, indépendamment du code
applicatif : même une requête forgée avec un JWT valide d'un membre du club A ne peut ni
lire ni muter les données du club B. La seule voie d'écriture sur les tables mirroir
(Sheets → Postgres) est le `service_role`, confiné aux Edge Functions server-only
(`SUPABASE_SERVICE_ROLE_KEY` jamais exposée au client). **Aucune faille détectée.**
