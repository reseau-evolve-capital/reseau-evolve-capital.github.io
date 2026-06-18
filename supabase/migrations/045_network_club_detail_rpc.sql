-- 045_network_club_detail_rpc.sql — NET-007 : fiche club /reseau/clubs/[id].
--
-- La fiche club côté RÉSEAU a besoin de deux capacités qu'aucune RPC existante ne couvre, parce
-- que les chemins per-club reposent sur l'autorité MEMBRE du club (RLS / get_user_role_in_club /
-- is_club_staff) — or un network_admin n'est PAS membre du club qu'il administre :
--
--   1. LIRE l'historique des synchronisations (table sheet_snapshots, migration 009). La RLS de
--      sheet_snapshots (migration 011) n'autorise que le trésorier DU club. Un network_admin
--      non-membre ne verrait donc rien → on expose un chemin SECURITY DEFINER gardé
--      `is_network_admin`, en LECTURE SEULE, qui renvoie les N derniers snapshots agrégés par sync.
--
--   2. ÉDITER les paramètres du club (nom, ville, pays, courtier, plafond). `update_club_settings`
--      (migrations 025/033) est gardé `is_club_staff` → inaccessible à un network_admin non-membre.
--      On calque donc cette RPC en `network_update_club_settings`, MAIS gardée `is_network_admin`
--      EN PREMIER + audit `network_events` (migration 042). Même normalisation/validation (pays
--      ISO alpha-2, plafond ≥ 0, nom NOT NULL préservé) pour rester cohérent avec la voie staff.
--
-- Comme partout (016/025/028/042) : AUCUN GRANT UPDATE large ; toute mutation passe par une RPC
-- SECURITY DEFINER gardée qui vérifie l'autorité AVANT d'écrire. JAMAIS de service-role côté app.
-- search_path fixe ; REVOKE public / GRANT authenticated (la garde dans le corps fait le reste).
--
-- Réf : migrations 009 (sheet_snapshots), 011 (RLS per-club contournée à dessein), 025/033
-- (update_club_settings — modèle de la voie staff), 042 (network_events + network_log_event +
-- pattern garde is_network_admin), 043/044 (table-functions réseau gardées) ; CLAUDE.md (RLS,
-- least privilege, jamais service-role).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. network_list_sheet_snapshots — historique des syncs d'un club (LECTURE SEULE).
--
--    Une sync écrit UNE ligne sheet_snapshots PAR FEUILLE (sheet_name) au même instant. La fiche
--    club veut UNE ligne par SYNCHRONISATION (date, lignes importées, statut, détail), pas par
--    feuille. On agrège donc par horodatage de sync (synced_at tronqué à la seconde, suffisant car
--    toutes les feuilles d'une même passe partagent NOW()) :
--      - synced_at       : l'instant de la sync.
--      - total_rows      : somme des row_count de toutes les feuilles de cette passe.
--      - status          : pire statut de la passe (failed > partial > success) → reflète l'échec
--                          d'au moins une feuille (sévérité décroissante).
--      - sheets_count    : nombre de feuilles importées dans la passe.
--      - first_error     : 1er error_message non vide de la passe (détail affichable), sinon NULL.
--    Renvoie les `p_limit` dernières syncs (défaut 10, borné [1,50]), de la plus récente à la plus
--    ancienne. Garde fail-closed `is_network_admin` EN PREMIER.
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
  -- Garde fail-closed : seul un network_admin peut lire l'historique d'un club arbitraire.
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- Limite bornée (jamais d'extraction massive ; défaut 10).
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
      -- Pire statut de la passe : failed > partial > success.
      (CASE
         WHEN bool_or(s.status = 'failed')  THEN 'failed'
         WHEN bool_or(s.status = 'partial') THEN 'partial'
         ELSE 'success'
       END)::snapshot_status                                  AS status,
      COUNT(*)::BIGINT                                         AS sheets_count,
      -- 1er message d'erreur non vide de la passe (détail affichable).
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

-- ════════════════════════════════════════════════════════════════════════════
-- 2. network_update_club_settings — édition des paramètres d'un club par le RÉSEAU.
--
--    Calque de update_club_settings (033) MAIS garde `is_network_admin` EN PREMIER (≠ is_club_staff)
--    + audit network_events. Sémantique identique : nom NOT NULL préservé si vide, pays ISO alpha-2
--    MAJUSCULES (ou NULL), plafond ≥ 0, cotisation minimale ≥ 0 (NULL → inchangée car NOT NULL).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_update_club_settings(
  p_club_id                 UUID,
  p_name                    TEXT    DEFAULT NULL,
  p_city                    TEXT    DEFAULT NULL,
  p_country                 TEXT    DEFAULT NULL,
  p_broker_account_ref      TEXT    DEFAULT NULL,
  p_annual_investment_cap   NUMERIC DEFAULT NULL,
  p_min_contribution        NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_name    TEXT;
  v_city    TEXT;
  v_country TEXT;
  v_broker  TEXT;
BEGIN
  -- Garde fail-closed : seul un network_admin édite les paramètres d'un club arbitraire.
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  v_name    := NULLIF(btrim(p_name), '');
  v_city    := NULLIF(btrim(p_city), '');
  v_country := NULLIF(btrim(p_country), '');
  v_broker  := NULLIF(btrim(p_broker_account_ref), '');

  -- Le nom est NOT NULL en DB : un nom vide ne doit pas effacer la valeur existante.
  IF v_name IS NULL THEN
    v_name := (SELECT name FROM clubs WHERE id = p_club_id);
  END IF;

  -- Pays : ISO 3166-1 alpha-2 (2 lettres) en MAJUSCULES, ou NULL (colonne nullable depuis 024).
  IF v_country IS NOT NULL THEN
    v_country := upper(v_country);
    IF v_country !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'pays invalide (code ISO alpha-2 attendu)'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  IF p_annual_investment_cap IS NOT NULL AND p_annual_investment_cap < 0 THEN
    RAISE EXCEPTION 'plafond annuel invalide (négatif)'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_min_contribution IS NOT NULL AND p_min_contribution < 0 THEN
    RAISE EXCEPTION 'cotisation minimale invalide (négative)'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE clubs
     SET name                  = v_name,
         city                  = v_city,
         country               = v_country,
         broker_account_ref    = v_broker,
         annual_investment_cap = p_annual_investment_cap,
         min_contribution      = COALESCE(p_min_contribution, min_contribution),
         updated_at            = NOW()
   WHERE id = p_club_id;

  PERFORM public.network_log_event(
    'network_update_club_settings', 'club', p_club_id,
    jsonb_build_object(
      'name', v_name,
      'country', v_country,
      'broker_changed', v_broker IS NOT NULL,
      'cap_changed', p_annual_investment_cap IS NOT NULL
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.network_update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) FROM public;
GRANT EXECUTE ON FUNCTION public.network_update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;
