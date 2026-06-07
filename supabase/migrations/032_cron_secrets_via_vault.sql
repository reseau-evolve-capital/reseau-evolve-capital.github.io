-- Migration 032 — bascule les crons (sync 2h + attestations mensuelles) de
-- `current_setting('app.*')` vers **Supabase Vault**.
--
-- POURQUOI : sur Supabase HÉBERGÉ, le rôle `postgres` n'est pas superuser et n'a PAS
-- le droit de `ALTER DATABASE/ROLE ... SET app.sync_url = …` (PG15 : custom GUCs
-- nécessitent un GRANT que seul un superuser peut accorder → « permission denied to
-- set parameter "app.sync_url" »). Le pattern `current_setting('app.*')` des migrations
-- 013/021 ne marche donc qu'en LOCAL (postgres y est superuser). Vault est le mécanisme
-- supporté pour fournir des secrets aux jobs pg_cron en prod.
--
-- COMMENT : les jobs lisent maintenant url + clé service_role depuis `vault.decrypted_secrets`
-- par NOM. Si un secret est absent (ex. stack locale sans vault peuplé), le CROSS JOIN
-- renvoie 0 ligne → le job NO-OP proprement (aucun POST, aucune erreur) — même
-- innocuité qu'avant avec un GUC vide.
--
-- À PEUPLER (hors migration, jamais committé — une fois par environnement) :
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/sync', 'sync_url');
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-monthly-attestations', 'attestation_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
--   (update : select vault.update_secret(id, '<nouvelle valeur>') ; cf. vault.secrets)
--
-- Ref : migrations 013 (sync) + 021 (attestations) qu'elle supersède ; docs/DEPLOY.md §4.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Vault (fourni par l'image Supabase ; idempotent). Crée le schéma `vault`.
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ── Job sync (toutes les 2h) ───────────────────────────────────────────────
SELECT cron.unschedule('sync-clubs-every-2h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-clubs-every-2h'
);

SELECT cron.schedule(
  'sync-clubs-every-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := u.val,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || k.val
    ),
    body := jsonb_build_object('club_id', c.id)
  )
  FROM clubs c
  CROSS JOIN (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'sync_url' LIMIT 1) u
  CROSS JOIN (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) k
  WHERE c.sheet_id IS NOT NULL
    AND u.val IS NOT NULL
    AND k.val IS NOT NULL;
  $$
);

-- ── Job attestations mensuelles (le 5 à 06:00 UTC) ─────────────────────────
SELECT cron.unschedule('send-monthly-attestations') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-monthly-attestations'
);

SELECT cron.schedule(
  'send-monthly-attestations',
  '0 6 5 * *',
  $$
  SELECT net.http_post(
    url := u.val,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || k.val
    ),
    body := '{}'::jsonb
  )
  FROM (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'attestation_url' LIMIT 1) u
  CROSS JOIN (SELECT decrypted_secret AS val FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1) k
  WHERE u.val IS NOT NULL
    AND k.val IS NOT NULL;
  $$
);
