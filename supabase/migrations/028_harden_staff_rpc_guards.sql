-- 028_harden_staff_rpc_guards.sql — Durcissement fail-closed des gardes staff (SÉCURITÉ).
--
-- FAILLE corrigée (escalade de privilège cross-club) :
--   La garde `IF get_user_role_in_club(X) NOT IN ('treasurer','president','network_admin')`
--   est FAIL-OPEN. Si l'appelant n'a AUCUN rôle dans le club ciblé, get_user_role_in_club
--   renvoie NULL, et `NULL NOT IN (...)` vaut NULL (≠ TRUE). Le `IF` ne se déclenche donc PAS
--   et la fonction s'exécute quand même → un membre du club A peut piloter ces RPC pour le club B.
--
-- CORRECTIF (forward-only) :
--   1. Helper `is_club_staff(p_club_id)` FAIL-CLOSED : COALESCE(... , false) → NULL devient false.
--   2. CREATE OR REPLACE des 5 RPC SECURITY DEFINER vulnérables, à l'identique de 016/025,
--      en remplaçant UNIQUEMENT la ligne de garde par `IF NOT public.is_club_staff(<club_id>)`.
--      Tout le reste (signatures, DECLARE, validations, UPDATE/INSERT, ordre des vérifs) est
--      répliqué fidèlement. L'ordre « existence (no_data_found) → garde staff » est conservé.
--   3. Re-pose des ACL (REVOKE ALL FROM public + GRANT EXECUTE TO authenticated), car
--      CREATE OR REPLACE peut réinitialiser les privilèges.
--
-- Hors scope (déjà fail-closed) : 027_update_member_email.sql (`IS NULL OR`) et les policies RLS
-- (`IN (...)` en contexte USING est fail-closed). Non touchés.
--
-- Réf : migrations 010 (get_user_role_in_club → member_role), 016, 025 ; CLAUDE.md (RLS/least privilege).

-- ============================================================
-- 1. Helper fail-closed réutilisable.
--    get_user_role_in_club renvoie member_role (enum) ; `IN (...)` sur l'enum est valide.
--    COALESCE(..., false) convertit le NULL (aucun rôle) en refus explicite.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_club_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT COALESCE(
    public.get_user_role_in_club(p_club_id) IN ('treasurer', 'president', 'network_admin'),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.is_club_staff(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_club_staff(UUID) TO authenticated;

-- ============================================================
-- 2. RPC durcies (réplique fidèle de 016/025 — seule la garde change).
-- ============================================================

-- 2.1 admin_set_member_access (cf. 016 §5.1) — garde sur v_club_id.
CREATE OR REPLACE FUNCTION public.admin_set_member_access(
  p_membership_id UUID,
  p_locked        BOOLEAN,
  p_reason        TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT club_id INTO v_club_id FROM memberships WHERE id = p_membership_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'membership introuvable' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT public.is_club_staff(v_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE memberships
     SET access_status = CASE WHEN p_locked THEN 'locked' ELSE 'active' END::member_access_status,
         locked_at     = CASE WHEN p_locked THEN NOW()       ELSE NULL END,
         locked_reason = CASE WHEN p_locked THEN p_reason    ELSE NULL END,
         locked_by     = CASE WHEN p_locked THEN auth.uid()  ELSE NULL END,
         updated_at    = NOW()
   WHERE id = p_membership_id;

  INSERT INTO member_access_events (membership_id, action, reason, actor_id)
  VALUES (p_membership_id,
          CASE WHEN p_locked THEN 'locked' ELSE 'unlocked' END::access_event_action,
          p_reason, auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_member_access(UUID, BOOLEAN, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_set_member_access(UUID, BOOLEAN, TEXT) TO authenticated;

-- 2.2 admin_create_invitation (cf. 016 §5.2) — garde sur p_club_id.
CREATE OR REPLACE FUNCTION public.admin_create_invitation(
  p_club_id    UUID,
  p_email      TEXT,
  p_token_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_club_staff(p_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Allowlist : un email est autorisé à demander un lien ssi il existe dans public.users.
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE lower(email) = lower(p_email)) THEN
    INSERT INTO public.users (email, full_name) VALUES (p_email, p_email);
  END IF;

  INSERT INTO invitations (club_id, email, token_hash, invited_by)
  VALUES (p_club_id, p_email, p_token_hash, auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_invitation(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_create_invitation(UUID, TEXT, TEXT) TO authenticated;

-- 2.3 admin_revoke_invitation (cf. 016 §5.3) — garde sur v_club_id.
CREATE OR REPLACE FUNCTION public.admin_revoke_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT club_id INTO v_club_id FROM invitations WHERE id = p_invitation_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'invitation introuvable' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT public.is_club_staff(v_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE invitations
     SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
   WHERE id = p_invitation_id AND status = 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_invitation(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_revoke_invitation(UUID) TO authenticated;

-- 2.4 admin_resend_invitation (cf. 016 §5.4) — garde sur v_club_id.
CREATE OR REPLACE FUNCTION public.admin_resend_invitation(
  p_invitation_id UUID,
  p_token_hash    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id UUID;
  v_status  invitation_status;
BEGIN
  SELECT club_id, status INTO v_club_id, v_status FROM invitations WHERE id = p_invitation_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'invitation introuvable' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT public.is_club_staff(v_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_status = 'accepted' THEN
    RAISE EXCEPTION 'invitation deja acceptee' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE invitations
     SET token_hash  = p_token_hash,
         status      = 'pending',
         invited_at  = NOW(),
         expires_at  = NOW() + INTERVAL '72 hours',
         accepted_at = NULL,
         revoked_at  = NULL,
         updated_at  = NOW()
   WHERE id = p_invitation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_resend_invitation(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_resend_invitation(UUID, TEXT) TO authenticated;

-- 2.5 update_club_settings (cf. 025) — garde sur p_club_id.
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
  IF NOT public.is_club_staff(p_club_id) THEN
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
REVOKE ALL ON FUNCTION public.update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM public;
GRANT EXECUTE ON FUNCTION public.update_club_settings(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
