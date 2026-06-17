-- 042_network_rpc_write.sql — NET-003 : RPC d'ÉCRITURE du scope RÉSEAU + audit network_events.
--
-- Le scope « réseau » (cf. migration 040) est piloté par un network_admin : création de clubs,
-- branchement de la matrice Google Sheets, provisioning du premier staff d'un club, et gestion
-- de l'équipe réseau (rôles/titres). Comme partout dans ce repo (016/025/028), AUCUN GRANT
-- INSERT/UPDATE large n'est posé sur clubs / memberships / network_members pour `authenticated` :
-- toute mutation passe par une RPC SECURITY DEFINER gardée, qui vérifie l'autorité AVANT d'écrire.
-- JAMAIS de service-role côté app — les Server Actions appellent ces RPC avec le client de session.
--
-- Garde imposée pour CHAQUE write : `IF NOT public.is_network_admin()` → RAISE 42501
-- (insufficient_privilege). Le helper is_network_admin() est fail-closed (COALESCE …, false ;
-- migration 040) : un caller non listé / non authentifié est refusé.
--
-- Audit : chaque mutation insère une ligne dans `network_events` (qui / quoi / cible / metadata).
-- La table n'a AUCUNE policy write pour authenticated : seules ces RPC SECURITY DEFINER y écrivent.
--
-- Contenu :
--   1. Table d'audit `network_events` + RLS (SELECT membre réseau ; pas de write authenticated).
--   2. network_create_club        — crée un club (gère le slug dupliqué proprement).
--   3. network_set_club_sheet     — branche la matrice Sheets d'un club existant.
--   4. network_provision_first_staff — provisionne le 1er staff (president/treasurer) par user_id.
--   5. network_grant_role         — upsert d'un membre réseau (rôle + titre).
--   6. network_revoke_role        — retire un membre réseau (garde-fou « dernier admin »).
--
-- Réf : migrations 002 (clubs), 004 (memberships + enums member_role/member_status), 016/025/028
-- (pattern RPC mutation gardée + REVOKE/GRANT), 040 (network_members, helpers fail-closed),
-- 029 (portfolio_aggregates, source de la valo agrégée — exploitée par 043) ; CLAUDE.md (RLS,
-- least privilege, jamais service-role côté app).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Table d'audit network_events.
--    Trace les mutations réseau. actor_id = users.id de l'appelant (ON UPDATE CASCADE pour
--    suivre le re-key auth, cf. migration 014/041 ; ON DELETE SET NULL pour conserver la
--    trace même si le user est supprimé). Écriture EXCLUSIVEMENT via les RPC ci-dessous.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.network_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.network_events IS
  'Journal d''audit du scope RÉSEAU (créations club, provisioning staff, rôles réseau). Écriture via RPC SECURITY DEFINER (042) uniquement ; aucune policy write pour authenticated.';

CREATE INDEX IF NOT EXISTS network_events_created_at_idx ON public.network_events(created_at DESC);

ALTER TABLE public.network_events ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre réseau (admin OU board) lit le journal. Pas de policy INSERT/UPDATE/DELETE
-- → l'insertion ne passe que par les RPC SECURITY DEFINER (qui bypassent la RLS d'écriture).
DROP POLICY IF EXISTS "network_events: lecture membre reseau" ON public.network_events;

CREATE POLICY "network_events: lecture membre reseau"
  ON public.network_events FOR SELECT
  TO authenticated
  USING (public.is_network_member());

GRANT SELECT ON public.network_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_events TO service_role;

-- Helper interne d'audit (SECURITY DEFINER) : appelé par les RPC ci-dessous. Non exposé.
CREATE OR REPLACE FUNCTION public.network_log_event(
  p_action      TEXT,
  p_target_type TEXT     DEFAULT NULL,
  p_target_id   UUID     DEFAULT NULL,
  p_metadata    JSONB    DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  INSERT INTO public.network_events (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.network_log_event(TEXT, TEXT, UUID, JSONB) FROM public;
-- Pas de GRANT à authenticated : l'audit n'est appelable que depuis les RPC SECURITY DEFINER
-- (même propriétaire) du présent fichier. Les écritures restent ainsi non falsifiables côté client.

-- ════════════════════════════════════════════════════════════════════════════
-- 2. network_create_club — crée un club. Slug dupliqué → message clair (unique_violation).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_create_club(
  p_name             TEXT,
  p_slug             TEXT,
  p_city             TEXT    DEFAULT NULL,
  p_country          CHAR(2) DEFAULT 'FR',
  p_currency         CHAR(3) DEFAULT 'EUR',
  p_min_contribution NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_name     TEXT;
  v_slug     TEXT;
  v_city     TEXT;
  v_country  TEXT;
  v_currency TEXT;
  v_id       UUID;
BEGIN
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Normalisation : nom NOT NULL (clubs.name), slug NOT NULL UNIQUE en minuscules.
  v_name := NULLIF(btrim(p_name), '');
  v_slug := lower(NULLIF(btrim(p_slug), ''));
  IF v_name IS NULL OR v_slug IS NULL THEN
    RAISE EXCEPTION 'nom et slug requis' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'slug invalide (lettres minuscules, chiffres, tirets)'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Pays / devise : codes ISO en MAJUSCULES (colonnes CHAR(2)/CHAR(3)).
  v_country := upper(NULLIF(btrim(p_country), ''));
  IF v_country IS NULL THEN
    v_country := 'FR';
  ELSIF v_country !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'pays invalide (code ISO alpha-2 attendu)' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_currency := upper(NULLIF(btrim(p_currency), ''));
  IF v_currency IS NULL THEN
    v_currency := 'EUR';
  ELSIF v_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'devise invalide (code ISO 4217 attendu)' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_city := NULLIF(btrim(p_city), '');

  IF p_min_contribution IS NOT NULL AND p_min_contribution < 0 THEN
    RAISE EXCEPTION 'cotisation minimale invalide (négative)' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- clubs.min_contribution est NOT NULL DEFAULT 100 depuis la migration 033 : un paramètre
  -- non fourni retombe sur 100 (on ne passe jamais NULL, ce qui violerait la contrainte).
  BEGIN
    INSERT INTO clubs (name, slug, city, country, currency, min_contribution)
    VALUES (v_name, v_slug, v_city, v_country, v_currency, COALESCE(p_min_contribution, 100))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- clubs.slug UNIQUE : message métier stable consommé par l'UI (mapPgError → 'duplicate').
    RAISE EXCEPTION 'slug déjà utilisé' USING ERRCODE = 'unique_violation';
  END;

  PERFORM public.network_log_event(
    'network_create_club', 'club', v_id,
    jsonb_build_object('name', v_name, 'slug', v_slug, 'country', v_country)
  );

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.network_create_club(TEXT, TEXT, TEXT, CHAR, CHAR, NUMERIC) FROM public;
GRANT EXECUTE ON FUNCTION public.network_create_club(TEXT, TEXT, TEXT, CHAR, CHAR, NUMERIC) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. network_set_club_sheet — branche / met à jour la matrice Sheets d'un club existant.
--    Le sheet_id vit en DB (clubs.sheet_id), JAMAIS en env var (CLAUDE.md / DATA_MODEL).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_set_club_sheet(
  p_club_id  UUID,
  p_sheet_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_sheet TEXT;
BEGIN
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- '' → NULL (débranche la matrice).
  v_sheet := NULLIF(btrim(p_sheet_id), '');

  UPDATE clubs
     SET sheet_id   = v_sheet,
         updated_at = NOW()
   WHERE id = p_club_id;

  PERFORM public.network_log_event(
    'network_set_club_sheet', 'club', p_club_id,
    jsonb_build_object('connected', v_sheet IS NOT NULL)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.network_set_club_sheet(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.network_set_club_sheet(UUID, TEXT) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. network_provision_first_staff — provisionne le 1er staff d'un club par user_id.
--    Voie « membre importé » (user_id connu, ex. la feuille Base). La voie INVITATION PAR
--    EMAIL n'est PAS implémentée ici : elle réutilisera l'invitation existante (016/028
--    admin_create_invitation + route /login/invite) — décision déférée à NET-006.
--    Rôle restreint à president/treasurer (le staff d'amorçage d'un club).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_provision_first_staff(
  p_club_id UUID,
  p_user_id UUID,
  p_role    member_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_membership_id UUID;
BEGIN
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_role NOT IN ('president', 'treasurer') THEN
    RAISE EXCEPTION 'rôle invalide : president ou treasurer attendu' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'utilisateur introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO memberships (user_id, club_id, role, status, joined_at)
  VALUES (p_user_id, p_club_id, p_role, 'active', CURRENT_DATE)
  ON CONFLICT (user_id, club_id)
    DO UPDATE SET role   = EXCLUDED.role,
                  status = 'active'
  RETURNING id INTO v_membership_id;

  PERFORM public.network_log_event(
    'network_provision_first_staff', 'membership', v_membership_id,
    jsonb_build_object('club_id', p_club_id, 'user_id', p_user_id, 'role', p_role)
  );

  RETURN v_membership_id;
END;
$$;
REVOKE ALL ON FUNCTION public.network_provision_first_staff(UUID, UUID, member_role) FROM public;
GRANT EXECUTE ON FUNCTION public.network_provision_first_staff(UUID, UUID, member_role) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. network_grant_role — upsert d'un membre réseau (rôle + titre). PK = user_id.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_grant_role(
  p_user_id UUID,
  p_role    network_role,
  p_title   network_title DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'utilisateur introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.network_members (user_id, role, title)
  VALUES (p_user_id, p_role, p_title)
  ON CONFLICT (user_id)
    DO UPDATE SET role  = EXCLUDED.role,
                  title = EXCLUDED.title;

  PERFORM public.network_log_event(
    'network_grant_role', 'network_member', p_user_id,
    jsonb_build_object('role', p_role, 'title', p_title)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.network_grant_role(UUID, network_role, network_title) FROM public;
GRANT EXECUTE ON FUNCTION public.network_grant_role(UUID, network_role, network_title) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. network_revoke_role — retire un membre de l'équipe réseau.
--    Garde-fou anti-lockout : un network_admin ne peut pas se retirer lui-même s'il est le
--    DERNIER admin réseau (sinon plus personne ne peut piloter le réseau). Les autres cas
--    (révoquer un board, ou un autre admin tant qu'il en reste un) sont autorisés.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.network_revoke_role(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_target_role network_role;
  v_admin_count INT;
BEGIN
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT role INTO v_target_role FROM public.network_members WHERE user_id = p_user_id;
  IF v_target_role IS NULL THEN
    -- Idempotent : rien à révoquer. On n'audite pas un no-op.
    RETURN;
  END IF;

  -- Garde-fou « dernier admin » : on refuse de retirer le dernier network_admin (lockout).
  IF v_target_role = 'network_admin' THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.network_members WHERE role = 'network_admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'impossible de retirer le dernier administrateur réseau'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  DELETE FROM public.network_members WHERE user_id = p_user_id;

  PERFORM public.network_log_event(
    'network_revoke_role', 'network_member', p_user_id,
    jsonb_build_object('previous_role', v_target_role)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.network_revoke_role(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.network_revoke_role(UUID) TO authenticated;
