-- Table transactions — journal des opérations boursières
-- Source : feuille HISTORIQUE.

CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  type             transaction_type NOT NULL,
  symbol           TEXT,
  name             TEXT,
  quantity         NUMERIC(18,6),
  price            NUMERIC(18,4),
  total            NUMERIC(18,2),
  transaction_date DATE NOT NULL,
  notes            TEXT,
  synced_at        TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_club_date_idx ON transactions(club_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_symbol_idx    ON transactions(club_id, symbol);
