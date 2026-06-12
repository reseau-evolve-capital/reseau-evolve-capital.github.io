-- 035_health_status_rpc.sql — RPC de healthcheck pour le monitoring externe.
--
-- Contexte : la sync Sheets → Postgres (Edge Function `sync`, pg_cron toutes les 2h,
-- migration 032) peut échouer SILENCIEUSEMENT : l'Edge renvoie toujours HTTP 200, même
-- avec success:false. On surveille donc la DONNÉE, pas le code HTTP :
--   - fraîcheur : max(clubs.synced_at) — témoin mis à jour en fin de run réussi ;
--   - santé par feuille : dernier sheet_snapshots de chaque feuille (status success|partial|failed) ;
--   - fraîcheur du reporting : max(club_reporting_daily.report_date) — WARNING seulement
--     (la série peut s'arrêter pour un problème de DONNÉES côté Sheet, pas un échec de sync).
--
-- Sécurité : SECURITY DEFINER car appelée par le rôle anon (route /api/health publique,
-- convention CLAUDE.md : pas de SUPABASE_SERVICE_ROLE_KEY dans apps/web). La fonction
-- n'expose AUCUNE donnée membre — uniquement des statuts et des horodatages agrégés.
-- Style : helpers SECURITY DEFINER existants (010, 028, 031).
--
-- Réf : docs/monitoring/MONITORING.md (healthcheck GitHub Actions → Discord).

CREATE OR REPLACE FUNCTION public.health_status()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH last_sync AS (
    -- Témoin de fraîcheur global : la sync met à jour clubs.synced_at en fin de run.
    SELECT MAX(synced_at) AS synced_at FROM clubs
  ),
  latest_sheets AS (
    -- Dernier snapshot de CHAQUE feuille (par club) — journal d'import (migration 009).
    SELECT DISTINCT ON (club_id, sheet_name)
      sheet_name,
      status,
      synced_at
    FROM sheet_snapshots
    ORDER BY club_id, sheet_name, synced_at DESC
  ),
  reporting AS (
    SELECT MAX(report_date) AS last_date FROM club_reporting_daily
  )
  SELECT jsonb_build_object(
    'synced_at',          ls.synced_at,
    'sync_age_minutes',   FLOOR(EXTRACT(EPOCH FROM (NOW() - ls.synced_at)) / 60)::int,
    -- Fraîche si < 180 min (cron = 2h + marge). NULL (jamais syncé) → FALSE.
    'sync_fresh',         COALESCE(NOW() - ls.synced_at < INTERVAL '180 minutes', FALSE),
    'sheets',             COALESCE(
                            (SELECT jsonb_agg(
                               jsonb_build_object(
                                 'sheet_name', s.sheet_name,
                                 'status',     s.status,
                                 'synced_at',  s.synced_at
                               ) ORDER BY s.sheet_name
                             ) FROM latest_sheets s),
                            '[]'::jsonb
                          ),
    'has_failed_sheet',   COALESCE((SELECT bool_or(s.status = 'failed') FROM latest_sheets s), FALSE),
    'reporting_last_date', r.last_date,
    -- WARNING seulement (jamais un critère d'échec) : > 7 jours ou aucune donnée.
    'reporting_stale',    COALESCE(r.last_date < CURRENT_DATE - 7, TRUE)
  )
  FROM last_sync ls, reporting r;
$$;

-- ACL : exécutable par anon (route /api/health) et authenticated ; rien d'autre.
REVOKE ALL ON FUNCTION public.health_status() FROM public;
GRANT EXECUTE ON FUNCTION public.health_status() TO anon, authenticated;

COMMENT ON FUNCTION public.health_status() IS
  'Statut de santé de la sync Sheets → Postgres (fraîcheur, feuilles en échec, fraîcheur reporting). Aucune donnée membre exposée. Consommée par /api/health (anon).';
