-- users étend les profils membres. Déviation assumée vs DATA_MODEL §2.2 (DDL) :
-- pas de FK dure vers auth.users(id). Un membre importé depuis la feuille Base
-- existe AVANT d'avoir un compte Supabase Auth (id = UUID généré localement).
-- La liaison avec auth.users se fait à la connexion via l'email (epic E-AUT) —
-- email reste la clé naturelle UNIQUE de matching. Voir CLAUDE.md / DATA_MODEL §2.2 (prose).

CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL UNIQUE,
  firstname             TEXT,                      -- prénom (issu de la décomposition de full_name)
  lastname              TEXT,                      -- nom de famille
  full_name             TEXT NOT NULL,             -- "AFOUDAH Ruben" — copie directe de Base.Nom
  avatar_url            TEXT,
  phone                 TEXT,                      -- Base.Numero de telephone
  address               TEXT,                      -- Base.Adresse
  city                  TEXT,                      -- optionnel, dérivé de l'adresse
  country               CHAR(2) NOT NULL DEFAULT 'FR',
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  rgpd_consented_at     TIMESTAMPTZ,
  directory_opt_in      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX        IF NOT EXISTS users_full_name_idx ON users(lower(full_name));  -- lookup insensible à la casse
