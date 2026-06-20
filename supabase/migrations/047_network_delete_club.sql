-- 047_network_delete_club.sql — Suppression d'un club depuis l'espace réseau.
--
-- USAGE : network_delete_club(p_club_id) est appelée par la Server Action `deleteClubAction`
-- (apps/web/app/(app)/reseau/actions.ts) exclusivement via la session du caller (jamais
-- service-role côté app). La garde `is_network_admin()` fail-closed est EN PREMIER.
--
-- DÉPENDANCES (toutes avec ON DELETE CASCADE sur clubs.id) :
--   memberships, positions, transactions, contributions, contribution_months,
--   sheet_snapshots, portfolio_aggregates (migration 029), club_reporting_daily (migration 034),
--   invitations (migration 016).
-- Un simple `DELETE FROM clubs WHERE id = p_club_id` déclenche la cascade complète.
-- On utilise malgré tout des DELETE explicites dans l'ordre correct pour :
--   1. Journaliser avant suppression (network_log_event exige que le club existe encore).
--   2. Être lisible et auditable en cas de régression.
--
-- Réf : migrations 004-009, 016, 029, 034, 040, 042 ; CLAUDE.md (RLS, jamais service-role).

-- ════════════════════════════════════════════════════════════════════════════
-- network_delete_club — supprime un club et toutes ses dépendances en cascade.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.network_delete_club(p_club_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- Garde fail-closed : network_admin REQUIS (suppression irréversible).
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Vérifie l'existence du club AVANT toute modification.
  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- Journalise l'événement AVANT suppression (le club doit encore exister pour la FK network_events).
  PERFORM public.network_log_event(
    'network_delete_club',
    'club',
    p_club_id,
    jsonb_build_object(
      'name', (SELECT name FROM clubs WHERE id = p_club_id),
      'slug', (SELECT slug FROM clubs WHERE id = p_club_id)
    )
  );

  -- Supprime le club. Toutes les tables FK avec ON DELETE CASCADE sont nettoyées automatiquement :
  --   memberships, positions, transactions, contributions, contribution_months,
  --   sheet_snapshots, portfolio_aggregates, club_reporting_daily, invitations.
  DELETE FROM clubs WHERE id = p_club_id;
END;
$$;

-- Accès : revoke public, grant authenticated uniquement (la RPC porte sa propre garde admin).
REVOKE ALL ON FUNCTION public.network_delete_club(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.network_delete_club(UUID) TO authenticated;
