-- Table contributions — synthèse des cotisations par membre
-- Source : feuille COTISATIONS. 1 ligne par membership.

CREATE TABLE IF NOT EXISTS contributions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id     UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  months_count      INT NOT NULL DEFAULT 0,
  detention_pct     NUMERIC(8,6) NOT NULL,       -- quote-part (ex: 0.12345 = 12,345 %)
  total_contributed NUMERIC(18,2) NOT NULL,
  penalties         NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_market_value  NUMERIC(18,2),               -- valorisation de la quote-part
  status            contribution_status NOT NULL,
  amount_due        NUMERIC(18,2) NOT NULL DEFAULT 0,
  synced_at         TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(membership_id)
);

CREATE INDEX IF NOT EXISTS contributions_club_id_idx ON contributions(club_id);
CREATE INDEX IF NOT EXISTS contributions_status_idx  ON contributions(club_id, status);
