-- 052_membership_role_source.sql — ADM-008 : éditeur de rôle CLUB in-app + anti-écrasement sync.
--
-- PROBLÈME : aujourd'hui le rôle club (president/treasurer) est dérivé EXCLUSIVEMENT de la feuille
-- `PARAMETRAGES` par la réconciliation de l'Edge `sync` (cf. functions/sync/index.ts §2bis). Un
-- président/trésorier n'a AUCUN moyen de nommer un dirigeant depuis l'app : la matrice est la seule
-- source, et elle n'est pas découvrable (« comment je nomme un trésorier ? »).
--
-- SOLUTION :
--   1. Colonne `memberships.role_source` ('sheet' | 'manual') — défaut 'sheet' (rétro-compatible :
--      tous les rôles existants restent dérivés de la feuille tant qu'on ne les édite pas en app).
--   2. RPC `admin_change_member_role(p_membership_id, p_role)` SECURITY DEFINER, gardée
--      `is_club_staff()` DU club de la membership (pattern 028, fail-closed) : pose `role` ET
--      `role_source = 'manual'`. Un rôle 'manual' n'est plus réécrit par le sync (garde côté Edge).
--   3. ANTI-ESCALADE : un trésorier ne peut PAS promouvoir au-delà de ses droits (pas de passage à
--      `president` ni `network_admin` par un treasurer ; seul un president peut nommer un president).
--      `network_admin` (scope réseau) n'est jamais attribuable par cette RPC (réservé aux RPC réseau).
--   4. Journalisation via `log_audit_event` (migration 053, SECURITY DEFINER, actor = auth.uid()).
--
-- Sécurité (least privilege, pattern 016/025/028) : SECURITY DEFINER + SET search_path, garde AVANT
-- écriture, REVOKE ALL FROM public + GRANT EXECUTE TO authenticated. La RPC ne touche QUE la
-- membership ciblée et refuse tout rôle hors {member, treasurer, president}.
--
-- Réf : migration 004 (memberships), 010 (get_user_role_in_club), 028 (is_club_staff fail-closed),
-- 053 (log_audit_event), functions/sync/index.ts (réconciliation des rôles), CLAUDE.md.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Colonne role_source — origine du rôle ('sheet' = dérivé de PARAMETRAGES, 'manual' = posé en app).
--    NOT NULL DEFAULT 'sheet' : les lignes existantes restent dérivées de la feuille (non-régression).
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS role_source TEXT NOT NULL DEFAULT 'sheet'
    CHECK (role_source IN ('sheet', 'manual'));

COMMENT ON COLUMN public.memberships.role_source IS
  'Origine du rôle club : ''sheet'' = dérivé de la feuille PARAMETRAGES par la sync (défaut, écrasable) ; ''manual'' = défini en app via admin_change_member_role (ADM-008), JAMAIS réécrit par la sync.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. admin_change_member_role — change le rôle CLUB d'une membership + fige role_source='manual'.
--    Garde staff-par-club (is_club_staff du club DE la membership). Anti-escalade : un treasurer ne
--    peut pas nommer un president (ni network_admin) ; seul un president le peut. network_admin
--    n'est jamais attribuable ici (scope réseau, réservé aux RPC network_*).
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

  -- b) Garde staff-par-club FAIL-CLOSED (pattern 028 : NULL → refus).
  IF NOT public.is_club_staff(v_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- c) Rôle cible borné aux rôles CLUB attribuables. network_admin (scope réseau) et toute
  --    valeur hors {member, treasurer, president} sont refusés ici.
  IF p_role NOT IN ('member', 'treasurer', 'president') THEN
    RAISE EXCEPTION 'role non attribuable depuis cet ecran' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- d) ANTI-ESCALADE : nommer un PRESIDENT exige d'être soi-même president (ou network_admin).
  --    Un treasurer ne peut donc pas promouvoir (lui-même ou autrui) au rang de president.
  --    get_user_role_in_club est SECURITY DEFINER STABLE (rôle du caller dans CE club).
  v_caller_role := public.get_user_role_in_club(v_club_id);
  IF p_role = 'president' AND v_caller_role NOT IN ('president', 'network_admin') THEN
    RAISE EXCEPTION 'escalade refusee : seul un president peut nommer un president'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- e) Écriture : on ne rétrograde JAMAIS un network_admin (rôle réseau hors PARAMETRAGES) via
  --    cette RPC club — garde .neq cohérente avec la réconciliation sync.
  UPDATE memberships
     SET role        = p_role,
         role_source = 'manual',
         updated_at  = NOW()
   WHERE id = p_membership_id
     AND role <> 'network_admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'role non modifiable (membership reseau)' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- f) Audit (fire-and-forget côté table : log_audit_event ne bloque jamais la mutation ici car
  --    la fonction est SECURITY DEFINER et l'INSERT audit_log réussit dans la même transaction ;
  --    en cas d'absence de la fonction (env partiel), l'appelant applicatif logge déjà via withAudit).
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
