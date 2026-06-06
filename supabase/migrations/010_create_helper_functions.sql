-- Fonctions helper RLS — SECURITY DEFINER STABLE pour éviter la récursion sur memberships.
-- Ces fonctions sont appelées dans les policies RLS (011_enable_rls_and_policies.sql).
-- Ref : DATA_MODEL.md §3 — Fonctions helper

CREATE OR REPLACE FUNCTION get_user_club_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_catalog
AS $$
  SELECT club_id FROM memberships
  WHERE user_id = auth.uid() AND is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION get_user_role_in_club(p_club_id UUID)
RETURNS member_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_catalog
AS $$
  SELECT role FROM memberships
  WHERE user_id = auth.uid() AND club_id = p_club_id AND is_active = TRUE;
$$;
