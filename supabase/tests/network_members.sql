-- supabase/tests/network_members.sql — NET-001 : vérification SQL reproductible.
--
-- Le repo n'a pas de framework SQL unitaire (pgTAP/pg_prove). Ce fichier est un script
-- ASSERT autonome, à jouer manuellement contre la stack LOCALE :
--
--   psql "$(supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '\"')" -v ON_ERROR_STOP=1 -f supabase/tests/network_members.sql
--
-- Il ne fait AUCUNE écriture persistante (tout en transaction ROLLBACK). Il valide :
--   (a) is_network_admin()/is_network_member() = false pour un user authentifié NON listé (fail-closed) ;
--   (b) un rôle `authenticated` ne peut PAS INSERT dans network_members (RLS refuse — pas de policy WRITE).
--
-- N'est PAS exécuté par `make lint typecheck test` (le gate ne joue ni Deno ni SQL).
-- La même garantie fail-closed est répliquée par le bloc DO ... ASSERT en fin de migration 040.

BEGIN;

-- ── (a) Helpers fail-closed pour un user authentifié non listé ─────────────────
-- On simule un JWT `authenticated` dont le sub (auth.uid()) n'est PAS dans network_members.
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ff"}';

DO $$
BEGIN
  ASSERT public.is_network_admin()  = false, 'is_network_admin() doit être false pour un user non listé';
  ASSERT public.is_network_member() = false, 'is_network_member() doit être false pour un user non listé';
END $$;

-- ── (b) Un `authenticated` ne peut pas écrire dans network_members (RLS) ────────
-- Aucune policy INSERT pour authenticated → l'écriture directe doit lever 42501.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.network_members (user_id, role)
    VALUES ('00000000-0000-0000-0000-0000000000ff', 'network_admin');
    RAISE EXCEPTION 'ÉCHEC : un authenticated a pu INSERT dans network_members (RLS non appliquée)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'OK : INSERT refusé par la RLS (42501) comme attendu';
  END;
END $$;

RESET role;
ROLLBACK;
