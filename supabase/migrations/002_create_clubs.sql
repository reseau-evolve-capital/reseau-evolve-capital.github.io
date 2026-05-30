-- Table clubs — source feuille PARAMETRAGES
-- Un club = une matrice Google Sheets (sheet_id). Multi-club dès V0.

CREATE TABLE IF NOT EXISTS clubs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  sheet_id         TEXT,                           -- Google Sheets ID de la matrice du club
  min_contribution NUMERIC(10,2),
  currency         CHAR(3) NOT NULL DEFAULT 'EUR',
  city             TEXT,                           -- ville du club (nullable)
  country          CHAR(2) NOT NULL DEFAULT 'FR',  -- code ISO 3166-1 alpha-2
  settings         JSONB NOT NULL DEFAULT '{}',
  synced_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_idx ON clubs(slug);
