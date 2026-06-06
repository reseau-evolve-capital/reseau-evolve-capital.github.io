-- 016_member_access_and_invitations.sql — ADM-007 : contrôle d'accès membre.
-- Deux mécanismes :
--   1. invitations — funnel pré-membre (lien d'accès 72 h, renvoyer/révoquer). Le membership
--      n'existe qu'à l'acceptation ; l'allowlist d'accès reste public.users (email_is_invited).
--   2. verrouillage de compte — par-club sur memberships (access_status), avec historique.
-- Écritures via RPC SECURITY DEFINER staff-scopées (autorité = trésorier+, vérifiée AVANT écriture) —
-- jamais via un élargissement de la policy RLS président, jamais service-role côté trésorier.
-- Réfs : docs/tickets/ADM-007-PLAN.md, DATA_MODEL.md §3, migrations 010/011/014.

-- ============================================================
-- 0. Enums (idempotents — pattern 001_create_enums)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE member_access_status AS ENUM ('active','locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending','accepted','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_event_action AS ENUM ('locked','unlocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 1. memberships — colonnes d'accès (additif, par-club)
--    Un user verrouillé dans un club reste actif ailleurs (cohérent multi-club).
-- ============================================================
-- ON UPDATE CASCADE : users.id est re-keyé au 1ᵉʳ login (handle_new_user, migration 014).
-- Toute FK vers users(id) doit donc cascader sur UPDATE, sinon la re-clé échoue.
ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS access_status member_access_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS locked_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS locked_by     UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================
-- 2. invitations — funnel pré-membre
-- ============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,            -- sha256 du token clair (le clair n'est JAMAIS stocké)
  status      invitation_status NOT NULL DEFAULT 'pending',
  invited_by  UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  accepted_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une seule invitation VIVANTE (pending) par couple (club, email) — insensible à la casse.
CREATE UNIQUE INDEX IF NOT EXISTS invitations_club_email_pending_idx
  ON invitations (club_id, lower(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS invitations_club_idx        ON invitations (club_id);
CREATE INDEX IF NOT EXISTS invitations_email_lower_idx ON invitations (lower(email));

-- ============================================================
-- 3. member_access_events — historique verrou/déverrou (membership-scoped)
--    Le funnel invitation est tracé par la table invitations elle-même (timestamps + statut).
-- ============================================================
CREATE TABLE IF NOT EXISTS member_access_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  action        access_event_action NOT NULL,
  reason        TEXT,
  actor_id      UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS member_access_events_membership_idx ON member_access_events (membership_id);

-- ============================================================
-- 4. RLS — least privilege. Lectures staff ; écritures via RPC definer uniquement.
-- ============================================================
ALTER TABLE invitations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_access_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations: staff read" ON invitations;
CREATE POLICY "invitations: staff read"
  ON invitations FOR SELECT
  USING (get_user_role_in_club(club_id) IN ('treasurer', 'president', 'network_admin'));

DROP POLICY IF EXISTS "access events: staff read" ON member_access_events;
CREATE POLICY "access events: staff read"
  ON member_access_events FOR SELECT
  USING (
    membership_id IN (
      SELECT m.id FROM memberships m
      WHERE get_user_role_in_club(m.club_id) IN ('treasurer', 'president', 'network_admin')
    )
  );

-- ============================================================
-- 5. RPC SECURITY DEFINER — autorité trésorier+ vérifiée AVANT toute écriture.
-- ============================================================

-- 5.1 Verrouiller / déverrouiller un membre (par-club) + journaliser l'événement.
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
  IF get_user_role_in_club(v_club_id) NOT IN ('treasurer', 'president', 'network_admin') THEN
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

-- 5.2 Créer une invitation. Garantit la ligne allowlist public.users (full_name NOT NULL → email).
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
  IF get_user_role_in_club(p_club_id) NOT IN ('treasurer', 'president', 'network_admin') THEN
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

-- 5.3 Révoquer une invitation en attente.
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
  IF get_user_role_in_club(v_club_id) NOT IN ('treasurer', 'president', 'network_admin') THEN
    RAISE EXCEPTION 'acces refuse : staff requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE invitations
     SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
   WHERE id = p_invitation_id AND status = 'pending';
END;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_invitation(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_revoke_invitation(UUID) TO authenticated;

-- 5.4 Renvoyer : remplace le token (invalide l'ancien), remet 72 h, ramène à pending.
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
  IF get_user_role_in_club(v_club_id) NOT IN ('treasurer', 'president', 'network_admin') THEN
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

-- 5.5 Accepter une invitation via son token (route publique server-only /login/invite).
--     Renvoie l'email accepté (pour générer la session), ou NULL si invalide/expiré.
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
BEGIN
  SELECT id, email, expires_at, status
    INTO v_id, v_email, v_expires, v_status
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
  RETURN v_email;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_invitation(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO service_role;

-- 5.6 L'utilisateur courant est-il bloqué ? Vrai ssi il a des adhésions actives ET qu'elles
--     sont TOUTES verrouillées. Appelé par le middleware à chaque requête protégée.
CREATE OR REPLACE FUNCTION public.current_user_access_blocked()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_catalog
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.memberships
            WHERE user_id = auth.uid() AND is_active = TRUE AND access_status = 'locked'
         )
     AND NOT EXISTS (
           SELECT 1 FROM public.memberships
            WHERE user_id = auth.uid() AND is_active = TRUE AND access_status = 'active'
         );
$$;
REVOKE ALL ON FUNCTION public.current_user_access_blocked() FROM public;
REVOKE EXECUTE ON FUNCTION public.current_user_access_blocked() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_access_blocked() TO authenticated;
