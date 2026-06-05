-- Champs data de l'attestation de détention (NTF-004 follow-up).
--
-- L'attestation tombait sur « — » pour plusieurs champs faute de colonnes en DB :
--   - n° de compte courtier du club,
--   - plafond annuel d'investissement (→ capacité restante),
--   - adresse postale du membre.
-- Ces colonnes sont toutes NULLABLES et ADDITIVES : une colonne vide reste rendue « — »
-- (le mapper est null-safe, aucune donnée n'est inventée). Pas de RLS nouvelle : ce sont
-- des colonnes sur des tables existantes, déjà couvertes par leurs policies.
--
-- Réf : NTF-004, CLAUDE.md (jamais de donnée inventée, fallback —).

-- Club : référence du compte courtier + plafond annuel d'investissement par membre.
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS broker_account_ref TEXT;
COMMENT ON COLUMN clubs.broker_account_ref IS
  'N° de compte courtier du club (attestation NTF-004). Nullable → « — ».';

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS annual_investment_cap NUMERIC(18,2);
COMMENT ON COLUMN clubs.annual_investment_cap IS
  'Plafond annuel d''investissement (EUR) ; pilote la capacité restante de l''attestation. Nullable → « — ».';

-- Membre : adresse postale dédiée à l'attestation (distincte de users.address issu de Base).
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_address TEXT;
COMMENT ON COLUMN users.postal_address IS
  'Adresse postale du membre pour l''attestation (NTF-004). Nullable → fallback users.address, sinon « — ».';
