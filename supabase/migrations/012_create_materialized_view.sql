-- Vue matérialisée member_quote_part — agrège les données dashboard membre.
-- Rafraîchie après chaque sync réussie via refresh_member_quote_part().
-- L'index unique sur (user_id, club_id) permet le REFRESH CONCURRENTLY.
-- Ref : DATA_MODEL.md §2.9

DROP MATERIALIZED VIEW IF EXISTS member_quote_part;

CREATE MATERIALIZED VIEW member_quote_part AS
SELECT
  m.user_id,
  m.club_id,
  m.role,
  m.status          AS membership_status,
  m.joined_at,
  c.detention_pct,
  c.total_contributed,
  c.net_market_value,
  c.status          AS contribution_status,
  c.amount_due,
  c.synced_at
FROM memberships m
LEFT JOIN contributions c ON c.membership_id = m.id
WHERE m.is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS mqp_user_club_idx ON member_quote_part(user_id, club_id);

-- Fonction de rafraîchissement appelée par l'Edge Function /sync après chaque import réussi.
-- SECURITY DEFINER : la Edge Function n'a pas besoin du service role pour appeler cette fonction.
CREATE OR REPLACE FUNCTION refresh_member_quote_part()
RETURNS void LANGUAGE SQL SECURITY DEFINER AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY member_quote_part;
$$;
