-- 055_network_list_members.sql — NET-020 : RPC de LECTURE pour l'écran « Bureau du réseau »
-- (/reseau/bureau). Deux table-functions SECURITY DEFINER, LECTURE SEULE, gardées
-- `is_network_member()` (admin OU board) :
--
--   1. network_list_board()           — les membres ayant un rôle réseau (la table affichée).
--   2. network_list_eligible_members() — les users pouvant RECEVOIR un rôle réseau (le Select
--                                        du Dialog « Ajouter au bureau »).
--
-- POURQUOI une RPC dédiée :
--   - `network_members` est lisible par un membre réseau (policy 040), MAIS la jointure vers
--     `users` (full_name / email / avatar) est barrée par la RLS per-club de `users`
--     (« users: club members read », migration 011) : un membre réseau n'est pas forcément membre
--     du club de la personne ciblée → 0 ligne renvoyée. On a donc besoin d'un chemin SECURITY
--     DEFINER pour exposer le couple (rôle réseau + identité) à l'écran Bureau, sans élargir les
--     policies RLS existantes (CLAUDE.md : on n'élargit pas les policies club).
--   - De même, le Select « Ajouter au bureau » doit lister TOUS les users (cross-club), ce que la
--     RLS de `users` n'autorise pas hors club : SECURITY DEFINER gardé membre réseau.
--
-- AUCUNE écriture. Les mutations (grant/revoke) restent les RPC d'écriture de la migration 042,
-- gardées `is_network_admin()`. Ici on est en lecture, donc garde élargie au membre réseau (un
-- network_board consulte le bureau en LECTURE SEULE, comme la liste des clubs).
--
-- Réf : migrations 003 (users), 040 (network_members + is_network_member fail-closed),
--   042 (network_grant_role/revoke — consommateurs du user_id), 044/046 (même pattern
--   table-function réseau gardée) ; CLAUDE.md (RLS least-privilege, jamais service-role côté app).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. network_list_board — membres de l'équipe réseau (rôle + titre + identité).
--    Ordre : admins d'abord (gouvernance), puis par nom. LECTURE SEULE.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_list_board()
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  email      TEXT,
  avatar_url TEXT,
  role       network_role,
  title      network_title
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- Garde fail-closed : membre réseau (admin OU board) lit le bureau ; sinon RAISE 42501.
  IF NOT public.is_network_member() THEN
    RAISE EXCEPTION 'acces refuse : membre reseau requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    u.id         AS user_id,
    u.full_name,
    u.email,
    u.avatar_url,
    nm.role,
    nm.title
  FROM public.network_members nm
  JOIN public.users u ON u.id = nm.user_id
  ORDER BY
    -- network_admin avant network_board (l'enum n'est pas ordonné par gouvernance).
    (CASE WHEN nm.role = 'network_admin' THEN 0 ELSE 1 END),
    u.full_name;
END;
$$;
REVOKE ALL ON FUNCTION public.network_list_board() FROM public;
GRANT EXECUTE ON FUNCTION public.network_list_board() TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. network_list_eligible_members — users pouvant recevoir un rôle réseau (Select du Dialog).
--    Renvoie TOUS les users (cross-club) avec un drapeau `is_member` indiquant s'ils ont DÉJÀ
--    un rôle réseau (l'UI affiche alors « déjà au bureau » et propose une modification).
--    Le réseau est petit (≤ quelques centaines de users) : pas de pagination requise ici, mais
--    on borne défensivement et on trie par nom pour une recherche côté client.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_list_eligible_members()
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  email      TEXT,
  avatar_url TEXT,
  is_member  BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- Garde fail-closed : seul un membre réseau peut lister les users pour l'attribution.
  IF NOT public.is_network_member() THEN
    RAISE EXCEPTION 'acces refuse : membre reseau requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    u.id        AS user_id,
    u.full_name,
    u.email,
    u.avatar_url,
    (nm.user_id IS NOT NULL) AS is_member
  FROM public.users u
  LEFT JOIN public.network_members nm ON nm.user_id = u.id
  ORDER BY u.full_name;
END;
$$;
REVOKE ALL ON FUNCTION public.network_list_eligible_members() FROM public;
GRANT EXECUTE ON FUNCTION public.network_list_eligible_members() TO authenticated;
