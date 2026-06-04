-- Cron mensuel d'envoi des attestations de détention (NTF-005).
--
-- Le 5 de chaque mois à 08:00 (heure de Paris), Postgres POST l'Edge Function
-- `send-monthly-attestations` via pg_net. La fonction parcourt clubs → membres actifs,
-- saute les envois déjà journalisés (table attestation_sends), rend le PDF + l'email et
-- POST Brevo, puis journalise. Le corps de la requête ne porte PAS de période : la
-- fonction calcule la période cible (mois précédent) à l'exécution — un seul job pour
-- tous les clubs, idempotent côté fonction.
--
-- pg_cron tourne en UTC. 08:00 Europe/Paris = 06:00 UTC (été) / 07:00 UTC (hiver).
-- On planifie à 06:00 UTC (compromis : jamais avant 07:00 locale en hiver, à 08:00 en été) ;
-- la valeur exacte peut être ajustée sans toucher la fonction.
--
-- Pré-requis (hors migration, comme le cron sync 013) :
--   ALTER DATABASE postgres SET app.attestation_url = 'https://<ref>.supabase.co/functions/v1/send-monthly-attestations';
--   ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
--
-- Ref : NTF-005, migration 013 (pattern pg_cron + pg_net), CLAUDE.md (multi-club côté DB).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotence du job : on le désinscrit avant de le (re)planifier.
SELECT cron.unschedule('send-monthly-attestations') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-monthly-attestations'
);

-- « 0 6 5 * * » → à 06:00 UTC, le 5 de chaque mois.
SELECT cron.schedule(
  'send-monthly-attestations',
  '0 6 5 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.attestation_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
