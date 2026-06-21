-- 053_audit_log.sql — OPS-007 : socle d'audit GLOBAL des actions sensibles (append-only).
--
-- Objectif : journaliser TOUTES les actions sensibles de l'app (réseau, votes, admin trésorier,
-- rôles, statut feedback…) sans jamais faire tomber la mutation. Le log est posé par un wrapper
-- APPLICATIF (apps/web/lib/actions/withAudit.ts) APRÈS le succès de l'action, en fire-and-forget.
--
-- Différence avec `network_events` (migration 042) : `network_events` est l'audit du SEUL scope
-- RÉSEAU, écrit DEPUIS les RPC SECURITY DEFINER de gouvernance (network_create_club, …). `audit_log`
-- est l'audit TRANSVERSE de l'app, écrit par un appel RPC dédié `log_audit_event` après une mutation
-- réussie, quel que soit le domaine. Les deux coexistent (réseau garde sa trace inviolable côté RPC ;
-- audit_log capte le reste, depuis la couche Server Action).
--
-- ❌ INTERDIT (CLAUDE.md / spec OPS-007) : un trigger Postgres synchrone générique qui RAISE
-- ferait un ROLLBACK de la mutation. Ici l'écriture du log est volontairement DÉCOUPLÉE de la
-- mutation : elle se fait via un appel RPC séparé, awaité dans un try/catch côté app qui avale
-- l'erreur (→ Sentry, jamais re-throw). Un log perdu n'annule JAMAIS l'action métier.
--
-- Sécurité (least privilege, pattern 016/025/028/042) :
--   - RLS activée. AUCUNE policy INSERT/UPDATE/DELETE pour `authenticated` → pas d'écriture directe
--     ni de falsification client. L'INSERT passe EXCLUSIVEMENT par la fonction SECURITY DEFINER
--     `log_audit_event` (qui pose actor_id = auth.uid(), non usurpable).
--   - SELECT réservé aux membres réseau (is_network_member()), comme network_events.
--   - Append-only : aucune policy UPDATE/DELETE → la trace est immuable côté authenticated.
--
-- Réf : migration 042 (network_events / network_log_event, modèle direct), 040 (is_network_member
-- fail-closed), CLAUDE.md (RLS, jamais service-role côté app, least privilege).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Table d'audit GLOBAL `audit_log` (append-only).
--    actor_id = users.id de l'appelant (nullable : action système / acteur supprimé).
--    ON UPDATE CASCADE suit le re-key auth (cf. 014/041) ; ON DELETE SET NULL conserve la
--    trace même si le user est supprimé. target_id est TEXT (cible polymorphe : uuid, slug,
--    période « 2026-06 »…) — pas une FK, car la cible n'est pas toujours une table connue.
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.audit_log IS
  'Journal d''audit TRANSVERSE des actions sensibles (OPS-007). Append-only : écriture via la fonction SECURITY DEFINER log_audit_event() uniquement (wrapper applicatif withAudit, fire-and-forget) ; aucune policy write/update/delete pour authenticated. SELECT réservé aux membres réseau.';

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log(action);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre réseau (admin OU board). PAS de policy INSERT/UPDATE/DELETE pour
-- authenticated → l'insertion ne passe que par la fonction SECURITY DEFINER (qui bypasse la RLS
-- d'écriture) et la table reste append-only / non falsifiable côté client.
DROP POLICY IF EXISTS "audit_log: lecture membre reseau" ON public.audit_log;

CREATE POLICY "audit_log: lecture membre reseau"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_network_member());

GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. log_audit_event — INSERT d'une ligne d'audit. SECURITY DEFINER (VOLATILE car écrit).
--    Appelée par le wrapper applicatif withAudit() APRÈS une mutation réussie. actor_id est
--    TOUJOURS dérivé de auth.uid() côté serveur (jamais un paramètre) → non usurpable.
--    Exposée à `authenticated` (contrairement à network_log_event qui n'est appelée que depuis
--    d'autres RPC du même propriétaire) : ici l'appelant légitime est la Server Action, qui
--    tourne avec le JWT de session. La table n'ayant aucune policy write, c'est le SEUL chemin
--    d'écriture — l'exposer ne crée pas de surface de falsification (actor_id reste auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action      TEXT,
  p_target_type TEXT  DEFAULT NULL,
  p_target_id   TEXT  DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;
