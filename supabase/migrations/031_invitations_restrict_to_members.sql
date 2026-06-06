-- 031_invitations_restrict_to_members.sql — B5 : restreindre les invitations aux MEMBRES du club
-- (décision owner arbitrée = restreindre). Durcit deux RPC SECURITY DEFINER, forward-only.
--
-- DÉCISION OWNER : on n'invite plus un email arbitraire. Une invitation ne peut viser qu'un email
-- DÉJÀ membre du club (présent dans public.users AVEC un membership sur ce club — issu de la feuille
-- Base, source de vérité des adhésions). L'invitation sert à donner l'ACCÈS APPLICATIF à un membre
-- existant, pas à élargir l'allowlist à n'importe qui.
--
-- FAILLES corrigées (cf. audit B5) :
--   1. admin_create_invitation (016/028) INSÉRAIT tout email inconnu dans public.users
--      (« INSERT INTO users(email, full_name) VALUES (p_email, p_email) ») → allowlist arbitraire
--      (email_is_invited devient true), donc on pouvait inviter un email HORS club. CORRIGÉ : on
--      vérifie l'APPARTENANCE et on RAISE si l'email n'est pas membre du club ; plus aucun INSERT.
--   2. admin_revoke_invitation (016/028) ne couvrait que `pending` (UPDATE … WHERE status='pending')
--      → no-op silencieux sur une invitation `accepted` ; l'invité gardait tout accès. CORRIGÉ :
--      la révocation couvre aussi `accepted` et, dans ce cas, VERROUILLE l'accès du membre dans ce
--      club (réutilise le mécanisme ADM-007 : access_status='locked' + member_access_events) et
--      neutralise l'allowlist si le user n'existait QUE via l'invitation.
--
-- INVARIANTS conservés :
--   * Garde staff FAIL-CLOSED via public.is_club_staff() (migration 028) — vérifiée AVANT toute
--     écriture, NULL (aucun rôle) → refus.
--   * Ordre des vérifs : existence (no_data_found) → garde staff → logique métier.
--   * RLS lecture seule sur clubs/users/memberships ; écritures via ces RPC definer staff-scopées.
--
-- ERRCODE custom pour « email hors club » : 'P0002' (classe P réservée applicative ; 'P0001' est le
-- raise_exception par défaut). Mappé côté actions.ts → message i18n « hors club » distinct.
--
-- SUIVI (HORS SCOPE V0) : verrouiller le membership invalide les requêtes protégées (le middleware
-- appelle current_user_access_blocked), MAIS une SESSION GoTrue déjà ouverte (cookie présent) n'est
-- PAS révoquée ici. L'invalidation immédiate de session nécessite auth.admin.signOut(jwt) côté
-- service-role (Edge/route serveur) — à brancher dans un lot ultérieur (E-NTF / route auth).
--
-- Réf : migrations 010 (helpers), 014 (handle_new_user re-key, email_is_invited), 016 (RPC d'origine),
--       017 (accept_invitation provisionne le membership), 028 (is_club_staff fail-closed) ; CLAUDE.md.

-- ============================================================
-- 1. admin_create_invitation — restreinte aux membres du club.
--    Réplique fidèle de 028 §2.2 ; seule la logique « allowlist » change (vérif appartenance,
--    plus aucun INSERT dans public.users). Garde staff fail-closed inchangée.
-- ============================================================
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
  -- Autorité staff du club ciblé, vérifiée AVANT toute écriture (fail-closed, cf. 028).
  IF NOT public.is_club_staff(p_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- APPARTENANCE (B5) : l'email doit correspondre à un MEMBRE du club. Un membre est un user
  -- présent dans public.users AVEC un membership sur ce club (issu de la feuille Base). On accepte
  -- tout membership connu sur le club (actif ou sortant) : un ex-membre reste « connu » du club et
  -- peut légitimement se voir (re)donner l'accès ; ce qui est interdit, c'est un email ÉTRANGER.
  -- Si l'email n'est pas membre → refus explicite, et on n'insère RIEN dans public.users
  -- (plus d'allowlist arbitraire ; email_is_invited ne devient pas true par effet de bord).
  IF NOT EXISTS (
    SELECT 1
      FROM public.users u
      JOIN public.memberships m ON m.user_id = u.id
     WHERE lower(u.email) = lower(p_email)
       AND m.club_id = p_club_id
  ) THEN
    RAISE EXCEPTION 'Cet email ne correspond à aucun membre du club.'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO invitations (club_id, email, token_hash, invited_by)
  VALUES (p_club_id, p_email, p_token_hash, auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_invitation(UUID, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_create_invitation(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 2. admin_revoke_invitation — couvre pending ET accepted ; verrouille l'accès si accepté.
--    Réplique de 028 §2.3 pour l'en-tête (existence → garde staff) ; logique métier étendue.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_revoke_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id        UUID;
  v_email          TEXT;
  v_status         invitation_status;
  v_user_id        UUID;
  v_membership_id  UUID;
  v_membership_cnt    INTEGER;
  v_has_auth       BOOLEAN;
BEGIN
  SELECT club_id, email, status
    INTO v_club_id, v_email, v_status
    FROM invitations WHERE id = p_invitation_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'invitation introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- Autorité staff du club, vérifiée AVANT toute écriture (fail-closed).
  IF NOT public.is_club_staff(v_club_id) THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Déjà révoquée / expirée : rien à faire (idempotent).
  IF v_status IN ('revoked', 'expired') THEN
    RETURN;
  END IF;

  -- Marque l'invitation comme révoquée (couvre pending ET accepted — fix du no-op silencieux).
  UPDATE invitations
     SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
   WHERE id = p_invitation_id;

  -- Cas PENDING : aucune session n'a été ouverte, aucun membership provisionné par l'invitation.
  IF v_status = 'pending' THEN
    RETURN;
  END IF;

  -- Cas ACCEPTED : l'invité a un compte/accès. On VERROUILLE son accès dans ce club (ADM-007) et
  -- on neutralise l'allowlist si le user n'existait QUE via l'invitation.
  SELECT id INTO v_user_id FROM public.users WHERE lower(email) = lower(v_email);
  IF v_user_id IS NULL THEN
    RETURN; -- rien à verrouiller (cas théorique : user déjà supprimé)
  END IF;

  -- Verrou par-club (réutilise le mécanisme ADM-007 : access_status + historique).
  SELECT id INTO v_membership_id
    FROM public.memberships
   WHERE user_id = v_user_id AND club_id = v_club_id;

  IF v_membership_id IS NOT NULL THEN
    UPDATE public.memberships
       SET access_status = 'locked',
           locked_at     = NOW(),
           locked_reason = 'Invitation révoquée',
           locked_by     = auth.uid(),
           updated_at    = NOW()
     WHERE id = v_membership_id
       AND access_status <> 'locked';

    INSERT INTO member_access_events (membership_id, action, reason, actor_id)
    VALUES (v_membership_id, 'locked', 'Invitation révoquée', auth.uid());
  END IF;

  -- Neutralise l'allowlist UNIQUEMENT si le user n'existe QUE via l'invitation :
  --   * AUCUN membership (tous clubs confondus, y compris celui-ci), ET
  --   * aucun compte GoTrue (auth.users) — au 1ᵉʳ login handle_new_user re-keye users.id sur
  --     auth.users.id, donc un compte existant matche public.users.id = auth.users.id.
  -- Un MEMBRE légitime (il a forcément un membership sur ce club — sinon B5 aurait refusé
  -- l'invitation) n'est JAMAIS supprimé : on s'est contenté de verrouiller son accès. La
  -- suppression ne concerne donc que les RÉSIDUS de l'ancien comportement (016/028) où un email
  -- arbitraire — sans aucun membership — était inséré dans public.users comme allowlist.
  SELECT COUNT(*) INTO v_membership_cnt FROM public.memberships WHERE user_id = v_user_id;
  SELECT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = v_user_id) INTO v_has_auth;

  IF v_membership_cnt = 0 AND NOT v_has_auth THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_invitation(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_revoke_invitation(UUID) TO authenticated;
