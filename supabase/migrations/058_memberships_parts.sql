-- 058_memberships_parts.sql — Colonne `parts` sur memberships (OPS-102, cahier §4.2).
--
-- QUOI : ajoute `memberships.parts` (mode OPCVM). Chaque cotisation confirmée et réglée
--   convertit du cash en parts au prix de la part au moment du règlement ; le nombre de
--   parts détenues détermine la quote-part du membre. Mis à jour par la RPC
--   settle_contributions_wave (livrée dans un ticket ultérieur OPS).
--
-- Additif et idempotent : ADD COLUMN IF NOT EXISTS, DEFAULT 0 → ne casse aucune vue ni
--   policy existante (notamment member_quote_part migr 030, security_invoker, qui
--   sélectionne ses colonnes explicitement et ignore les ajouts).
--
-- Réf : 004 (memberships), 030 (member_quote_part — non impactée).

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS parts numeric(18,8) DEFAULT 0;

COMMENT ON COLUMN public.memberships.parts IS
  'Parts détenues par le membre (mode OPCVM, cahier §4.2). Une cotisation confirmée et réglée est convertie en parts au prix de la part au règlement ; la quote-part dérive du ratio parts/total. Mis à jour par settle_contributions_wave. NULL/0 = aucune part allouée.';
