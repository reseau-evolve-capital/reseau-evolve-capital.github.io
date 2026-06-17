-- 040_network_members.sql — NET-001 : fondation données du scope RÉSEAU.
--
-- Le « réseau » est le niveau au-dessus des clubs : un network_admin pilote l'ajout de clubs
-- et la gouvernance inter-clubs (espace /reseau). Ce scope est ORTHOGONAL au rôle per-club
-- `member_role` (migration 001) : ne pas confondre `member_role.network_admin` (rôle d'un
-- membre DANS un club, hérité historiquement) avec le nouveau scope `network_role` ci-dessous
-- (appartenance à l'équipe RÉSEAU, indépendante de tout club).
--
-- Contenu :
--   1. Enums `network_role` / `network_title`.
--   2. Table `network_members` (PK = users.id) + RLS.
--   3. Helpers fail-closed `is_network_admin()` / `is_network_member()` (SECURITY DEFINER STABLE).
--   4. Policy RLS SELECT uniquement (écritures via RPC SECURITY DEFINER — NET-003).
--   5. Trigger updated_at (fonction générique `set_updated_at`, créée ici car absente du repo —
--      convention historique : `updated_at = NOW()` posé à la main dans chaque RPC ; on
--      introduit le trigger générique pour fiabiliser la colonne quel que soit le chemin d'écriture).
--   6. Validation fail-closed à l'application (bloc DO ... ASSERT — pas de harnais SQL unitaire).
--
-- Réf : migrations 001 (enums), 010 (helpers RLS SECURITY DEFINER STABLE), 028 (is_club_staff
-- fail-closed COALESCE), 038 (RLS + GRANT explicite Data API) ; CLAUDE.md (RLS/least privilege).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Enums (idempotents — pattern migration 001).
-- ════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TYPE network_role AS ENUM ('network_admin', 'network_board');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE network_title AS ENUM ('president', 'vice_president', 'treasurer', 'secretary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Table network_members.
--    PK = user_id (un user appartient au plus une fois à l'équipe réseau).
--    FK → users(id) ON DELETE CASCADE : la liaison auth se fait par re-key de users.id
--    vers auth.uid() au 1er login (handle_new_user, migration 014) ; on référence donc
--    public.users(id), cohérent avec le seed (un user importé existe avant d'avoir un compte).
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.network_members (
  user_id    UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  role       network_role NOT NULL,
  title      network_title,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.network_members IS
  'Équipe RÉSEAU (scope au-dessus des clubs). Écritures via RPC SECURITY DEFINER (NET-003) ; aucune policy INSERT/UPDATE/DELETE pour authenticated.';

ALTER TABLE public.network_members ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Helpers fail-closed (SECURITY DEFINER STABLE — pattern 010/028).
--    COALESCE(..., false) : un user non listé / non authentifié → refus explicite.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_network_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT role = 'network_admin' FROM public.network_members WHERE user_id = auth.uid()),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.is_network_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_network_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_network_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT role IN ('network_admin', 'network_board')
       FROM public.network_members WHERE user_id = auth.uid()),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.is_network_member() FROM public;
GRANT EXECUTE ON FUNCTION public.is_network_member() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. RLS network_members — SELECT uniquement.
--    Un user lit sa propre ligne ; un membre réseau lit toute l'équipe.
--    AUCUNE policy INSERT/UPDATE/DELETE pour authenticated : les écritures passeront
--    par des RPC SECURITY DEFINER (NET-003). Le GRANT n'accorde que SELECT (défense
--    en profondeur — même chemin que 038, l'auto-expose Data API étant désactivé).
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "network_members: lecture self ou membre reseau" ON public.network_members;

CREATE POLICY "network_members: lecture self ou membre reseau"
  ON public.network_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_network_member()
  );

GRANT SELECT ON public.network_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_members TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Trigger updated_at.
--    Le repo n'a pas de fonction de trigger updated_at générique (la convention
--    historique pose `updated_at = NOW()` à la main dans chaque RPC). On introduit ici
--    une fonction générique réutilisable, idempotente (CREATE OR REPLACE), et on la câble
--    en BEFORE UPDATE sur network_members.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS network_members_set_updated_at ON public.network_members;
CREATE TRIGGER network_members_set_updated_at
  BEFORE UPDATE ON public.network_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Validation fail-closed à l'application (pas de harnais SQL unitaire dans le repo).
--    Sans JWT (auth.uid() NULL), les helpers DOIVENT renvoyer false (sécurité fail-closed).
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  ASSERT public.is_network_admin() = false,
    'is_network_admin() doit être fail-closed (false) sans utilisateur authentifié';
  ASSERT public.is_network_member() = false,
    'is_network_member() doit être fail-closed (false) sans utilisateur authentifié';
END $$;
