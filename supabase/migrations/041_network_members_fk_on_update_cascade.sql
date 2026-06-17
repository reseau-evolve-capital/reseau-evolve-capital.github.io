-- 041_network_members_fk_on_update_cascade.sql — NET-002 : corrige le FK de network_members.
--
-- DÉFAUT NET-001 (migration 040) : `network_members.user_id` référence `public.users(id)` en
-- ON DELETE CASCADE mais SANS ON UPDATE CASCADE. Or la liaison auth re-keye `public.users.id`
-- vers l'UUID GoTrue au 1er login (handle_new_user, migration 014) via `UPDATE users SET id=…`.
-- La FK `memberships` (migration 014) porte donc ON UPDATE CASCADE ON DELETE CASCADE pour
-- suivre ce re-key. `network_members` ne l'avait pas → tout login d'un user listé dans
-- network_members ÉCHOUE :
--   ERROR: update or delete on table "users" violates foreign key constraint
--          "network_members_user_id_fkey" on table "network_members"
--
-- Conséquence : un membre réseau ne peut tout simplement pas se connecter (le re-key bloque).
--
-- Fix : on aligne la FK sur le pattern `memberships` (ON UPDATE CASCADE ON DELETE CASCADE),
-- pour que le re-key user_id propage automatiquement à network_members.
--
-- Réf : migration 014 (handle_new_user re-key + FK memberships ON UPDATE CASCADE), 040 (NET-001).

ALTER TABLE public.network_members
  DROP CONSTRAINT IF EXISTS network_members_user_id_fkey;

ALTER TABLE public.network_members
  ADD CONSTRAINT network_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id)
  ON UPDATE CASCADE ON DELETE CASCADE;
