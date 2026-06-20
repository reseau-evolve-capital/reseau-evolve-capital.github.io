-- 046_network_member_read_access.sql — Fix accès lecture pour network_board sur les fiches club.
--
-- PROBLÈME : la fiche club /reseau/clubs/[id] était réservée aux network_admin, pour deux raisons :
--
--   1. Politique RLS `clubs: member read` (migration 011) : n'autorise que les membres DU club
--      (id IN get_user_club_ids()). Un membre réseau (admin OU board) qui n'est pas membre du club
--      ne peut donc pas lire le nom/pays/paramètres via la table `clubs` directement.
--      → On ajoute une politique `clubs: network member read` (SELECT seulement, is_network_member).
--
--   2. RPCs `network_list_club_members` (044) et `network_list_sheet_snapshots` (045) étaient
--      gardées `is_network_admin()` seulement. Un `network_board` recevait RAISE 42501 et
--      l'error boundary "Impossible de charger la fiche du club" s'affichait.
--      → On élargit la garde à `is_network_member()` (admin + board).
--
-- PÉRIMÈTRE DONNÉES : network_board accède aux mêmes données en LECTURE que network_admin.
-- Les actions ÉCRITURE (update settings, import, sync) restent gardées `is_network_admin` côté
-- RPC (network_update_club_settings reste inchangée). La fiche UI conditionne déjà l'affichage
-- des boutons d'action sur `isAdmin` (prop transmise par la page selon le rôle de session).
--
-- Réf : migrations 011 (RLS clubs), 040 (is_network_member), 044 (network_list_club_members),
-- 045 (network_list_sheet_snapshots) ; CLAUDE.md (RLS, least-privilege, jamais service-role).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Politique RLS `clubs: network member read`
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "clubs: network member read" ON clubs;

CREATE POLICY "clubs: network member read"
  ON clubs FOR SELECT
  USING (public.is_network_member());

-- ════════════════════════════════════════════════════════════════════════════
-- 2. network_list_club_members — garde élargie à is_network_member()
-- ════════════════════════════════════════════════════════════════════════════

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
  -- Garde fail-closed : membre réseau (admin OU board) peut lire les membres d'un club.
  IF NOT public.is_network_member() THEN
    RAISE EXCEPTION 'acces refuse : membre reseau requis' USING ERRCODE = 'insufficient_privilege';
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

-- ════════════════════════════════════════════════════════════════════════════
-- 3. network_list_sheet_snapshots — garde élargie à is_network_member()
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.network_list_sheet_snapshots(
  p_club_id UUID,
  p_limit   INT DEFAULT 10
)
RETURNS TABLE (
  synced_at    TIMESTAMPTZ,
  total_rows   BIGINT,
  status       snapshot_status,
  sheets_count BIGINT,
  first_error  TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_limit INT;
BEGIN
  -- Garde fail-closed : membre réseau (admin OU board) peut lire l'historique des syncs.
  IF NOT public.is_network_member() THEN
    RAISE EXCEPTION 'acces refuse : membre reseau requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);

  RETURN QUERY
  SELECT
    g.synced_at,
    g.total_rows,
    g.status,
    g.sheets_count,
    g.first_error
  FROM (
    SELECT
      date_trunc('second', s.synced_at)                       AS synced_at,
      SUM(s.row_count)::BIGINT                                 AS total_rows,
      (CASE
         WHEN bool_or(s.status = 'failed')  THEN 'failed'
         WHEN bool_or(s.status = 'partial') THEN 'partial'
         ELSE 'success'
       END)::snapshot_status                                  AS status,
      COUNT(*)::BIGINT                                         AS sheets_count,
      (array_agg(s.error_message) FILTER (WHERE s.error_message IS NOT NULL AND btrim(s.error_message) <> ''))[1] AS first_error
    FROM sheet_snapshots s
    WHERE s.club_id = p_club_id
    GROUP BY date_trunc('second', s.synced_at)
  ) g
  ORDER BY g.synced_at DESC
  LIMIT v_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.network_list_sheet_snapshots(UUID, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.network_list_sheet_snapshots(UUID, INT) TO authenticated;
