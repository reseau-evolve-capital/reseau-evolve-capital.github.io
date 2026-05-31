-- 014_auth_linking.sql — Liaison auth.users → public.users par email (AUT-001/AUT-007)
-- + helpers SECURITY DEFINER pour invite-only et contrôle staff.

-- 0. Unicité case-insensitive de l'email : empêche l'import de doublons (Bob@x / bob@x)
--    qui seraient tous deux re-clés au login. Additif — la contrainte UNIQUE existante reste.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON public.users (lower(email));

-- 1. La FK memberships.user_id doit suivre une re-clé de users.id.
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE memberships
  ADD CONSTRAINT memberships_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 2. email_is_invited : un email est-il pré-importé dans public.users ?
--    Appelé par /api/auth/magic-link AVANT toute authentification → exécutable par anon.
CREATE OR REPLACE FUNCTION public.email_is_invited(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE lower(email) = lower(p_email));
$$;
REVOKE ALL ON FUNCTION public.email_is_invited(text) FROM public;
GRANT EXECUTE ON FUNCTION public.email_is_invited(text) TO anon, authenticated;

-- 3. user_is_staff : l'utilisateur courant est-il trésorier+ dans au moins un club ?
--    Utilisé par le middleware pour protéger /admin.
CREATE OR REPLACE FUNCTION public.user_is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
      AND is_active = TRUE
      AND role IN ('treasurer', 'president', 'network_admin')
  );
$$;
REVOKE ALL ON FUNCTION public.user_is_staff() FROM public;
REVOKE EXECUTE ON FUNCTION public.user_is_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.user_is_staff() TO authenticated;

-- 4. handle_new_user : à la création d'un compte auth, re-pointe la ligne users
--    pré-importée (même email) sur le nouvel id auth. Cascade vers memberships via la FK.
--    Idempotent : si aucune ligne email ne matche, ne fait rien.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.users
     SET id = NEW.id,
         updated_at = NOW()
   WHERE lower(email) = lower(NEW.email)
     AND id <> NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
