-- 050_clubs_is_active.sql — NET-018 : désactiver / réactiver un club (soft-disable réseau).
--
-- Un network_admin doit pouvoir DÉSACTIVER un club SANS rien supprimer : ses membres ne peuvent
-- alors plus consulter la matrice ni déclencher de sync, jusqu'à réactivation. Décision owner :
-- une colonne `clubs.is_active` qui GATE le helper RLS `get_user_club_ids()` (migration 010).
-- Un club désactivé sort donc AUTOMATIQUEMENT de toutes les policies RLS membre qui s'appuient
-- sur ce helper (memberships, positions, contributions, sheet_snapshots, …) : aucune donnée
-- n'est touchée, mais elle redevient invisible aux membres tant que le club est désactivé.
--
-- Le scope RÉSEAU (network_admin / network_board) continue, lui, de voir TOUS les clubs : les RPC
-- `network_*` sont SECURITY DEFINER (bypass RLS) et ne dépendent pas de `get_user_club_ids()`.
--
-- Contenu :
--   1. ALTER TABLE clubs ADD COLUMN is_active boolean NOT NULL DEFAULT true.
--   2. get_user_club_ids() → joint clubs et exige clubs.is_active = TRUE (gate RLS membre).
--   3. RPC network_set_club_active(p_club_id, p_active) — bascule + audit (club_disabled/enabled).
--      + alias network_disable_club(p_club_id, p_reason) / network_enable_club(p_club_id).
--   4. network_list_clubs() étendu : expose `is_active` (le listing réseau garde les clubs
--      désactivés ; c'est l'UI qui les distingue et exclut leur capital du KPI cumulé).
--
-- Pas de NOUVELLE table → pas de nouvelle policy RLS à poser ici (network_events existe déjà,
-- migration 042 : lecture membre réseau, écriture via RPC SECURITY DEFINER uniquement).
--
-- Réf : migrations 002 (clubs), 010 (get_user_club_ids), 040 (helpers réseau fail-closed),
-- 042 (network_log_event + pattern RPC gardée), 043/049 (network_list_clubs), CLAUDE.md
-- (RLS partout, least privilege, jamais de service-role côté app).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Colonne clubs.is_active. Tous les clubs existants restent actifs (DEFAULT true, NOT NULL).
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clubs.is_active IS
  'Club actif (true) ou désactivé (false, soft-disable NET-018). Un club désactivé sort de '
  'get_user_club_ids() (invisible à ses membres via RLS) et est refusé par l''Edge sync. '
  'Aucune donnée supprimée : la réactivation restaure l''accès à l''identique.';

-- Index partiel : la grande majorité des lectures RLS ne veut que les clubs actifs. Léger,
-- aide le planner sur le JOIN du helper ci-dessous (filtre is_active = TRUE).
CREATE INDEX IF NOT EXISTS clubs_is_active_idx ON public.clubs (id) WHERE is_active;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. get_user_club_ids() → ne renvoie QUE les clubs actifs du user.
--    On garde SECURITY DEFINER STABLE + search_path fixe (anti-récursion sur memberships,
--    cf. migration 010). Le JOIN sur clubs filtre is_active : un membre d'un club désactivé
--    ne le voit plus dans aucune policy RLS qui consomme ce helper.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_club_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_catalog
AS $$
  SELECT m.club_id
  FROM memberships m
  JOIN clubs c ON c.id = m.club_id
  WHERE m.user_id = auth.uid()
    AND m.is_active = TRUE
    AND c.is_active = TRUE;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RPC network_set_club_active — bascule is_active (network_admin) + audit.
--    Action sensible RÉSERVÉE network_admin (board = lecture seule). Journalise dans
--    network_events : action 'club_disabled' / 'club_enabled' (+ raison optionnelle).
--    Idempotent : rebasculer vers l'état courant n'audite pas un no-op.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_set_club_active(
  p_club_id UUID,
  p_active  BOOLEAN,
  p_reason  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_current BOOLEAN;
  v_reason  TEXT;
BEGIN
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT is_active INTO v_current FROM clubs WHERE id = p_club_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- No-op : l'état demandé est déjà le courant → rien à écrire ni à auditer.
  IF v_current = p_active THEN
    RETURN;
  END IF;

  UPDATE clubs
     SET is_active  = p_active,
         updated_at = NOW()
   WHERE id = p_club_id;

  v_reason := NULLIF(btrim(p_reason), '');

  PERFORM public.network_log_event(
    CASE WHEN p_active THEN 'club_enabled' ELSE 'club_disabled' END,
    'club',
    p_club_id,
    jsonb_build_object('active', p_active, 'reason', v_reason)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.network_set_club_active(UUID, BOOLEAN, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.network_set_club_active(UUID, BOOLEAN, TEXT) TO authenticated;

-- Alias lisibles (spec NET-018) — délèguent à network_set_club_active. Même garde via la RPC cible.
CREATE OR REPLACE FUNCTION public.network_disable_club(p_club_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT public.network_set_club_active(p_club_id, FALSE, p_reason);
$$;
REVOKE ALL ON FUNCTION public.network_disable_club(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.network_disable_club(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.network_enable_club(p_club_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT public.network_set_club_active(p_club_id, TRUE, NULL);
$$;
REVOKE ALL ON FUNCTION public.network_enable_club(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.network_enable_club(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. network_list_clubs() — expose `is_active`. Le listing réseau garde les clubs DÉSACTIVÉS
--    (l'UI les distingue : badge « Désactivé », ligne atténuée, exclusion du KPI capital).
--    Changer la signature RETURNS TABLE impose un DROP préalable (cf. migration 049).
-- ════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.network_list_clubs();

CREATE FUNCTION public.network_list_clubs()
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  slug                 TEXT,
  city                 TEXT,
  country              CHAR(2),
  active_members_count BIGINT,
  aggregated_valuation NUMERIC,
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ,
  matrix_connected     BOOLEAN,
  is_active            BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- Garde fail-closed : seul un membre réseau (admin OU board) liste tous les clubs.
  IF NOT public.is_network_member() THEN
    RAISE EXCEPTION 'acces refuse : membre réseau requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.city,
    c.country,
    COALESCE(mc.cnt, 0)                                   AS active_members_count,
    pa.market_value                                       AS aggregated_valuation,
    c.synced_at                                           AS last_synced_at,
    c.created_at                                          AS created_at,
    (c.sheet_id IS NOT NULL AND btrim(c.sheet_id) <> '')  AS matrix_connected,
    c.is_active                                           AS is_active
  FROM clubs c
  -- Compte des membres actifs : agrégat pré-réduit (pas de N+1, pas de doublon de ligne club).
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT AS cnt
    FROM memberships m
    WHERE m.club_id = c.id AND m.is_active = TRUE
  ) mc ON TRUE
  -- Valo agrégée : ligne « Portefeuille » active (= total affiché par l'app). 1 ligne max par club.
  LEFT JOIN LATERAL (
    SELECT a.market_value
    FROM portfolio_aggregates a
    WHERE a.club_id = c.id
      AND a.is_active = TRUE
      AND lower(translate(btrim(a.label),
            'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
            'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')) = 'portefeuille'
    LIMIT 1
  ) pa ON TRUE
  ORDER BY c.name;
END;
$$;
REVOKE ALL ON FUNCTION public.network_list_clubs() FROM public;
GRANT EXECUTE ON FUNCTION public.network_list_clubs() TO authenticated;
