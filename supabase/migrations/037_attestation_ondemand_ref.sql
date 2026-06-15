-- 037_attestation_ondemand_ref.sql — RT-03 : rendre vérifiable l'attestation téléchargée à la demande.
--
-- Contexte : le QR du PDF d'attestation encode une référence déterministe (REC-AAAAMM-XXXX,
-- calculée par mapAttestation). La page publique /verifier/{ref} (RPC verify_attestation, migr 023)
-- ne lit que `attestation_sends`. Or, jusqu'ici, SEUL le cron mensuel persistait la référence ;
-- l'attestation téléchargée à la demande (route /api/attestation/detention) n'écrivait RIEN →
-- le QR menait systématiquement à « référence inconnue ».
--
-- Problème d'écriture : la RLS d'attestation_sends (migr 020) n'a AUCUNE policy INSERT/UPDATE/DELETE
-- (seul le service-role écrit, via l'Edge). La route membre n'utilise — par convention CLAUDE.md —
-- JAMAIS le service-role : elle ne peut donc pas insérer directement. On expose donc une RPC
-- SECURITY DEFINER, scopée à auth.uid(), qui persiste la référence pour UNE membership du membre
-- courant uniquement.
--
-- Sécurité :
--   - SECURITY DEFINER (contourne l'absence de policy INSERT) MAIS vérifie que p_membership_id
--     appartient à auth.uid() → un membre ne peut JAMAIS écrire la référence d'un autre membre ;
--   - SET search_path = public (hygiène SECURITY DEFINER, cf. helpers 010/028/031/035) ;
--   - GRANT EXECUTE au seul rôle authenticated (la route membre est authentifiée).
--
-- Idempotence : ON CONFLICT (membership_id, period) DO UPDATE — on (ré)écrit la référence sans
-- dupliquer ni casser l'idempotence du cron (contrainte UNIQUE (membership_id, period), migr 020).
-- brevo_message_id reste NULL pour une attestation on-demand (aucun envoi e-mail).
--
-- Réf : RT-03, migrations 020 (attestation_sends) / 023 (verify_attestation), CLAUDE.md
--       (RLS partout, SECURITY DEFINER scopé auth.uid(), jamais de service-role côté membre).

CREATE OR REPLACE FUNCTION public.record_attestation_ref(
  p_membership_id uuid,
  p_period text,
  p_reference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Garde-fou d'isolation : la membership doit appartenir au membre authentifié.
  -- Sinon, refus explicite — JAMAIS écrire la référence d'un autre membre.
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE id = p_membership_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'record_attestation_ref: membership % does not belong to the current user', p_membership_id
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO attestation_sends (membership_id, period, reference)
  VALUES (p_membership_id, p_period, p_reference)
  ON CONFLICT (membership_id, period)
  DO UPDATE SET reference = EXCLUDED.reference;
END;
$$;

-- ACL : exécutable par le seul rôle authenticated (route membre). Rien pour anon/public.
REVOKE ALL ON FUNCTION public.record_attestation_ref(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_attestation_ref(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.record_attestation_ref(uuid, text, text) IS
  'Persiste la référence vérifiable (REC-AAAAMM-XXXX) d''une attestation téléchargée à la demande. '
  'SECURITY DEFINER scopé auth.uid() : refuse toute membership n''appartenant pas au membre courant. '
  'Idempotent via ON CONFLICT (membership_id, period). Réf RT-03.';
