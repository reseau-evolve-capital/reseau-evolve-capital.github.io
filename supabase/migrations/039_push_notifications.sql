-- 039_push_notifications.sql — Web Push V0 (PUSH-001 ; spec docs/superpowers/specs/2026-06-16-web-push-notifications-design.md §4, §8).
--
-- QUOI : la brique de persistance des notifications Web Push (abonnements navigateur,
--   préférences par membre, journal d'envoi agrégé), l'idempotence des emails de vote,
--   l'évolution de `close_due_polls()` pour piloter la push post-clôture, et deux jobs
--   pg_cron (rappel J-1 + push post-clôture) gardés par le Vault (dormants en local).
--
-- ANONYMAT / RGPD BY DESIGN (§2.2, §10) :
--   • Le payload push ne transporte QUE `pollId` / `clubId` / `type` / `url` — JAMAIS de
--     PII (pas de user_id, email, nom, ni « X membres ont voté »). Aucune table ici ne
--     stocke un contenu de réponse ; `push_delivery_log` n'a que des compteurs agrégés.
--   • `push_subscriptions.last_error_code` ne garde QUE le code HTTP (ex. '410', '404'),
--     jamais le corps de la réponse du service de push.
--
-- RLS (CLAUDE.md : RLS obligatoire dès la création, jamais joignable sans policy) :
--   push_subscriptions : OWNER-ONLY — le membre gère SES propres abonnements (user_id = auth.uid()).
--   push_preferences   : OWNER-ONLY (FOR ALL) — préférences par utilisateur.
--   push_delivery_log  : AUCUN accès `authenticated` — service_role uniquement (debug staff réseau).
--   poll_email_sends   : AUCUN accès `authenticated` — service_role uniquement (idempotence envoi).
--
-- GRANTS EXPLICITES (Data API) : l'auto-exposition implicite des nouvelles tables est
--   désactivée depuis 2026-05-30 (cf. supabase/config.toml `auto_expose_new_tables`). Sans
--   GRANT explicite, toute requête PostgREST en rôle `authenticated` échoue en 42501 même si
--   une policy RLS l'autorise. On accorde donc les privilèges au niveau table ; la RLS reste
--   la garde fine sur les lignes/opérations.
--
-- Réf : migration 038 (polls / poll_responses / close_due_polls — étendue ici ; style RLS,
--   GRANTs explicites, pattern pg_cron), 032 (crons sécurisés via Vault — réutilisé tel quel),
--   028 (is_club_staff fail-closed), 036 (style table/RLS/commentaires).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Vault (fourni par l'image Supabase ; idempotent). Source des secrets des jobs pg_cron.
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ════════════════════════════════════════════════════════════════════════════
-- 1 · push_subscriptions — un endpoint navigateur = une ligne (multi-appareils par user).
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint     text NOT NULL UNIQUE,                     -- clé d'upsert côté API (un endpoint = un appareil)
  p256dh       text NOT NULL,                            -- clé publique de chiffrement (keys.p256dh)
  auth         text NOT NULL,                            -- secret d'authentification (keys.auth)

  user_agent   text,                                     -- snapshot debug support — pas de PII identifiante
  -- Snapshot de plateforme pour le support (« iPhone Safari PWA »). CHECK = miroir de
  -- PushPlatformCapability/PwaCase côté client (lib/push). 'unknown' = fallback safe.
  platform     text CHECK (platform IN ('desktop','android-chrome','ios-safari','ios-other','standalone','unknown')),

  last_success_at timestamptz,                           -- dernier push livré (200/201)
  last_error_at   timestamptz,                           -- dernier échec d'envoi
  last_error_code text                                   -- CODE HTTP seul (ex. '410','404') — jamais le corps
);

COMMENT ON TABLE public.push_subscriptions IS
  'Abonnements Web Push (un endpoint navigateur = une ligne, multi-appareils par user). OWNER-ONLY via RLS ; l''Edge dispatch-push lit en service_role et purge les endpoints 410/404. Aucune PII : pas d''email ni de contenu de réponse.';

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 2 · push_preferences — préférences PAR UTILISATEUR (pas par appareil). Ligne créée
--     au premier subscribe (UPSERT défauts ON). Tout ON par défaut = opt-in déjà consenti.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.push_preferences (
  user_id        uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  updated_at     timestamptz NOT NULL DEFAULT now(),

  enabled        boolean NOT NULL DEFAULT true,          -- toggle master (off = aucun envoi, tous types)
  poll_opened    boolean NOT NULL DEFAULT true,          -- « Nouveau vote »
  poll_closed    boolean NOT NULL DEFAULT true,          -- « Résultats disponibles »
  poll_reminder  boolean NOT NULL DEFAULT true           -- « Il vous reste 24 h pour voter »
);

COMMENT ON TABLE public.push_preferences IS
  'Préférences Web Push par utilisateur (master + sous-préférences par type). OWNER-ONLY via RLS. L''Edge dispatch-push filtre les destinataires sur enabled + la colonne du type d''événement.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3 · push_delivery_log — journal d'envoi AGRÉGÉ (debug staff réseau). SANS PII :
--     que des compteurs. Aucun accès `authenticated` ; service_role uniquement.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_type    text NOT NULL,                           -- ex. 'poll.opened' (string libre = extensible)
  club_id       uuid REFERENCES public.clubs (id),
  poll_id       uuid REFERENCES public.polls (id),
  sent_count    int NOT NULL DEFAULT 0,
  failed_count  int NOT NULL DEFAULT 0,
  skipped_count int NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.push_delivery_log IS
  'Journal d''envoi push AGRÉGÉ (compteurs sent/failed/skipped par événement) — debug staff réseau. AUCUNE PII, aucun destinataire individuel. service_role uniquement.';

CREATE INDEX IF NOT EXISTS push_delivery_log_club_created_idx ON public.push_delivery_log (club_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- 4 · poll_email_sends — idempotence des emails de vote (V1 email Brevo, table posée en
--     V0). UNIQUE(poll_id, variant) ⇒ empêche un double envoi (publish/close/reminder)
--     même si un cron rejoue ou une Edge est retriée. service_role uniquement.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.poll_email_sends (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id          uuid NOT NULL REFERENCES public.polls (id) ON DELETE CASCADE,
  variant          text NOT NULL CHECK (variant IN ('opened','closed','reminder')),
  sent_at          timestamptz NOT NULL DEFAULT now(),
  recipient_count  int NOT NULL DEFAULT 0,
  brevo_message_id text,
  UNIQUE (poll_id, variant)                              -- garde-fou anti double-envoi (1 email par variante/poll)
);

COMMENT ON TABLE public.poll_email_sends IS
  'Idempotence des emails de vote (opened/closed/reminder). UNIQUE(poll_id,variant) empêche un double envoi si un cron rejoue. service_role uniquement (l''Edge d''envoi marque l''envoi).';

-- ════════════════════════════════════════════════════════════════════════════
-- RLS (§4.3)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_email_sends   ENABLE ROW LEVEL SECURITY;

-- ── push_subscriptions : OWNER-ONLY (le membre gère SES abonnements uniquement) ──
DROP POLICY IF EXISTS "push_subscriptions: owner select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions: owner insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions: owner update" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions: owner delete" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions: owner select"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions: owner insert"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions: owner update"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions: owner delete"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── push_preferences : lecture/écriture propre user (FOR ALL) ────────────────────
DROP POLICY IF EXISTS "push_preferences: owner all" ON public.push_preferences;

CREATE POLICY "push_preferences: owner all"
  ON public.push_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── push_delivery_log & poll_email_sends : AUCUNE policy `authenticated` ─────────
-- RLS activée + zéro policy ⇒ aucune ligne joignable par `authenticated`/`anon`.
-- Seul service_role (BYPASSRLS implicite + GRANT ci-dessous) y accède.

-- ── Grants table explicites (Data API désactive l'auto-exposition) ──────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_preferences   TO authenticated;
-- Pas de GRANT à authenticated sur push_delivery_log / poll_email_sends : service_role only.
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT ALL ON public.push_preferences   TO service_role;
GRANT ALL ON public.push_delivery_log  TO service_role;
GRANT ALL ON public.poll_email_sends   TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- close_due_polls() — §8.3 option A : retourne les polls clôturés (id, club_id) pour
-- que le cron post-clôture dispatch `poll.closed` par poll. Rétro-compatible :
-- `SELECT close_due_polls();` reste valide (renvoie désormais des lignes au lieu d'un int).
-- SECURITY DEFINER + search_path conservés (migration 038).
-- ════════════════════════════════════════════════════════════════════════════
-- DROP requis : on change le type de retour (integer → TABLE), PG refuse un simple
-- CREATE OR REPLACE quand la signature de sortie diffère.
DROP FUNCTION IF EXISTS public.close_due_polls();

CREATE FUNCTION public.close_due_polls()
RETURNS TABLE (poll_id uuid, club_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.polls
     SET status = 'closed',
         closed_manually_at = now()
   WHERE status = 'open'
     AND closes_at IS NOT NULL
     AND closes_at < now()
  RETURNING id, polls.club_id;   -- qualifié : évite l'ambiguïté avec la colonne OUT `club_id`
END;
$$;
REVOKE ALL ON FUNCTION public.close_due_polls() FROM public;
-- Pas de GRANT à authenticated : appelée uniquement par le cron (rôle postgres).

-- Le job horaire `close-due-polls` (migration 038) appelle toujours `SELECT close_due_polls();`
-- → rétro-compatible (le SELECT consomme les lignes retournées, la clôture s'opère pareil).
-- On ne le re-planifie PAS ici.

-- ════════════════════════════════════════════════════════════════════════════
-- Jobs pg_cron Web Push — sécurisés via Vault (pattern migration 032). DORMANTS EN
-- LOCAL : sans secrets Vault peuplés, le CROSS JOIN renvoie 0 ligne ⇒ le job NO-OP
-- proprement (aucun POST, aucune erreur). C'est attendu et identique au pattern existant.
--
-- URLs Edge à fournir par l'owner / l'agent EDGE (hors migration, jamais committé) :
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/poll-push-reminders', 'poll_push_reminders_url');
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/poll-closed-push',     'poll_closed_push_url');
--   (service_role_key déjà posé en prod — cf. migration 032.)
-- ════════════════════════════════════════════════════════════════════════════

-- ── (a) Rappel vote J-1 — quotidien 09:00 Europe/Paris (= 07:00 UTC en heure d'été,
--     08:00 en heure d'hiver ; pg_cron est en UTC, on vise 07:00 UTC comme approximation
--     stable). L'Edge `poll-push-reminders` sélectionne les polls open closes_at dans 24h,
--     filtre les membres n'ayant pas voté, et dispatch `poll.reminder`. ──────────────
SELECT cron.unschedule('poll-push-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'poll-push-reminders'
);

SELECT cron.schedule(
  'poll-push-reminders',
  '0 7 * * *',                                           -- tous les jours à 07:00 UTC (~09:00 Paris)
  $$
  SELECT net.http_post(
    url := u.val,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || k.val
    ),
    body := '{}'::jsonb
  )
  FROM (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'poll_push_reminders_url' LIMIT 1) u
  CROSS JOIN (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) k
  WHERE u.val IS NOT NULL
    AND k.val IS NOT NULL;
  $$
);

-- ── (b) Push post-clôture — horaire, aligné sur `close-due-polls`. L'Edge `poll-closed-push`
--     ré-exécute close_due_polls() (ou lit les polls fraîchement clôturés) et dispatch
--     `poll.closed` par poll. Décalé de 5 min après l'heure pile pour laisser
--     `close-due-polls` (0 * * * *) basculer les statuts avant. ──────────────────────
SELECT cron.unschedule('poll-closed-push') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'poll-closed-push'
);

SELECT cron.schedule(
  'poll-closed-push',
  '5 * * * *',                                           -- toutes les heures à HH:05 (après close-due-polls)
  $$
  SELECT net.http_post(
    url := u.val,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || k.val
    ),
    body := '{}'::jsonb
  )
  FROM (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'poll_closed_push_url' LIMIT 1) u
  CROSS JOIN (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) k
  WHERE u.val IS NOT NULL
    AND k.val IS NOT NULL;
  $$
);
