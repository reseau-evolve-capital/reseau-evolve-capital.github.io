-- supabase/tests/secretary_read_access.sql — verification SQL reproductible (role club `secretary`).
--
-- Le repo n'a pas de framework SQL unitaire (pgTAP/pg_prove). Script ASSERT autonome, a jouer
-- contre la stack LOCALE :
--
--   psql "$(supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '\"')" -v ON_ERROR_STOP=1 -f supabase/tests/secretary_read_access.sql
--
-- AUCUNE ecriture persistante (tout en transaction ROLLBACK). Valide le contrat LECTURE SEULE
-- du role `secretary` introduit par les migrations 061/062 :
--   (a) can_view_club_admin() = true pour un secretaire (acces LECTURE a l'espace admin) ;
--   (b) is_club_staff() = false pour un secretaire (palier ECRITURE l'exclut) ;
--   (c) le secretaire VOIT les contributions de son club (RLS read repointee sur can_view_club_admin) ;
--   (d) une action de gestion (admin_change_member_role, gardee is_club_staff) lui est REFUSEE (42501).
--
-- N'est PAS execute par `make lint typecheck test` (le gate ne joue ni Deno ni SQL).

BEGIN;

-- ── Seed (en superuser : bypass RLS) ─────────────────────────────────────────
-- Un club, un secretaire, un membre cible, une contribution visible.
INSERT INTO public.users (id, email, full_name)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'sec@test.local',    'Secretaire Test'),
  ('11111111-0000-0000-0000-000000000002', 'member@test.local', 'Membre Cible');

INSERT INTO public.clubs (id, name, slug, min_contribution, currency, settings, is_active)
VALUES ('22222222-0000-0000-0000-000000000001', 'Club Test', 'club-test', 100, 'EUR', '{}'::jsonb, true);

INSERT INTO public.memberships (id, user_id, club_id, role, status, joined_at)
VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001', 'secretary', 'active', now()),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002',
   '22222222-0000-0000-0000-000000000001', 'member', 'active', now());

INSERT INTO public.contributions (membership_id, club_id, detention_pct, total_contributed, status, synced_at)
VALUES ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001',
        10.0, 500, 'ok', now());

-- ── Bascule sur le JWT du secretaire ─────────────────────────────────────────
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"11111111-0000-0000-0000-000000000001"}';

-- (a) + (b) Paliers de role : lecture admise, ecriture exclue.
DO $$
BEGIN
  ASSERT public.can_view_club_admin('22222222-0000-0000-0000-000000000001') = true,
    '(a) can_view_club_admin() doit etre true pour un secretaire';
  ASSERT public.is_club_staff('22222222-0000-0000-0000-000000000001') = false,
    '(b) is_club_staff() doit etre false pour un secretaire (lecture seule)';
END $$;

-- (c) Le secretaire VOIT les contributions de son club (RLS read repointee 062).
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.contributions
  WHERE club_id = '22222222-0000-0000-0000-000000000001';
  ASSERT v_count = 1, '(c) le secretaire doit voir la contribution de son club (RLS read)';
END $$;

-- (d) Action de gestion refusee : changer le role d'un membre exige is_club_staff (42501).
DO $$
BEGIN
  BEGIN
    PERFORM public.admin_change_member_role(
      '33333333-0000-0000-0000-000000000002', 'treasurer'
    );
    RAISE EXCEPTION 'ECHEC : un secretaire a pu changer un role (garde ecriture non appliquee)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'OK : action de gestion refusee au secretaire (42501) comme attendu';
  END;
END $$;

RESET role;
ROLLBACK;
