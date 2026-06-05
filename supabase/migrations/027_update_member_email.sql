-- 027_update_member_email.sql — Renseigner/corriger l'email d'un membre par le staff.
--
-- Les membres Base sans email (typiquement des sortants) sont importés avec un email
-- synthétique `sans-email.<slug>@<clubId>.local` + users.email_is_placeholder = true
-- (migration 026). L'owner veut que le staff puisse renseigner leur vrai email plus tard,
-- depuis l'app. La règle de sync préserve l'email saisi (la feuille ne réécrit que si non vide).
--
-- Philosophie projet (cf. 016/025) : la RLS de `users` reste LECTURE SEULE pour
-- `authenticated`. AUCUN GRANT UPDATE large sur `users`. L'écriture passe par cette RPC
-- SECURITY DEFINER staff-scopée, qui vérifie l'autorité dans le club DU membership AVANT
-- d'écrire. JAMAIS de service-role côté trésorier.
--
-- Sémantique :
--   - p_membership_id : le membership ciblé (le user lié est mis à jour).
--   - p_email         : nouvel email. Trimé ; format basique exigé (^[^@\s]+@[^@\s]+\.[^@\s]+$),
--                       non vide. Normalisé en minuscules. Sinon RAISE invalid_parameter_value.
--   - Met à jour users.email + users.email_is_placeholder = false.
--   - Conflit d'unicité (email déjà pris) → unique_violation propagé tel quel (l'UI mappe sur
--     « email déjà utilisé »).
--
-- Réf : 026 (email_is_placeholder), 025 (pattern RPC staff), DATA_MODEL §1, CLAUDE.md.

CREATE OR REPLACE FUNCTION public.update_member_email(
  p_membership_id UUID,
  p_email         TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id UUID;
  v_user_id UUID;
  v_role    member_role;
  v_email   TEXT;
BEGIN
  -- Le membership doit exister : on récupère son club et son user.
  SELECT club_id, user_id INTO v_club_id, v_user_id
  FROM memberships
  WHERE id = p_membership_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'membre introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- Autorité : trésorier / président / network_admin du club DU membership, vérifiée
  -- AVANT écriture. get_user_role_in_club lit le rôle de l'appelant (auth.uid()).
  -- FAIL-CLOSED : un rôle NULL (appelant non membre, ou auth.uid() absent) DOIT être
  -- rejeté. On évite `NOT IN (...)` car `NULL NOT IN (...)` vaut NULL (≠ TRUE) → la garde
  -- ne se déclencherait pas. On exige donc explicitement l'appartenance au set staff.
  v_role := get_user_role_in_club(v_club_id);
  IF v_role IS NULL OR v_role NOT IN ('treasurer', 'president', 'network_admin') THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Normalisation : trim + minuscules ; chaîne vide rejetée.
  v_email := lower(btrim(p_email));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'email vide' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Format basique : un seul @, pas d'espace, un point dans le domaine.
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email invalide' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Écriture : email réel + on lève le drapeau placeholder.
  -- Un conflit d'unicité (users.email UNIQUE) lève unique_violation (23505), propagé à l'UI.
  UPDATE users
     SET email                = v_email,
         email_is_placeholder = false,
         updated_at           = NOW()
   WHERE id = v_user_id;
END;
$$;

-- Least privilege : pas d'exécution publique ; uniquement les sessions authentifiées
-- (la garde staff dans le corps fait le reste). Aucun GRANT UPDATE sur users.
REVOKE ALL ON FUNCTION public.update_member_email(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.update_member_email(UUID, TEXT) TO authenticated;
