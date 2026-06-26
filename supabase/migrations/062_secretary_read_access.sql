-- 062_secretary_read_access.sql — Acces LECTURE SEULE du role club `secretary`.
--
-- BUT : donner au secretaire la meme VISIBILITE que le staff (contributions, contribution_months,
-- sheet_snapshots) SANS lui donner le moindre droit d'ecriture.
--
-- LECTURE SEULE PAR CONSTRUCTION : `is_club_staff` (migration 028) reste INCHANGEE et n'inclut PAS
-- `secretary`. Elle garde toutes les ecritures (RPC SECURITY DEFINER + policies d'ecriture). En ne la
-- touchant pas, le secretaire est refuse en ecriture gratuitement. Tout octroi d'ecriture futur au
-- secretaire devra etre un grant explicite par-surface.
--
-- CE QUE FAIT CE FICHIER :
--   1. Helper `can_view_club_admin(p_club_id)` fail-closed (pattern 028) : true pour
--      secretary/treasurer/president/network_admin du club, false sinon (NULL inclus).
--   2. Re-pose (DROP + CREATE) des 3 policies de LECTURE qui testaient en dur la liste de roles staff,
--      pour qu'elles utilisent `can_view_club_admin(club_id)`. Seule la sous-expression de role change ;
--      le reste de chaque policy (table, commande SELECT, clause USING) est repris a l'identique de 011.
--      Noms de policy inchanges.
--   3. CREATE OR REPLACE de `admin_change_member_role` (052) en ajoutant `secretary` a la liste des
--      roles attribuables, pour que le president puisse nommer un secretaire depuis l'UI. La garde
--      anti-escalade (seul un president/network_admin peut nommer un president) est INCHANGEE.
--
-- Ref : migration 010 (get_user_role_in_club), 011 (policies de lecture), 028 (is_club_staff),
-- 052 (admin_change_member_role), 061 (ajout de la valeur enum `secretary`), CLAUDE.md.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Helper de visibilite admin fail-closed (pattern 028, calque sur is_club_staff).
--    Inclut `secretary` EN PLUS du staff. Utilise UNIQUEMENT en lecture (policies SELECT).
--    COALESCE(..., false) convertit le NULL (aucun role) en refus explicite.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.can_view_club_admin(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT COALESCE(
    public.get_user_role_in_club(p_club_id) IN ('secretary', 'treasurer', 'president', 'network_admin'),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_club_admin(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.can_view_club_admin(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Policies de LECTURE re-posees (reprise fidele de 011, seule la sous-expression de role change).
--    Les noms de policy sont strictement identiques a 011.
-- ════════════════════════════════════════════════════════════════════════════

-- 2.1 contributions : lecture staff + secretaire (cf. 011 "contributions: treasurer read").
DROP POLICY IF EXISTS "contributions: treasurer read" ON contributions;
CREATE POLICY "contributions: treasurer read"
  ON contributions FOR SELECT
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND can_view_club_admin(club_id)
  );

-- 2.2 contribution_months : lecture staff + secretaire (cf. 011 "cm: treasurer read").
DROP POLICY IF EXISTS "cm: treasurer read" ON contribution_months;
CREATE POLICY "cm: treasurer read"
  ON contribution_months FOR SELECT
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND can_view_club_admin(club_id)
  );

-- 2.3 sheet_snapshots : lecture staff + secretaire (cf. 011 "snapshots: treasurer read").
DROP POLICY IF EXISTS "snapshots: treasurer read" ON sheet_snapshots;
CREATE POLICY "snapshots: treasurer read"
  ON sheet_snapshots FOR SELECT
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND can_view_club_admin(club_id)
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 3. admin_change_member_role (reprise fidele de 052) — ajout de `secretary` aux roles attribuables.
--    La garde staff (is_club_staff, ecriture) et la garde anti-escalade (president) sont INCHANGEES.
--    `secretary` etant lecture-seule, le nommer n'octroie aucun droit d'ecriture.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_change_member_role(
  p_membership_id UUID,
  p_role          member_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id      UUID;
  v_caller_role  member_role;
BEGIN
  -- a) La membership doit exister (existence AVANT garde, ordre 028).
  SELECT club_id INTO v_club_id FROM memberships WHERE id = p_membership_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'membership introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- b) Garde staff-par-club FAIL-CLOSED (pattern 028 : NULL -> refus).
  IF NOT public.is_club_staff(v_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- c) Role cible borne aux roles CLUB attribuables. network_admin (scope reseau) et toute
  --    valeur hors {member, secretary, treasurer, president} sont refuses ici.
  IF p_role NOT IN ('member', 'secretary', 'treasurer', 'president') THEN
    RAISE EXCEPTION 'role non attribuable depuis cet ecran' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- d) ANTI-ESCALADE : nommer un PRESIDENT exige d'etre soi-meme president (ou network_admin).
  --    Un treasurer ne peut donc pas promouvoir (lui-meme ou autrui) au rang de president.
  --    get_user_role_in_club est SECURITY DEFINER STABLE (role du caller dans CE club).
  v_caller_role := public.get_user_role_in_club(v_club_id);
  IF p_role = 'president' AND v_caller_role NOT IN ('president', 'network_admin') THEN
    RAISE EXCEPTION 'escalade refusee : seul un president peut nommer un president'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- e) Ecriture : on ne retrograde JAMAIS un network_admin (role reseau hors PARAMETRAGES) via
  --    cette RPC club — garde .neq coherente avec la reconciliation sync.
  UPDATE memberships
     SET role        = p_role,
         role_source = 'manual',
         updated_at  = NOW()
   WHERE id = p_membership_id
     AND role <> 'network_admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'role non modifiable (membership reseau)' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- f) Audit (fire-and-forget cote table : log_audit_event ne bloque jamais la mutation ici car
  --    la fonction est SECURITY DEFINER et l'INSERT audit_log reussit dans la meme transaction ;
  --    en cas d'absence de la fonction (env partiel), l'appelant applicatif logge deja via withAudit).
  PERFORM public.log_audit_event(
    'admin_change_member_role',
    'membership',
    p_membership_id::text,
    jsonb_build_object('role', p_role, 'club_id', v_club_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_member_role(UUID, member_role) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_change_member_role(UUID, member_role) TO authenticated;
