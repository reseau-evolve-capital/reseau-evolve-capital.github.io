-- 019 — Seuil anti-spam pour l'alerte email d'erreur de sync (NTF-003).
--
-- Quand l'Edge Function `sync` rencontre une erreur DURE, elle prévient les
-- trésoriers du club par email (via Brevo). Pour éviter de spammer en cas de
-- pannes répétées (sync toutes les ~2h via pg_cron), on n'envoie qu'au plus une
-- alerte par fenêtre glissante (4h). Cet horodatage mémorise le dernier envoi
-- réussi par club. NULL = aucune alerte encore envoyée → l'envoi est autorisé.
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS last_error_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN clubs.last_error_email_sent_at IS
  'NTF-003 — dernier envoi de l''alerte email « erreur de sync » aux trésoriers (seuil anti-spam 4h). NULL = jamais envoyée.';
