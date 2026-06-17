-- 043_network_list_clubs.sql — NET-008 (subset) : listing des clubs pour le cockpit RÉSEAU.
--
-- L'espace /reseau a besoin d'une vue d'ensemble de TOUS les clubs (≠ RLS membre qui n'expose
-- que les clubs du user). network_list_clubs() est une table-function SECURITY DEFINER (bypass RLS)
-- gardée : seul un membre réseau (admin OU board) peut l'appeler — sinon RAISE 42501. Elle renvoie,
-- par club, les agrégats du cockpit en UNE passe (jointures, PAS de N+1).
--
-- Champs renvoyés :
--   id, name, slug, city, country
--   active_members_count — nb de memberships actifs (is_active, colonne GENERATED ; migration 004).
--   aggregated_valuation — valorisation nette agrégée du club.
--   last_synced_at       — clubs.synced_at (dernier sync réussi de la matrice).
--   matrix_connected     — clubs.sheet_id IS NOT NULL AND <> '' (matrice Sheets branchée).
--
-- SOURCE de `aggregated_valuation` — choix & justification :
--   On lit la ligne d'agrégat « Portefeuille » de `portfolio_aggregates` (migration 029), colonne
--   `market_value`, label normalisé = 'portefeuille'. C'est EXACTEMENT le total que l'app affiche
--   (cf. apps/web/lib/data/portfolio.ts → totalFromAggregates / PORTEFEUILLE_LABEL), garanti
--   UNE ligne par club. On NE somme PAS `contributions.net_market_value` : ce serait la même valeur
--   éclatée par membre (N lignes/club, sensible à la dérive d'un sync partiel et au filtrage
--   d'activité). La ligne d'agrégat est donc la source la plus fiable et la moins coûteuse.
--   Match du label : même normalisation que l'app (minuscule, accents/espaces lissés) ; on ne lit
--   que les lignes is_active = TRUE (un label absent du dernier sync est désactivé, migration 029).
--   NULL si le club n'a pas encore de ligne « Portefeuille » (jamais synchronisé) → l'UI affiche « — ».
--
-- Réf : migrations 002 (clubs), 004 (memberships.is_active GENERATED), 029 (portfolio_aggregates),
-- 040 (is_network_member fail-closed) ; apps/web/lib/data/portfolio.ts (parité du total affiché).

CREATE OR REPLACE FUNCTION public.network_list_clubs()
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  slug                 TEXT,
  city                 TEXT,
  country              CHAR(2),
  active_members_count BIGINT,
  aggregated_valuation NUMERIC,
  last_synced_at       TIMESTAMPTZ,
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
