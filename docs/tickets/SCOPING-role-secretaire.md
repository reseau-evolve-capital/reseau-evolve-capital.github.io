# Cadrage — rôle `secretary` (bureau club, lecture seule)

Branche : `feat/role-secretaire` (depuis `origin/main`).
Objectif : le secrétaire voit la **même chose que le trésorier** (espace admin / écrans trésorier) mais **ne peut effectuer aucune action de gestion** (écriture).

## Constat architectural central

Le code n'a **aucune séparation lecture/écriture** par rôle. Une seule notion binaire « staff » :

- `is_club_staff(club_id)` (migration 028) = `role IN ('treasurer','president','network_admin')`.
  - Garde **toutes les écritures** (RPC `SECURITY DEFINER` : record/cancel operation, settings, invitations, member access, change role).
  - Côté app, `isStaffRole()` ([apps/web/lib/data/admin.ts:41](apps/web/lib/data/admin.ts#L41)) reprend la même liste et sert à **la fois** la visibilité de l'« Espace trésorier » ET le 403 des routes API admin.
- Les RLS de lecture (contributions, contribution_months, sheet_snapshots, operations) testent en dur `IN ('treasurer','president','network_admin')`.

Conséquence : **ajouter `secretary` à `is_club_staff` donnerait silencieusement les droits d'écriture.** Le travail réel = scinder la garde en deux paliers (lecture / écriture), pas ajouter une valeur d'enum.

Bonne nouvelle : les écritures passent **toutes** par des RPC gardées `is_club_staff`. Si on laisse `is_club_staff` au palier écriture (3 rôles inchangés), le secrétaire est **refusé en écriture par la DB**, sans nouveau code de refus à écrire. Le filet de sécurité est déjà là.

## Plan par couche

### 1. DB — migration 061 (nouvelle) · effort S

- `ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'secretary'` (migration séparée des usages : un ADD VALUE n'est pas utilisable dans la même transaction). 001 est déjà en prod → jamais éditer, toujours une nouvelle migration.
- Nouveau helper `can_view_club_admin(club_id)` `SECURITY DEFINER STABLE` = `role IN ('secretary','treasurer','president','network_admin')`.
- Réécrire les RLS de lecture (contributions:107, contribution_months:128, sheet_snapshots:140 dans [011](supabase/migrations/011_enable_rls_and_policies.sql), + read policy de `operations` migration 057) pour pointer sur `can_view_club_admin`.
- **Laisser `is_club_staff` inchangé** → écritures refusées pour secretary, gratuitement.
- Optionnel : ajouter `'secretary'` aux rôles attribuables par `admin_change_member_role` (052) si le président doit pouvoir le nommer depuis l'UI.

### 2. Sync Sheets — le secrétaire EST déjà dans PARAMETRAGES · effort S

La donnée source existe (confirmé owner). Le code l'ignorait volontairement (commentaires « pas de valeur 'secretary' dans l'enum »). À câbler :

- [sheetParsers.ts:91](supabase/functions/sync/sheetParsers.ts#L91) : ajouter `secretaryName: get('secretaire(e)','secretaire','secretary','secretariat') || null` (1 ligne).
- [parametrages.mapper.ts:55-85](packages/data/src/sheets/mappers/parametrages.mapper.ts#L55) : champ `secretaryName` dans `ClubOfficers` + extraction.
- `supabase/functions/sync/index.ts` (~211-235) : ajouter `secretary` aux cibles de réconciliation nom→membership. Attention à la précédence rôle-source (052 `membership_role_source`) : un rôle posé à la main ne doit pas être écrasé par la feuille et inversement.

### 3. App — le gros du travail : split lecture/écriture · effort M

- [admin.ts:41](apps/web/lib/data/admin.ts#L41) : garder `isStaffRole`/`STAFF_ROLES` = palier écriture ; ajouter `canViewClubAdmin` (+secretary).
- Auditer chaque call-site (10 fichiers utilisant `isStaffRole`/`is_club_staff`/`get_user_role_in_club`) et trancher lecture vs écriture :
  - [layout.tsx:86](<apps/web/app/(app)/layout.tsx#L86>) `isStaff` (visibilité « Espace trésorier ») → palier **lecture**.
  - Routes `api/admin/contributions|members|club-summary` → lecture (autoriser secretary).
  - `api/admin/invitations` (GET liste vs POST) + `admin/actions.ts` (change role, set access, settings) → écriture (refuser).
- **Masquer/désactiver tous les CTA mutateurs** dans chaque page admin (members, cotisations, invitations, settings) ET dans le module opérations (saisie trésorier). C'est le poste de coût principal : il faut passer en revue chaque bouton/formulaire d'action et le garder sur `canManage`, pas sur la simple présence dans l'espace.
- i18n : clés `admin.roles.secretary` (+ profil/reseau) fr/en, + copy « lecture seule ».

### 4. Coordination E-OPS · point d'attention

Le module opérations (saisie trésorier, RPC `record_operation`/`cancel_operation` migrations 057-060) **n'est pas encore sur `main`** (branche `feat/e-ops-2`). C'est la principale surface d'écriture du trésorier. Le secrétaire devra lire ces écrans sans le CTA de saisie. À synchroniser : poser le helper read/write d'abord, ou intégrer le gating directement dans E-OPS.

### 5. Tests · effort S-M

- RLS isolation : secretary lit, n'écrit pas (SQL/Deno + `admin.test.ts`).
- E2E : secretary voit l'espace admin, boutons d'action absents.
- Rejouer `cursor-pointer.spec.ts` après touche UI.

## Estimation

| Couche                                    | Effort | Risque                                     |
| ----------------------------------------- | ------ | ------------------------------------------ |
| DB (enum + helper read + RLS)             | S      | Faible (filet écriture déjà en place)      |
| Sync (secrétaire déjà en feuille)         | S      | Faible (précédence rôle-source à vérifier) |
| App (split lecture/écriture + gating CTA) | **M**  | Moyen (volume de boutons à auditer)        |
| Coordination E-OPS                        | —      | Dépend du planning E-OPS                   |
| Tests                                     | S-M    | Faible                                     |

**Total : ~M (≈ 2-3 j dev)**, dominé par l'audit de chaque contrôle mutateur de l'espace admin + opérations. L'ajout du rôle (enum, sheet, i18n) est trivial ; ce qui coûte, c'est d'introduire la notion lecture-seule qui n'existe pas encore.

## Décisions owner (tranchées)

1. **Les deux chemins de nomination.** Le président peut nommer un secrétaire depuis l'UI **et** la feuille PARAMETRAGES alimente aussi le rôle.
   - Impact UI : ajouter `'secretary'` à `EditableMemberRole` / `EDITABLE_ROLES` ([admin/actions.ts:22](<apps/web/app/(app)/admin/actions.ts#L22>)) + à la modale de changement de rôle.
   - Impact DB : ajouter `'secretary'` aux rôles attribuables de `admin_change_member_role` (052).
   - Impact sync : câbler `secretaryName` (couche 2). Précédence rôle-source (052) à vérifier pour que UI et feuille ne s'écrasent pas mutuellement.

2. **Lecture totale pour l'instant ; écriture plus tard via d'autres interfaces.**
   - Le secrétaire voit **tout l'espace admin en lecture** (tous les onglets, y c. Invitations/Settings). → **Pas de masquage d'onglet** : on garde tout visible et on désactive uniquement les CTA mutateurs. Simplifie la couche 3.
   - Confirme le palier read/write : `can_view_club_admin` généreux (tous les reads), `is_club_staff` (écriture) exclusif. Les futures surfaces d'écriture du secrétaire se feront **par surface** (grant ciblé), pas en le promouvant staff global — l'architecture deux-paliers le permet sans refonte.
