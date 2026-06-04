-- 017_invitation_provisions_membership.sql — ADM-007 follow-up.
--
-- À l'acceptation d'une invitation, on provisionne l'ADHÉSION du membre dans le club de
-- l'invitation. Sans ça, l'invité obtient un compte (allowlist public.users + session) mais
-- AUCUNE adhésion → l'app affiche « Données non disponibles » et il ne voit aucun club.
--
-- L'adhésion est créée avec l'id public.users courant (uuid allowlist) ; au 1ᵉʳ login,
-- handle_new_user re-keye users.id sur l'uuid GoTrue et memberships.user_id suit (ON UPDATE
-- CASCADE, migration 016 corrigée). Idempotent : ON CONFLICT (user_id, club_id) DO NOTHING.

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token_hash TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_id      UUID;
  v_email   TEXT;
  v_expires TIMESTAMPTZ;
  v_status  invitation_status;
  v_club_id UUID;
  v_user_id UUID;
BEGIN
  SELECT id, email, expires_at, status, club_id
    INTO v_id, v_email, v_expires, v_status, v_club_id
    FROM invitations WHERE token_hash = p_token_hash;

  IF v_id IS NULL OR v_status <> 'pending' THEN
    RETURN NULL;
  END IF;

  IF v_expires < NOW() THEN
    UPDATE invitations SET status = 'expired', updated_at = NOW() WHERE id = v_id;
    RETURN NULL;
  END IF;

  UPDATE invitations
     SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
   WHERE id = v_id;

  -- Provisionne l'adhésion (membre actif) dans le club de l'invitation.
  SELECT id INTO v_user_id FROM public.users WHERE lower(email) = lower(v_email);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO memberships (user_id, club_id, role, status, joined_at)
    VALUES (v_user_id, v_club_id, 'member', 'active', CURRENT_DATE)
    ON CONFLICT (user_id, club_id) DO NOTHING;
  END IF;

  RETURN v_email;
END;
$$;
