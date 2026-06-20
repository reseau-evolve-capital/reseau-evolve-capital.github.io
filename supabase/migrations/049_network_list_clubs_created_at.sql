-- ════════════════════════════════════════════════════════════════════════════
-- 049 — Expose clubs.created_at dans network_list_clubs (colonne « Date d'ajout »).
--
-- La liste réseau (/reseau/clubs) doit afficher la date d'ajout de chaque club.
-- `network_list_clubs()` ne renvoyait pas `created_at` → on l'ajoute à la table de retour.
-- Changer la signature de RETURNS TABLE impose un DROP préalable (CREATE OR REPLACE
-- ne peut pas modifier le type de retour d'une fonction).
--
-- Réf : NET-005 (migration 043), DATA_MODEL (clubs.created_at NOT NULL DEFAULT now()).
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
  matrix_connected     BOOLEAN
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
    (c.sheet_id IS NOT NULL AND btrim(c.sheet_id) <> '')  AS matrix_connected
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
