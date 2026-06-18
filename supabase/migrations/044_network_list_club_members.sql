-- 044_network_list_club_members.sql — NET-006 : listing des membres importés d'un club, pour
-- l'étape 3 de l'assistant « Ajouter un club » (désigner le premier responsable).
--
-- PROBLÈME RLS résolu : un network_admin qui vient de CRÉER un club n'en est PAS membre — la RLS
-- per-club (`memberships: club read` / `users: club members read`, migration 011) ne lui expose
-- donc AUCUN membre du club fraîchement synchronisé. Le rôle réseau (`network_members`, migration
-- 040) est GLOBAL et orthogonal au `member_role` per-club : `get_user_role_in_club` ne renvoie
-- jamais d'autorité réseau. Il faut donc un chemin SECURITY DEFINER dédié, gardé `is_network_admin`.
--
-- Contrat : network_list_club_members(p_club_id) → table (user_id, full_name, email, role, status).
-- LECTURE SEULE (aucune écriture). Garde fail-closed : seul un network_admin liste les membres d'un
-- club arbitraire (sinon RAISE 42501). On expose `email` car le réseau est administrateur global
-- (même surface que le provisioning par user_id) — non diffusé hors de l'écran admin réseau.
--
-- Réf : migrations 003/004 (users/memberships), 011 (RLS per-club contournée ici à dessein),
-- 040 (is_network_admin fail-closed), 042 (network_provision_first_staff — consommateur du user_id),
-- 043 (network_list_clubs, même pattern table-function gardée) ; CLAUDE.md (RLS least-privilege).

CREATE OR REPLACE FUNCTION public.network_list_club_members(p_club_id UUID)
RETURNS TABLE (
  user_id   UUID,
  full_name TEXT,
  email     TEXT,
  role      member_role,
  status    member_status
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- Garde fail-closed : seul un network_admin peut lister les membres d'un club arbitraire.
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  RETURN QUERY
  SELECT
    u.id        AS user_id,
    u.full_name,
    u.email,
    m.role,
    m.status
  FROM memberships m
  JOIN users u ON u.id = m.user_id
  WHERE m.club_id = p_club_id
  ORDER BY u.full_name;
END;
$$;
REVOKE ALL ON FUNCTION public.network_list_club_members(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.network_list_club_members(UUID) TO authenticated;
