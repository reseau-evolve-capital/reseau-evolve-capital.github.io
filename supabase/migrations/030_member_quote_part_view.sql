-- Remplace la VUE MATÉRIALISÉE member_quote_part (migration 012) par une VUE NORMALE
-- avec security_invoker = true.
--
-- Pourquoi (E1 — bug bloquant dashboard vide à la 1re connexion) :
--   La MV était keyée sur user_id et rafraîchie UNIQUEMENT par refresh_member_quote_part()
--   (REFRESH MATERIALIZED VIEW CONCURRENTLY), appelée en fin de sync OK. À la 1re connexion,
--   le trigger handle_new_user (migration 014) re-key public.users.id → auth.uid ; les tables
--   suivent via FK ON UPDATE CASCADE, MAIS la MV n'a pas de FK → elle restait figée sur
--   l'ancien user_id. dashboard.ts (.eq('user_id', auth.uid).maybeSingle()) renvoyait null →
--   DashboardView affichait l'EmptyState « Données non disponibles » jusqu'au prochain sync.
--
-- Une vue NORMALE recalcule à chaque requête → suit immédiatement la cascade de re-key :
-- plus de fenêtre de bug. Volume faible (~21 memberships/club) → coût de requête négligeable.
--
-- security_invoker = true : la vue s'exécute avec les droits de l'appelant, donc la RLS des
-- tables sous-jacentes (memberships, contributions) s'applique. Un membre ne voit que SA ligne
-- (policies « contributions: own read » + « memberships: club read »). C'est strictement plus
-- sûr que la MV (les MV ignorent la RLS — l'isolation reposait sur le filtre applicatif).
--
-- On garde EXACTEMENT le même nom et les mêmes colonnes que la MV (012) pour que la couche
-- data (apps/web/lib/data/dashboard.ts) n'ait pas à changer son .select().
--
-- Ref : DATA_MODEL.md §2.9, CLAUDE.md (RLS native, jamais de NaN/undefined).

-- CASCADE supprime aussi l'index unique mqp_user_club_idx (les vues normales ne sont pas
-- indexables). Aucun autre objet ne dépend de la MV (vérifié en local : 0 dépendance).
DROP MATERIALIZED VIEW IF EXISTS member_quote_part CASCADE;

CREATE VIEW member_quote_part
WITH (security_invoker = true)
AS
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

-- Accès lecture cohérent avec l'usage actuel : la couche serveur interroge la vue en tant que
-- rôle `authenticated`. La RLS sous-jacente (security_invoker) fait le filtrage par membre.
GRANT SELECT ON member_quote_part TO authenticated;

-- refresh_member_quote_part() devient inutile (plus de MV à rafraîchir). On la transforme en
-- NO-OP idempotent plutôt que de la DROP : l'Edge sync l'appelait (migration 012) et une vieille
-- version d'environnement pourrait encore l'appeler — un no-op évite tout « function does not
-- exist ». L'appel est retiré de supabase/functions/sync/index.ts dans le même lot.
CREATE OR REPLACE FUNCTION refresh_member_quote_part()
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT NULL::void; -- no-op : member_quote_part est désormais une vue normale, toujours à jour.
$$;
