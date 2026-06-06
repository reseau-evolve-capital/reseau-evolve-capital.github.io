-- Table positions — portefeuille du club
-- Source : feuille Portefeuille (colonnes A à W).
-- Les lignes d'agrégat (Provision, Espèces, etc.) ne sont PAS stockées ici — elles vont dans sheet_snapshots.raw_data.

CREATE TABLE IF NOT EXISTS positions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  -- Identification
  name              TEXT NOT NULL,                -- "Nom du titre" → "META PLATFORMS"
  symbol            TEXT NOT NULL,               -- "Symboles" → "NASDAQ:META"
  category          TEXT,                        -- "Catégories" → "Actions"
  sector            TEXT,                        -- "Secteur" → "Technologie"
  typologie         TEXT,                        -- "Typologie du titre" → "Offensif" | "Défensif"
  -- Quantités & valorisation (snapshot Sheets)
  quantity          NUMERIC(18,6) NOT NULL,      -- "Parts"
  currency          CHAR(3) NOT NULL DEFAULT 'EUR',  -- "Devise"
  currency_ref      CHAR(3),                     -- "Devise (référence)"
  market_price_eur  NUMERIC(18,4),               -- "Cours en €" (converti en EUR)
  market_value      NUMERIC(18,2),               -- "Valeur boursière"
  book_value        NUMERIC(18,2),               -- "Coût d'achat"
  allocation_pct    NUMERIC(8,4),               -- "%Allocation"
  pump              NUMERIC(18,4),              -- "PUMP" (PRU pondéré moyen)
  pe                NUMERIC(8,2),               -- "PE" (Price/Earnings)
  eps               NUMERIC(8,4),               -- "EPS"
  gain_loss_pct     NUMERIC(8,4),              -- "Gain/Loss" (en %)
  gain_loss_eur     NUMERIC(18,2),             -- "Gain/Loss en €"
  -- Gestion du risque
  stop_loss_pct     NUMERIC(8,4),              -- "% Stop Loss"
  take_profit_pct   NUMERIC(8,4),              -- "% Take profit"
  perf_cible        NUMERIC(8,4),              -- "Perf. à conserver"
  perf_calibree     NUMERIC(8,4),             -- "Perf. Calibrée"
  stop_loss_value   NUMERIC(18,4),            -- "Stop Loss value"
  take_profit_value NUMERIC(18,4),            -- "Take profit value"
  -- Métadonnées
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,  -- false si position liquidée
  synced_at         TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, symbol)
);

CREATE INDEX IF NOT EXISTS positions_club_id_idx   ON positions(club_id);
CREATE INDEX IF NOT EXISTS positions_sector_idx    ON positions(club_id, sector);
CREATE INDEX IF NOT EXISTS positions_symbole_idx   ON positions(symbol);
