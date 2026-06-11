-- 034_club_reporting_daily.sql — Série quotidienne club (DSH-011).
--
-- Série quotidienne club — source : feuille REPORTING (cols A–E de la matrice Google Sheets).
-- Alimentation : Edge Function sync (service role, bypass RLS). Lecture : membres du club (RLS).
-- Append-only / upsert par (club_id, report_date) : PAS de soft-delete par synced_at
-- (contrairement à positions) — une ligne absente de la feuille n'est jamais supprimée
-- automatiquement en V0 (évite un effacement accidentel si la plage lue est tronquée).
-- Purge manuelle trésorier = V1+. Réf : docs/tickets/PROMPT-DEV-DSH-011-REPORTING-SYNC.md §3.

CREATE TABLE IF NOT EXISTS club_reporting_daily (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id               UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  report_date           DATE NOT NULL,
  portfolio_value       NUMERIC(18,2) NOT NULL,   -- col B
  total_contributions   NUMERIC(18,2) NOT NULL,   -- col C
  capital_gain          NUMERIC(18,2),            -- col D (nullable, recalculé B−C si absent)
  performance_ratio     NUMERIC(12,6),            -- col E (= B/C si C>0, recalculé si absent)
  synced_at             TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, report_date)
);

-- Index de lecture dashboard : « les N derniers points du club » (ORDER BY report_date DESC).
CREATE INDEX club_reporting_daily_club_date_idx
  ON club_reporting_daily (club_id, report_date DESC);

-- ============================================================
-- RLS — lecture membre du club (helper get_user_club_ids(), migration 010) ;
-- écriture service role uniquement (aucune policy write). Cohérent avec
-- positions (011) et portfolio_aggregates (029).
-- ============================================================
ALTER TABLE club_reporting_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_reporting_daily: club member read"
  ON club_reporting_daily FOR SELECT
  USING (club_id IN (SELECT get_user_club_ids()));

-- Écriture : service role uniquement (sync) — AUCUNE policy INSERT/UPDATE/DELETE authenticated.
