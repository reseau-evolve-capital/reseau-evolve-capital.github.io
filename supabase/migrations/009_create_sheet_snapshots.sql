-- Table sheet_snapshots — audit de chaque import Sheets
-- Permet le rollback et la détection de dérives entre syncs.
-- Rétention : 10 derniers snapshots par feuille par club (nettoyé par pg_cron hebdomadaire).

CREATE TABLE IF NOT EXISTS sheet_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  sheet_name    TEXT NOT NULL,
  raw_data      JSONB NOT NULL,
  row_count     INT NOT NULL,
  checksum      TEXT NOT NULL,           -- SHA-256 du raw_data sérialisé
  status        snapshot_status NOT NULL DEFAULT 'success',
  error_message TEXT,
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS snapshots_club_sheet_idx
  ON sheet_snapshots(club_id, sheet_name, synced_at DESC);
