-- Table attestation_sends — journal des envois mensuels d'attestation de détention (NTF-005).
--
-- Une ligne par (membership, période) : c'est le garde-fou d'IDEMPOTENCE du cron mensuel.
-- L'Edge Function `send-monthly-attestations` consulte cette table avant tout envoi et
-- n'insère qu'après un POST Brevo réussi. La contrainte UNIQUE (membership_id, period)
-- garantit qu'un membre ne reçoit jamais deux fois l'attestation d'une même période,
-- même si le job est relancé.
--
-- Ref : NTF-005, CLAUDE.md (RLS activée sur toutes les tables ; écriture service-role).

CREATE TABLE IF NOT EXISTS attestation_sends (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id    UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  period           TEXT NOT NULL,                 -- format « YYYY-MM »
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  brevo_message_id TEXT,                          -- identifiant retourné par Brevo (traçabilité)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (membership_id, period)
);

CREATE INDEX IF NOT EXISTS attestation_sends_membership_idx ON attestation_sends(membership_id);
CREATE INDEX IF NOT EXISTS attestation_sends_period_idx     ON attestation_sends(period);

-- ============================================================
-- RLS — cohérent avec le repo : aucune table sans policy.
-- Lecture : le membre concerné (membership.user_id = auth.uid()).
-- Écriture : service-role uniquement (l'Edge Function bypasse la RLS).
-- ============================================================
ALTER TABLE attestation_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attestation_sends: own read" ON attestation_sends;

CREATE POLICY "attestation_sends: own read"
  ON attestation_sends FOR SELECT
  USING (
    membership_id IN (
      SELECT id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- Aucune policy INSERT/UPDATE/DELETE : seul le service-role (qui bypasse la RLS) écrit.
