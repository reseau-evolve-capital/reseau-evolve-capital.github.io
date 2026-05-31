-- Activation RLS et policies pour toutes les tables de données.
-- Toutes les opérations INSERT/UPDATE sur les tables Sheets sont réservées au service role
-- (Edge Function /sync avec SUPABASE_SERVICE_ROLE_KEY — bypass RLS).
-- Ref : DATA_MODEL.md §3 — Policies RLS

-- ============================================================
-- Activation RLS (idempotent en Postgres)
-- ============================================================
ALTER TABLE clubs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_snapshots     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- clubs
-- ============================================================
DROP POLICY IF EXISTS "clubs: member read"      ON clubs;
DROP POLICY IF EXISTS "clubs: treasurer update" ON clubs;

CREATE POLICY "clubs: member read"
  ON clubs FOR SELECT
  USING (id IN (SELECT get_user_club_ids()));

CREATE POLICY "clubs: treasurer update"
  ON clubs FOR UPDATE
  USING (get_user_role_in_club(id) IN ('treasurer', 'president', 'network_admin'));

-- ============================================================
-- users
-- ============================================================
DROP POLICY IF EXISTS "users: self read"         ON users;
DROP POLICY IF EXISTS "users: self update"       ON users;
DROP POLICY IF EXISTS "users: self insert"       ON users;
DROP POLICY IF EXISTS "users: club members read" ON users;

CREATE POLICY "users: self read"   ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users: self update" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users: self insert" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- Les membres d'un même club peuvent voir les profils de base (annuaire intra-club V1)
CREATE POLICY "users: club members read"
  ON users FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM memberships
      WHERE club_id IN (SELECT get_user_club_ids())
    )
  );

-- ============================================================
-- memberships
-- ============================================================
DROP POLICY IF EXISTS "memberships: club read"       ON memberships;
DROP POLICY IF EXISTS "memberships: president manage" ON memberships;

CREATE POLICY "memberships: club read"
  ON memberships FOR SELECT
  USING (club_id IN (SELECT get_user_club_ids()));

CREATE POLICY "memberships: president manage"
  ON memberships FOR ALL
  USING (get_user_role_in_club(club_id) IN ('president', 'network_admin'));

-- ============================================================
-- positions
-- INSERT/UPDATE : service role uniquement (Edge Function sync)
-- ============================================================
DROP POLICY IF EXISTS "positions: club member read" ON positions;

CREATE POLICY "positions: club member read"
  ON positions FOR SELECT
  USING (club_id IN (SELECT get_user_club_ids()));

-- ============================================================
-- transactions
-- ============================================================
DROP POLICY IF EXISTS "transactions: club member read" ON transactions;

CREATE POLICY "transactions: club member read"
  ON transactions FOR SELECT
  USING (club_id IN (SELECT get_user_club_ids()));

-- ============================================================
-- contributions
-- ============================================================
DROP POLICY IF EXISTS "contributions: own read"       ON contributions;
DROP POLICY IF EXISTS "contributions: treasurer read" ON contributions;

-- Un membre voit uniquement SA contribution (donnée nominative)
CREATE POLICY "contributions: own read"
  ON contributions FOR SELECT
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Le trésorier voit toutes les contributions du club
CREATE POLICY "contributions: treasurer read"
  ON contributions FOR SELECT
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND get_user_role_in_club(club_id) IN ('treasurer', 'president', 'network_admin')
  );

-- ============================================================
-- contribution_months
-- ============================================================
DROP POLICY IF EXISTS "cm: own read"       ON contribution_months;
DROP POLICY IF EXISTS "cm: treasurer read" ON contribution_months;

CREATE POLICY "cm: own read"
  ON contribution_months FOR SELECT
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "cm: treasurer read"
  ON contribution_months FOR SELECT
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND get_user_role_in_club(club_id) IN ('treasurer', 'president', 'network_admin')
  );

-- ============================================================
-- sheet_snapshots
-- ============================================================
DROP POLICY IF EXISTS "snapshots: treasurer read" ON sheet_snapshots;

CREATE POLICY "snapshots: treasurer read"
  ON sheet_snapshots FOR SELECT
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND get_user_role_in_club(club_id) IN ('treasurer', 'president', 'network_admin')
  );
