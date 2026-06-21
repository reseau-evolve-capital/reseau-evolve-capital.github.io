-- 054_feedback_club_staff_update.sql — ADM-009 : console feedbacks BUREAU DE CLUB (/admin/retours).
--
-- PROBLÈME : la migration 051 a donné au STAFF DE CLUB la LECTURE des feedbacks de ses clubs
-- (policy « feedback: club staff read »), mais l'UPDATE du statut restait réservé au membre RÉSEAU
-- (policy « feedback: network update status »). L'écran 02 (console club) a un select de statut
-- modifiable : le bureau de club doit pouvoir faire passer un retour de SON club
-- received→in_progress→done→closed sans être membre réseau.
--
-- SOLUTION (minimale, fail-closed) : une policy UPDATE supplémentaire PERMISSIVE pour le staff
-- d'un club, strictement scopée à SES clubs où il est staff. Avec deux policies UPDATE permissives
-- (réseau + staff-club), Postgres les OR : un membre réseau garde son accès transverse, un staff de
-- club gagne l'accès à SES clubs uniquement. Le USING et le WITH CHECK sont symétriques (et
-- exigent tous deux `club_id IS NOT NULL` + appartenance + staff) pour empêcher un staff de
-- « déplacer » un feedback vers un club tiers via l'UPDATE. La validation des valeurs de `status`
-- reste portée par le CHECK de la migration 036. Le scope colonne (status seul) est garanti côté
-- app (Server Action : `.update({ status })`), comme pour la policy réseau.
--
-- ON NE TOUCHE À RIEN D'AUTRE de la RLS : les policies SELECT (self / network / club staff read) et
-- la policy UPDATE réseau de 051 restent intactes. Aucune nouvelle colonne (types.gen.ts inchangé).
--
-- Réf : migration 051 (feedback.club_id + has_club_staff_access + RLS feedback), 010
-- (get_user_club_ids), 036 (feedback + CHECK status) ; CLAUDE.md (RLS least-privilege, fail-closed).

-- ════════════════════════════════════════════════════════════════════════════
-- UPDATE du statut par le STAFF d'un club, scopé à SES clubs où il est staff.
--   USING       : la ligne visée appartient à un de mes clubs ET j'y suis staff (avant écriture).
--   WITH CHECK  : la ligne RÉSULTANTE appartient toujours à ce club (anti-déplacement cross-club).
-- `club_id IS NULL` (feedback antérieur / sans club) reste non modifiable par un staff de club.
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "feedback: club staff update status" ON public.feedback;

CREATE POLICY "feedback: club staff update status"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (
    club_id IS NOT NULL
    AND club_id IN (SELECT public.get_user_club_ids())
    AND public.has_club_staff_access(club_id)
  )
  WITH CHECK (
    club_id IS NOT NULL
    AND club_id IN (SELECT public.get_user_club_ids())
    AND public.has_club_staff_access(club_id)
  );

-- GRANT UPDATE déjà posé en 051 (TO authenticated) — la policy ci-dessus restreint la portée réelle.
