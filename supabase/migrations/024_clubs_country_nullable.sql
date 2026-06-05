-- clubs.country devient NULLABLE (désaccord matrice Google Sheets ↔ schéma).
--
-- La feuille PARAMETRAGES ne porte pas (encore) le pays du club : le mapper
-- envoie donc `country: null`, ce qui violait la contrainte NOT NULL posée en
-- migration 002 et faisait échouer l'upsert clubs lors de la sync (PARAMETRAGES).
-- Décision owner : le pays sera saisi par l'admin/président plus tard → la colonne
-- devient nullable. On conserve le DEFAULT 'FR' (sans effet sur un INSERT qui passe
-- explicitement country=null, mais utile pour tout INSERT futur qui omet la colonne).
--
-- Additif et non destructif : aucune donnée existante n'est touchée. Pas de RLS
-- nouvelle (colonne sur table existante, déjà couverte par ses policies).
--
-- Réf : DATA_MODEL §4.1 (PARAMETRAGES), CLAUDE.md (jamais de donnée inventée).

ALTER TABLE clubs ALTER COLUMN country DROP NOT NULL;

COMMENT ON COLUMN clubs.country IS
  'Code ISO 3166-1 alpha-2. Nullable depuis migration 024 (saisi par l''admin/président plus tard).';
