-- Table portfolio_aggregates — lignes d'AGRÉGAT du portefeuille (C2, E-PFT).
-- Source : feuille POSITIONS, lignes à symbole VIDE (col A = libellé, col G = valeur).
-- Ex. : « Portefeuille » (= total affiché), « Provision », « Solde : opérations courts termes »,
-- « Solde : opérations longs termes », « Remboursement en cours ».
-- Jusqu'ici ces lignes ne vivaient que dans sheet_snapshots.raw_data->'aggregateRows' (JSONB,
-- non requêtable). On les persiste ici pour que l'app lise le TOTAL et les soldes par label.
--
-- Réconciliation : le sync UPSERT par (club_id, label normalisé) avec le synced_at du run, puis
-- désactive (is_active=false) tout label dont le synced_at est antérieur (absent de la matrice).
-- Matching TOUJOURS par LABEL (jamais par index : position variable dans la matrice).
--
-- RLS : lecture pour les membres du club (helper get_user_club_ids(), migration 010). Aucune policy
-- d'écriture → seul le service role du sync (bypass RLS) écrit. Cohérent avec positions (migration 011).

CREATE TABLE IF NOT EXISTS portfolio_aggregates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,              -- libellé brut (col A), ex. « Portefeuille »
  market_value    NUMERIC(18,2),             -- valeur boursière de la ligne (col G)
  book_value      NUMERIC(18,2),             -- coût d'achat éventuel
  allocation_pct  NUMERIC(8,4),              -- % d'allocation éventuel
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,  -- false si label absent de la dernière sync
  synced_at       TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, label)
);

CREATE INDEX IF NOT EXISTS portfolio_aggregates_club_id_idx ON portfolio_aggregates(club_id);

-- ============================================================
-- RLS — lecture membre du club ; écriture service role uniquement (aucune policy write).
-- ============================================================
ALTER TABLE portfolio_aggregates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_aggregates: club member read" ON portfolio_aggregates;

CREATE POLICY "portfolio_aggregates: club member read"
  ON portfolio_aggregates FOR SELECT
  USING (club_id IN (SELECT get_user_club_ids()));
