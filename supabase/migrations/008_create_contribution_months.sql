-- Table contribution_months — historique mensuel des cotisations
-- Source : feuille Details cotisations.
-- Index partiel sur les retards (due/late) pour les requêtes de relance.

CREATE TABLE IF NOT EXISTS contribution_months (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year          SMALLINT NOT NULL,
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        month_status NOT NULL,
  due_date      DATE,
  paid_at       DATE,
  synced_at     TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(membership_id, year, month)
);

CREATE INDEX IF NOT EXISTS cm_membership_idx ON contribution_months(membership_id);
CREATE INDEX IF NOT EXISTS cm_club_date_idx  ON contribution_months(club_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS cm_status_idx     ON contribution_months(club_id, status)
  WHERE status IN ('due', 'late');   -- index partiel sur les retards
