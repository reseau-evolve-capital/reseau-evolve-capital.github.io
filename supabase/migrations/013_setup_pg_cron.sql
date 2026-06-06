-- Extensions pour la sync planifiée (pg_cron + pg_net).
-- Le job cron réel (POST vers l'Edge Function /sync toutes les 2h) est défini en SHE-007
-- (Task 7), car il nécessite l'URL de la fonction et la clé service role disponibles
-- uniquement une fois l'environnement Supabase provisionné.
-- Ref : ARCHITECTURE.md §1, DATA_MODEL.md §2.8 (rétention snapshots)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Job sync planifié toutes les 2h : POST vers l'Edge Function pour chaque club configuré.
-- L'URL et la clé service role sont fournies via des paramètres de session Postgres
-- (à définir hors migration : ALTER DATABASE postgres SET app.sync_url = '...';
--  ALTER DATABASE postgres SET app.service_role_key = '...';) — jamais en dur ici.

-- Idempotence : on désinscrit le job existant avant de le (re)planifier.
SELECT cron.unschedule('sync-clubs-every-2h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-clubs-every-2h'
);

SELECT cron.schedule(
  'sync-clubs-every-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.sync_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('club_id', c.id)
  )
  FROM clubs c
  WHERE c.sheet_id IS NOT NULL;
  $$
);
