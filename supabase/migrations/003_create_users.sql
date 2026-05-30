-- Table users — étend auth.users de Supabase
-- Pré-peuplée lors de l'import Base, même si le membre n'a pas encore de compte Auth.

CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx    ON users(email);
CREATE INDEX        IF NOT EXISTS users_full_name_idx ON users(lower(full_name));  -- lookup insensible à la casse
