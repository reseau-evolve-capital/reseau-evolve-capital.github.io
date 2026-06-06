-- 018 — Drapeau d'envoi de l'email de bienvenue (NTF-002).
--
-- Garantit l'idempotence de l'email de bienvenue : l'Edge Function
-- `on-user-first-login` n'envoie l'email que si welcome_sent = false, puis
-- bascule la colonne à true. Un second déclenchement (re-login, replay webhook)
-- ne renvoie donc rien.
--
-- Pas de policy RLS dédiée : la colonne est lue/écrite exclusivement par
-- l'Edge Function en service-role (bypass RLS). Les policies existantes de
-- `users` régissent déjà l'accès membre.
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_sent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.welcome_sent IS
  'true une fois l''email de bienvenue NTF-002 envoyé. Garantit l''idempotence (Edge Function on-user-first-login).';
