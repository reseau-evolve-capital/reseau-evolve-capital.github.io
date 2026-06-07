-- 033_club_min_contribution.sql — Cotisation minimale par club, éditable par le staff.
--
-- L'owner veut un montant de cotisation MINIMUM par club, paramétrable par le trésorier/
-- président dans l'espace admin, avec une valeur par DÉFAUT de 100 €.
--
-- La colonne `clubs.min_contribution` existe déjà (002) mais était nullable, sans défaut,
-- et non exposée à l'édition. Ici : défaut 100, backfill des NULL existants, passage NOT NULL
-- (la valeur est désormais toujours présente), et ajout du paramètre à la RPC staff d'édition.
--
-- Réf : 025/028 (update_club_settings), DATA_MODEL §4.1, CLAUDE.md (RLS, jamais service-role).

-- 1. Défaut 100 + backfill + NOT NULL (toujours une valeur).
ALTER TABLE clubs ALTER COLUMN min_contribution SET DEFAULT 100;
UPDATE clubs SET min_contribution = 100 WHERE min_contribution IS NULL;
ALTER TABLE clubs ALTER COLUMN min_contribution SET NOT NULL;

-- 2. RPC d'édition : on ajoute p_min_contribution. La signature change (7e param) → on DROP
--    l'ancienne (6 args) avant de recréer, sinon Postgres crée une surcharge ambiguë.
DROP FUNCTION IF EXISTS public.update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_club_settings(
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
  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- Autorité staff vérifiée AVANT écriture (cf. 028).
  IF NOT public.is_club_staff(p_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_name    := NULLIF(btrim(p_name), '');
  v_city    := NULLIF(btrim(p_city), '');
  v_country := NULLIF(btrim(p_country), '');
  v_broker  := NULLIF(btrim(p_broker_account_ref), '');

  IF v_name IS NULL THEN
    v_name := (SELECT name FROM clubs WHERE id = p_club_id);
  END IF;

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

  -- Cotisation minimale : négatif interdit. NULL → inchangé (la colonne est NOT NULL,
  -- on ne l'efface jamais), via COALESCE dans l'UPDATE.
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
END;
$$;

REVOKE ALL ON FUNCTION public.update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) FROM public;
GRANT EXECUTE ON FUNCTION public.update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;
