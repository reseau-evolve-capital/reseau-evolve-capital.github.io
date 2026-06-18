-- supabase/tests/network_rpc.sql — NET-003 / NET-008 : vérification SQL reproductible.
--
-- Même esprit que network_members.sql : script ASSERT autonome, joué manuellement contre la
-- stack LOCALE, AUCUNE écriture persistante (tout en transaction ROLLBACK).
--
--   psql "$(supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '\"')" \
--        -v ON_ERROR_STOP=1 -f supabase/tests/network_rpc.sql
--
-- Pré-requis : DB reset + seedée (le seed pose le network_admin
-- bbbbbbbb-0000-0000-0000-000000000001 ET le club E2E aaaaaaaa-…-0001).
-- N'est PAS exécuté par `make lint typecheck test` (le gate ne joue ni Deno ni SQL).
--
-- Couverture :
--   (a) GARDES — non network_admin → 42501 sur chaque write ; non network_member → exception sur list.
--   (b) HAPPY PATH (en tant que network_admin seed) — create_club + list_clubs ; double-slug rejeté ;
--       provision_first_staff ; grant_role / revoke_role ; une ligne network_events par mutation.

BEGIN;

-- Identifiants seed (cf. supabase/seed.sql).
\set ADMIN_UID   '''bbbbbbbb-0000-0000-0000-000000000001'''
\set STRANGER_UID '''00000000-0000-0000-0000-0000000000ff'''

-- Setup (rôle table-owner, hors RLS) : le user « stranger » sert de cible à grant/revoke_role.
-- On le crée ici car l'INSERT direct sous `authenticated` serait refusé par `users: self insert`.
INSERT INTO public.users (id, email, full_name)
VALUES ('00000000-0000-0000-0000-0000000000ff', 'stranger@example.com', 'Stranger Test')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- (a) GARDES — caller authentifié NON membre réseau.
-- ════════════════════════════════════════════════════════════════════════════
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ff"}';

DO $$
BEGIN
  -- network_create_club : non network_admin → 42501.
  BEGIN
    PERFORM public.network_create_club('Hack Club', 'hack-club');
    RAISE EXCEPTION 'ÉCHEC : network_create_club exécuté par un non-admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_create_club refusé (42501)';
  END;

  -- network_set_club_sheet : non network_admin → 42501.
  BEGIN
    PERFORM public.network_set_club_sheet('aaaaaaaa-0000-0000-0000-000000000001', 'sheet-x');
    RAISE EXCEPTION 'ÉCHEC : network_set_club_sheet exécuté par un non-admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_set_club_sheet refusé (42501)';
  END;

  -- network_provision_first_staff : non network_admin → 42501.
  BEGIN
    PERFORM public.network_provision_first_staff(
      'aaaaaaaa-0000-0000-0000-000000000001',
      'bbbbbbbb-0000-0000-0000-000000000001',
      'treasurer');
    RAISE EXCEPTION 'ÉCHEC : network_provision_first_staff exécuté par un non-admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_provision_first_staff refusé (42501)';
  END;

  -- network_grant_role : non network_admin → 42501.
  BEGIN
    PERFORM public.network_grant_role('bbbbbbbb-0000-0000-0000-000000000001', 'network_board');
    RAISE EXCEPTION 'ÉCHEC : network_grant_role exécuté par un non-admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_grant_role refusé (42501)';
  END;

  -- network_revoke_role : non network_admin → 42501.
  BEGIN
    PERFORM public.network_revoke_role('bbbbbbbb-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'ÉCHEC : network_revoke_role exécuté par un non-admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_revoke_role refusé (42501)';
  END;

  -- network_list_clubs : non membre réseau → exception (42501).
  BEGIN
    PERFORM * FROM public.network_list_clubs();
    RAISE EXCEPTION 'ÉCHEC : network_list_clubs exécuté par un non-membre réseau';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_list_clubs refusé pour non-membre (42501)';
  END;

  -- NET-007 — network_list_sheet_snapshots : non network_admin → 42501.
  BEGIN
    PERFORM * FROM public.network_list_sheet_snapshots('aaaaaaaa-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'ÉCHEC : network_list_sheet_snapshots exécuté par un non-admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_list_sheet_snapshots refusé (42501)';
  END;

  -- NET-007 — network_update_club_settings : non network_admin → 42501.
  BEGIN
    PERFORM public.network_update_club_settings(
      'aaaaaaaa-0000-0000-0000-000000000001', 'Hack Name');
    RAISE EXCEPTION 'ÉCHEC : network_update_club_settings exécuté par un non-admin';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : network_update_club_settings refusé (42501)';
  END;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- (b) HAPPY PATH — caller = network_admin du seed.
-- ════════════════════════════════════════════════════════════════════════════
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"bbbbbbbb-0000-0000-0000-000000000001"}';

-- Les RETURNING des RPC sont stashés ici pour être revérifiés en base APRÈS RESET role
-- (les SELECT directs sur clubs/memberships sont sinon filtrés par la RLS du caller authenticated :
--  un club tout juste créé n'est pas encore visible via la policy `clubs: member read`).
CREATE TEMP TABLE _net_ids (k TEXT PRIMARY KEY, v UUID) ON COMMIT DROP;

DO $$
DECLARE
  v_club_id       UUID;
  v_membership_id UUID;
  v_events_before BIGINT;
  v_events_after  BIGINT;
  v_listed        BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_events_before FROM public.network_events;

  -- 1) network_create_club : crée un club, renvoie son id (vérifié en base après RESET role).
  v_club_id := public.network_create_club('Club Test Réseau', 'club-test-reseau', 'Lyon');
  ASSERT v_club_id IS NOT NULL, 'network_create_club doit renvoyer un uuid';
  INSERT INTO _net_ids VALUES ('club', v_club_id);

  -- 2) network_list_clubs : le nouveau club doit être listé (matrix_connected=false, valo NULL).
  SELECT EXISTS (
    SELECT 1 FROM public.network_list_clubs()
    WHERE slug = 'club-test-reseau' AND matrix_connected = FALSE AND aggregated_valuation IS NULL
  ) INTO v_listed;
  ASSERT v_listed, 'network_list_clubs doit renvoyer le club créé (matrice non branchée, valo NULL)';

  -- 3) double-slug : un 2ᵉ insert sur le même slug est rejeté (unique_violation).
  BEGIN
    PERFORM public.network_create_club('Club Doublon', 'club-test-reseau');
    RAISE EXCEPTION 'ÉCHEC : slug dupliqué accepté';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK : slug dupliqué rejeté (unique_violation)';
  END;

  -- 4) network_set_club_sheet : branche la matrice → matrix_connected devient true.
  PERFORM public.network_set_club_sheet(v_club_id, 'sheet-test-123');
  SELECT EXISTS (
    SELECT 1 FROM public.network_list_clubs()
    WHERE slug = 'club-test-reseau' AND matrix_connected = TRUE
  ) INTO v_listed;
  ASSERT v_listed, 'après set_club_sheet, matrix_connected doit être true';

  -- 5) network_provision_first_staff : rend un membership actif (treasurer) sur le nouveau club.
  --    (vérifié en base après RESET role — le RETURNING membership_id est stashé).
  v_membership_id := public.network_provision_first_staff(
    v_club_id, 'bbbbbbbb-0000-0000-0000-000000000001', 'treasurer');
  ASSERT v_membership_id IS NOT NULL, 'provision_first_staff doit renvoyer un membership_id';
  INSERT INTO _net_ids VALUES ('membership', v_membership_id);

  -- provision avec un rôle invalide (member) → check_violation.
  BEGIN
    PERFORM public.network_provision_first_staff(
      v_club_id, 'bbbbbbbb-0000-0000-0000-000000000001', 'member');
    RAISE EXCEPTION 'ÉCHEC : provision_first_staff a accepté un rôle non-staff';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK : provision_first_staff refuse un rôle non-staff (check_violation)';
  END;

  -- 6) network_grant_role : promeut le stranger (créé en setup) en network_board, puis revoke.
  PERFORM public.network_grant_role('00000000-0000-0000-0000-0000000000ff', 'network_board', 'secretary');
  ASSERT EXISTS (
    SELECT 1 FROM public.network_members
    WHERE user_id = '00000000-0000-0000-0000-0000000000ff' AND role = 'network_board' AND title = 'secretary'
  ), 'network_grant_role doit upsert la ligne network_members';

  -- 7) network_revoke_role : retire le board (autorisé : ce n'est pas le dernier admin).
  PERFORM public.network_revoke_role('00000000-0000-0000-0000-0000000000ff');
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.network_members WHERE user_id = '00000000-0000-0000-0000-0000000000ff'
  ), 'network_revoke_role doit supprimer la ligne network_members';

  -- garde-fou dernier admin : révoquer le seul network_admin (le seed) doit échouer.
  BEGIN
    PERFORM public.network_revoke_role('bbbbbbbb-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'ÉCHEC : le dernier network_admin a pu être révoqué (lockout)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK : révocation du dernier network_admin refusée (check_violation)';
  END;

  -- NET-007 — 8) network_list_sheet_snapshots : lecture seule, club valide → renvoie sans erreur.
  --    Le club créé n'a aucun snapshot (jamais synchronisé en test) → 0 ligne, mais l'appel passe
  --    la garde et ne lève pas. Sur un club introuvable → no_data_found.
  PERFORM * FROM public.network_list_sheet_snapshots(v_club_id, 10);
  RAISE NOTICE 'OK : network_list_sheet_snapshots accessible au network_admin (lecture seule)';
  BEGIN
    PERFORM * FROM public.network_list_sheet_snapshots(
      '00000000-0000-0000-0000-0000000000aa', 10);
    RAISE EXCEPTION 'ÉCHEC : network_list_sheet_snapshots a accepté un club introuvable';
  EXCEPTION WHEN no_data_found THEN
    RAISE NOTICE 'OK : network_list_sheet_snapshots refuse un club introuvable (no_data_found)';
  END;

  -- NET-007 — 9) network_update_club_settings : édite nom/ville/pays/plafond (happy path).
  PERFORM public.network_update_club_settings(
    v_club_id, 'Club Test Réseau MAJ', 'Marseille', 'fr', NULL, 250000, NULL);
  ASSERT EXISTS (
    SELECT 1 FROM public.network_list_clubs()
    WHERE id = v_club_id AND name = 'Club Test Réseau MAJ' AND country = 'FR'
  ), 'network_update_club_settings doit mettre à jour le nom et normaliser le pays en MAJUSCULES';

  -- pays invalide (3 lettres) → invalid_parameter_value.
  BEGIN
    PERFORM public.network_update_club_settings(v_club_id, NULL, NULL, 'FRA');
    RAISE EXCEPTION 'ÉCHEC : network_update_club_settings a accepté un pays invalide';
  EXCEPTION WHEN invalid_parameter_value THEN
    RAISE NOTICE 'OK : network_update_club_settings refuse un pays invalide (invalid_parameter_value)';
  END;

  -- plafond négatif → invalid_parameter_value.
  BEGIN
    PERFORM public.network_update_club_settings(v_club_id, NULL, NULL, NULL, NULL, -1);
    RAISE EXCEPTION 'ÉCHEC : network_update_club_settings a accepté un plafond négatif';
  EXCEPTION WHEN invalid_parameter_value THEN
    RAISE NOTICE 'OK : network_update_club_settings refuse un plafond négatif (invalid_parameter_value)';
  END;

  -- 10) audit : chaque mutation réussie a inséré une ligne network_events.
  --    Mutations réussies ci-dessus : create_club, set_club_sheet, provision_first_staff,
  --    grant_role, revoke_role, update_club_settings = 6 (les échecs n'auditent pas ; la lecture
  --    snapshots n'audite pas).
  SELECT COUNT(*) INTO v_events_after FROM public.network_events;
  ASSERT v_events_after - v_events_before = 6,
    format('network_events doit contenir 6 nouvelles lignes (obtenu : %s)', v_events_after - v_events_before);
  ASSERT EXISTS (
    SELECT 1 FROM public.network_events
    WHERE action = 'network_create_club'
      AND target_id = v_club_id
      AND actor_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  ), 'l''événement network_create_club doit porter actor_id = caller et target = club créé';

  RAISE NOTICE 'OK : happy path réseau complet (create/list/sheet/provision/grant/revoke + audit)';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- (c) PERSISTANCE — revérification hors RLS (rôle table-owner) des écritures sur clubs/memberships.
--     La RLS de `authenticated` filtre ces tables ; on confirme donc la persistance après RESET.
-- ════════════════════════════════════════════════════════════════════════════
RESET role;

DO $$
DECLARE
  v_club_id       UUID := (SELECT v FROM _net_ids WHERE k = 'club');
  v_membership_id UUID := (SELECT v FROM _net_ids WHERE k = 'membership');
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM clubs
    WHERE id = v_club_id AND slug = 'club-test-reseau' AND sheet_id = 'sheet-test-123'
  ), 'le club créé doit exister en base avec sa matrice branchée';

  ASSERT EXISTS (
    SELECT 1 FROM memberships
    WHERE id = v_membership_id AND role = 'treasurer' AND status = 'active' AND is_active = TRUE
  ), 'le membership provisionné doit être actif (treasurer)';

  RAISE NOTICE 'OK : persistance clubs/memberships confirmée hors RLS';
END $$;

ROLLBACK;
