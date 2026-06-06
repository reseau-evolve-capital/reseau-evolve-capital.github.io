-- Migration 026 — « Aucune perte à l'import » (principe owner non négociable).
--
-- Deux quarantaines historiques jetaient des lignes pourtant valides côté métier :
--   1. Transactions HISTORIQUE sans date (date inconnue) — écartées car
--      transactions.transaction_date était NOT NULL.
--   2. Membres Base sans email (sortants sans compte) — écartés car le mapper
--      throw sur email vide.
--
-- On lève ces deux blocages SANS jamais fabriquer de donnée fausse :
--   - une transaction sans date est importée avec transaction_date = NULL ;
--   - un membre sans email est importé avec un email synthétique déterministe
--     marqué email_is_placeholder = true (jamais d'accès au club : le placeholder
--     `.local` n'est ni invité ni sur l'allowlist, donc aucun magic link possible).

-- 1) Transactions : la date devient tolérée NULL (date inconnue ≠ ligne perdue).
ALTER TABLE transactions ALTER COLUMN transaction_date DROP NOT NULL;
COMMENT ON COLUMN transactions.transaction_date IS
  'Date de l''opération (feuille HISTORIQUE). NULL toléré : une date inconnue ne doit jamais faire perdre la transaction. Ne JAMAIS fabriquer de date de remplacement.';

-- 2) Users : drapeau « email synthétique » pour les membres importés sans email.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_is_placeholder BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN users.email_is_placeholder IS
  'true = email synthétique généré à l''import (membre Base sans email, typiquement un sortant). À remplacer par l''admin plus tard. Ne reçoit jamais de magic link (placeholder `.local`, ni invité ni sur l''allowlist).';
