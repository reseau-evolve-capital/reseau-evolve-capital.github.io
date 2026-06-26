-- 061_secretary_role_enum.sql — Introduction du role club `secretary` (LECTURE SEULE).
--
-- BUT : ajouter la valeur `secretary` a l'enum member_role (cree en 001, DEJA EN PROD).
--
-- POURQUOI UN FICHIER SEPARE : en Postgres, une valeur ajoutee a un enum via ALTER TYPE ... ADD VALUE
-- n'est PAS utilisable dans la meme transaction que son ADD VALUE. Supabase execute chaque fichier de
-- migration dans une transaction unique. La valeur `secretary` doit donc etre committee AVANT d'etre
-- referencee par les policies / helpers / RPC. Tout le cablage (helper de lecture, policies RLS,
-- admin_change_member_role) vit donc dans 062_secretary_read_access.sql, garanti de tourner apres ce
-- commit.
--
-- LECTURE SEULE PAR CONSTRUCTION : `is_club_staff` (migration 028) garde TOUTES les ecritures et n'inclut
-- PAS `secretary`. En laissant cette fonction INCHANGEE, le secretaire est refuse en ecriture
-- gratuitement (aucun INSERT/UPDATE/DELETE possible via les RPC SECURITY DEFINER ni les policies
-- d'ecriture). Tout octroi d'ecriture futur au secretaire devra etre un grant explicite par-surface.
--
-- Ref : migration 001 (CREATE TYPE member_role), 028 (is_club_staff fail-closed), CLAUDE.md.

ALTER TYPE member_role ADD VALUE IF NOT EXISTS 'secretary';
