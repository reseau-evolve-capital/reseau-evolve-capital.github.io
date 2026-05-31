-- Extensions pour la sync planifiée (pg_cron + pg_net).
-- Le job cron réel (POST vers l'Edge Function /sync toutes les 2h) est défini en SHE-007
-- (Task 7), car il nécessite l'URL de la fonction et la clé service role disponibles
-- uniquement une fois l'environnement Supabase provisionné.
-- Ref : ARCHITECTURE.md §1, DATA_MODEL.md §2.8 (rétention snapshots)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
