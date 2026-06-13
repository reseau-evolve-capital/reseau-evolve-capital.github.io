-- Migration 036 — Feedback Widget V0 (spec docs/superpowers/specs/2026-06-13-feedback-widget-design.md §3 + §5).
--
-- QUOI : table `public.feedback` (source de vérité des retours membres), bucket Storage
--   PRIVÉ `screenshots`, et un trigger AFTER INSERT qui appelle l'Edge Function
--   `feedback-dispatch` (tri IA multi-providers + fan-out Discord/Notion/GitHub/Brevo).
--
-- RLS (CLAUDE.md : RLS obligatoire, least privilege) :
--   - INSERT  : tout membre authentifié, mais seulement pour SOI (user_id = auth.uid()).
--   - SELECT  : le membre voit SES retours ; le staff (public.user_is_staff()) voit tout.
--   - UPDATE  : AUCUNE policy pour `authenticated` → réservé au service_role (Edge Function),
--               qui bypasse RLS via la clé service-role. C'est elle qui écrit ai_*, les
--               flags discord_notified/email_sent et les liens externes.
--
-- TRIGGER → EDGE FUNCTION (même pattern que migration 032 — Vault, NO-OP propre si vide) :
--   `public.feedback_dispatch_trigger()` (SECURITY DEFINER) lit l'URL de la fonction et la
--   clé service_role depuis `vault.decrypted_secrets` PAR NOM. En LOCAL (Vault non peuplé),
--   le CROSS JOIN renvoie 0 ligne → aucun net.http_post, aucune erreur. Le feedback est
--   inséré normalement ; il n'est simplement pas dispatché tant que les secrets sont absents.
--
-- À PEUPLER (hors migration, jamais committé — une fois par environnement, ex. PROD) :
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/feedback-dispatch', 'feedback_dispatch_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');  -- déjà posé par 032
--   (update : select vault.update_secret(id, '<nouvelle valeur>') ; cf. vault.secrets)
--
-- Réf : migration 015 (pattern bucket + policies storage), 032 (Vault + net.http_post),
--   014 (public.user_is_staff()).

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ── Table feedback ─────────────────────────────────────────────────────────
CREATE TABLE public.feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Auteur
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  user_email      text NOT NULL,

  -- Contenu
  type            text NOT NULL CHECK (type IN ('bug', 'feature', 'question')),
  message         text NOT NULL,
  screenshot_urls text[],                  -- jusqu'à 3 images jointes par l'utilisateur (URLs signées du bucket privé)

  -- Contexte auto
  page_url        text NOT NULL,
  page_route      text NOT NULL,
  user_agent      text,

  -- IA (rempli par l'Edge Function après INSERT)
  ai_title        text,
  ai_severity     text CHECK (ai_severity IN ('blocking', 'annoying', 'minor')),
  ai_summary      text,
  ai_category     text,

  -- Destinations externes
  github_issue_url  text,
  notion_page_id    text,
  discord_notified  boolean NOT NULL DEFAULT false,
  email_sent        boolean NOT NULL DEFAULT false,

  -- Statut (pour V2 tracker in-app)
  status          text NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received', 'in_progress', 'done', 'closed'))
);

COMMENT ON TABLE public.feedback IS
  'Retours membres (Feedback Widget V0). Insert par le membre via Server Action ; les colonnes ai_* / flags / liens externes sont écrites par l''Edge Function feedback-dispatch (service_role).';

-- Index pour la liste staff (tri antéchronologique) et le filtrage par auteur.
CREATE INDEX feedback_created_at_idx ON public.feedback (created_at DESC);
CREATE INDEX feedback_user_id_idx ON public.feedback (user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- INSERT : un membre authentifié ne peut insérer que pour lui-même.
CREATE POLICY "feedback: self insert"
  ON public.feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT : le membre voit ses propres retours.
CREATE POLICY "feedback: self read"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT : le staff (trésorier+) voit tous les retours.
CREATE POLICY "feedback: staff read all"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.user_is_staff());

-- NB : aucune policy UPDATE/DELETE pour `authenticated`. Les écritures post-insert
-- (tri IA, flags, liens) passent par le service_role (Edge Function) qui bypasse RLS.

-- ── Bucket Storage privé `screenshots` ───────────────────────────────────────
-- Privé : pas de lecture publique. L'app génère des URL signées pour l'affichage ;
-- l'Edge Function lit les objets en service_role. Chemin = screenshots/{auth.uid()}/<fichier>.
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "screenshots: self write"  ON storage.objects;
DROP POLICY IF EXISTS "screenshots: self read"   ON storage.objects;

-- INSERT : un membre n'écrit que dans son propre dossier screenshots/{uid}/...
CREATE POLICY "screenshots: self write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT : un membre peut relire ses propres captures (pas de lecture publique).
-- L'app sert l'affichage via URL signées ; cette policy autorise la génération
-- de l'URL signée par le propriétaire et la relecture éventuelle côté membre.
CREATE POLICY "screenshots: self read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Trigger PG → Edge Function feedback-dispatch ─────────────────────────────
-- SECURITY DEFINER : doit lire vault.decrypted_secrets (réservé à des rôles élevés).
-- NO-OP propre si l'URL ou la clé est absente du Vault (cas LOCAL) — aucun POST, aucune erreur.
CREATE OR REPLACE FUNCTION public.feedback_dispatch_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'feedback_dispatch_url' LIMIT 1;
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  -- Secrets absents (stack locale sans Vault peuplé) → NO-OP propre.
  IF v_url IS NULL OR v_key IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('record', row_to_json(NEW))
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.feedback_dispatch_trigger() FROM public;

CREATE TRIGGER feedback_after_insert
  AFTER INSERT ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.feedback_dispatch_trigger();
