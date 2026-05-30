-- Extensions Postgres requises (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Types énumérés — idempotents via DO $$ ... EXCEPTION WHEN duplicate_object

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('member','treasurer','president','network_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contribution_status AS ENUM ('ok','pending','late','exempt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE month_status AS ENUM ('paid','due','late','exempt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('buy','sell','dividend','coupon','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE snapshot_status AS ENUM ('success','partial','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('active','left');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
