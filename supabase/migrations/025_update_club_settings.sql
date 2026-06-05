-- 025_update_club_settings.sql — Édition des paramètres du club par l'admin/président.
--
-- L'owner veut que le staff (trésorier+) puisse modifier dans l'app les infos club
-- portées par la feuille PARAMETRAGES : nom, ville, pays (nullable depuis 024),
-- identifiant du club chez le courtier (broker_account_ref, 022) et plafond annuel
-- d'investissement (annual_investment_cap, 022).
--
-- Philosophie projet (cf. 016) : la RLS de `clubs` reste LECTURE SEULE pour
-- `authenticated`. AUCUN GRANT UPDATE large n'est posé. Toute écriture passe par
-- cette RPC SECURITY DEFINER staff-scopée, qui vérifie l'autorité AVANT d'écrire.
-- JAMAIS de service-role côté trésorier.
--
-- Sémantique des paramètres (NULL = effacer, '' traité comme NULL pour les TEXT) :
--   - p_name              : non vide obligatoire (clubs.name est NOT NULL) ; sinon inchangé.
--   - p_city / p_country  : TEXT ; '' ou NULL → met la colonne à NULL.
--   - p_country           : normalisé en MAJUSCULES, exige exactement 2 lettres (ISO alpha-2)
--                           sinon RAISE (la colonne est CHAR(2)). NULL/'' autorisé (nullable).
--   - p_broker_account_ref: TEXT ; '' ou NULL → NULL. Champ SENSIBLE (double-confirm côté UI).
--   - p_annual_investment_cap : NUMERIC ; NULL → NULL ; négatif interdit. Champ sensible.
--
-- Réf : 016 (pattern RPC staff), 022/024 (colonnes), DATA_MODEL §4.1, CLAUDE.md.

CREATE OR REPLACE FUNCTION public.update_club_settings(
  p_club_id                 UUID,
  p_name                    TEXT    DEFAULT NULL,
  p_city                    TEXT    DEFAULT NULL,
  p_country                 TEXT    DEFAULT NULL,
  p_broker_account_ref      TEXT    DEFAULT NULL,
  p_annual_investment_cap   NUMERIC DEFAULT NULL
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
  -- Le club doit exister.
  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- Autorité : trésorier / président / network_admin du club ciblé, vérifiée AVANT écriture.
  IF get_user_role_in_club(p_club_id) NOT IN ('treasurer', 'president', 'network_admin') THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Normalisation des TEXT : trim ; chaîne vide → NULL.
  v_name   := NULLIF(btrim(p_name), '');
  v_city   := NULLIF(btrim(p_city), '');
  v_country := NULLIF(btrim(p_country), '');
  v_broker := NULLIF(btrim(p_broker_account_ref), '');

  -- Le nom est NOT NULL en DB : un nom vide ne doit pas effacer la valeur existante.
  IF v_name IS NULL THEN
    v_name := (SELECT name FROM clubs WHERE id = p_club_id);
  END IF;

  -- Pays : ISO 3166-1 alpha-2 (2 lettres) en MAJUSCULES, ou NULL (colonne nullable).
  IF v_country IS NOT NULL THEN
    v_country := upper(v_country);
    IF v_country !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'pays invalide (code ISO alpha-2 attendu)'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END IF;

  -- Plafond : jamais négatif. NULL autorisé (efface la valeur).
  IF p_annual_investment_cap IS NOT NULL AND p_annual_investment_cap < 0 THEN
    RAISE EXCEPTION 'plafond annuel invalide (négatif)'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE clubs
     SET name                  = v_name,
         city                  = v_city,
         country               = v_country,
         broker_account_ref    = v_broker,
         annual_investment_cap = p_annual_investment_cap,
         updated_at            = NOW()
   WHERE id = p_club_id;
END;
$$;

-- Least privilege : pas d'exécution publique ; uniquement les sessions authentifiées
-- (la garde staff dans le corps fait le reste). Aucun GRANT UPDATE sur clubs.
REVOKE ALL ON FUNCTION public.update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM public;
GRANT EXECUTE ON FUNCTION public.update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
