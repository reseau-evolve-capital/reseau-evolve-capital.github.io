-- Table memberships — jonction N:N entre users et clubs
-- is_active calculé automatiquement depuis status (GENERATED) pour éviter toute désynchronisation.

CREATE TABLE IF NOT EXISTS memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  role              member_role NOT NULL DEFAULT 'member',
  status            member_status NOT NULL DEFAULT 'active',
  joined_at         DATE NOT NULL,                -- Base."Date d'entrée (validation par BD)"
  leave_at          DATE,                         -- Base."Date de sortie" (nullable)
  leave_with_amount NUMERIC(18,2),               -- Base."Valeur boursière au jour départ" (nullable)
  is_active         BOOLEAN GENERATED ALWAYS AS (status = 'active') STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, club_id)
);

CREATE INDEX IF NOT EXISTS memberships_club_id_idx ON memberships(club_id);
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_active_idx  ON memberships(club_id, is_active);
