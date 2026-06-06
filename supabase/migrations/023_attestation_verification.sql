-- Registre de vérification de l'attestation (NTF-004 follow-up).
--
-- Le PDF d'attestation intègre un QR pointant vers /verifier/{reference}. Pour que la page
-- publique puisse confirmer l'authenticité d'un document, on persiste la `reference`
-- déterministe (REC-AAAAMM-XXXX, calculée par mapAttestation) sur la ligne attestation_sends
-- lors de l'envoi mensuel — l'attestation OFFICIELLE mensuelle est la version vérifiable
-- (le flux on-demand n'enregistre rien : cf. route /api/attestation/detention).
--
-- La vérification publique passe par une RPC SECURITY DEFINER à divulgation MINIMALE :
-- aucune PII membre, aucun montant — uniquement période, nom du club, date d'émission.
--
-- Réf : NTF-004/NTF-005, CLAUDE.md (RLS, divulgation minimale, jamais de PII publique).

-- Référence vérifiable du document (renseignée par le cron à l'envoi). Nullable :
-- les lignes historiques antérieures à ce follow-up n'en ont pas (→ « référence inconnue »).
ALTER TABLE attestation_sends ADD COLUMN IF NOT EXISTS reference TEXT;
COMMENT ON COLUMN attestation_sends.reference IS
  'N° de référence vérifiable (REC-AAAAMM-XXXX) encodé dans le QR du PDF. Renseigné par le cron à l''envoi.';

CREATE INDEX IF NOT EXISTS attestation_sends_reference_idx ON attestation_sends(reference);

-- RPC publique de vérification — divulgation minimale (aucune PII membre, aucun montant).
-- SECURITY DEFINER : contourne la RLS pour exposer UNIQUEMENT les 3 champs non sensibles.
-- 0 ligne si la référence est inconnue → la page affiche « référence inconnue ».
CREATE OR REPLACE FUNCTION verify_attestation(p_reference text)
RETURNS TABLE(period text, club_name text, issued_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT a.period, c.name, a.sent_at
  FROM attestation_sends a
  JOIN memberships m ON m.id = a.membership_id
  JOIN clubs c ON c.id = m.club_id
  WHERE a.reference = p_reference
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION verify_attestation(text) TO anon, authenticated;
