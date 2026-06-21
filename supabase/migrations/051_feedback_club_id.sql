-- 051_feedback_club_id.sql — NET-019 : console feedbacks RÉSEAU (/reseau/retours).
--
-- QUOI :
--   1. Colonne `feedback.club_id` (nullable, FK clubs) + index — dérivée de l'adhésion active
--      de l'auteur au moment du submit (côté Server Action). Les feedbacks antérieurs restent NULL.
--   2. RESSERREMENT RLS (décision owner) : la policy « staff read all » globale (migration 036)
--      laissait un trésorier de N'IMPORTE quel club lire TOUS les feedbacks. On la remplace par :
--        - membre RÉSEAU (is_network_member()) → lit TOUT ;
--        - staff DE CLUB → lit uniquement les feedbacks de SES clubs (club_id ∈ get_user_club_ids()
--          ET le caller est staff de CE club, via has_club_staff_access()).
--      La policy « self read » (un membre lit ses propres retours) est conservée intacte.
--   3. Policy UPDATE réservée au membre RÉSEAU pour modifier le STATUT (received→in_progress→done
--      →closed). Le bureau de club fera son UPDATE scopé-club en LOT C (ADM-009) — hors de cette
--      migration. L'Edge `feedback-dispatch` (service_role) continue de bypasser la RLS.
--
-- POURQUOI une nouvelle fonction `has_club_staff_access(p_club_id)` plutôt que `user_is_staff()` :
--   `user_is_staff()` (migration 014) est GLOBALE (« staff dans AU MOINS un club ») — exactement
--   le trou qu'on ferme. On introduit un helper PAR-CLUB fail-closed, calqué sur le pattern
--   SECURITY DEFINER STABLE de `get_user_role_in_club` (migration 010) / `is_club_staff` (028).
--
-- Réf : migrations 036 (feedback + RLS), 010 (get_user_club_ids / helpers RLS), 014 (user_is_staff),
--   040 (is_network_member), 046 (élargissement RLS au membre réseau) ; CLAUDE.md (RLS, least-privilege).

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Colonne club_id + index.
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.feedback.club_id IS
  'Club d''adhésion active de l''auteur au moment du submit (NET-019). NULL pour les feedbacks antérieurs ou un auteur sans adhésion active. Renseigné par la Server Action, jamais par le sync.';

CREATE INDEX IF NOT EXISTS feedback_club_id_idx ON public.feedback (club_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Helper fail-closed : le caller est-il staff (trésorier/président/network_admin)
--    de CE club précis ? SECURITY DEFINER STABLE, COALESCE(..., false).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.has_club_staff_access(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_catalog
AS $$
  SELECT COALESCE(
    (
      SELECT TRUE
        FROM public.memberships
       WHERE user_id = auth.uid()
         AND club_id = p_club_id
         AND is_active = TRUE
         AND role IN ('treasurer', 'president', 'network_admin')
       LIMIT 1
    ),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.has_club_staff_access(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_club_staff_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_club_staff_access(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RLS : remplacement de la policy « staff read all » globale.
--    AVANT : « feedback: staff read all » → USING (public.user_is_staff())  [GLOBAL]
--    APRÈS : « feedback: network read all »  → USING (is_network_member())   [tout le réseau]
--            « feedback: club staff read »    → USING (club_id ∈ mes clubs ET staff de ce club)
--    « feedback: self read » (migration 036) : INCHANGÉE (un membre lit ses propres retours).
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "feedback: staff read all" ON public.feedback;

-- (a) Membre RÉSEAU : lit TOUS les feedbacks (cross-club). Console /reseau/retours.
CREATE POLICY "feedback: network read all"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.is_network_member());

-- (b) Staff DE CLUB : lit uniquement les feedbacks rattachés à un de ses clubs où il est staff.
--     `club_id` NULL (feedback antérieur / sans club) n'est PAS visible par le staff de club —
--     seul le membre réseau (a) ou l'auteur lui-même (self read) le voient. Pas d'élargissement.
CREATE POLICY "feedback: club staff read"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (
    club_id IS NOT NULL
    AND club_id IN (SELECT public.get_user_club_ids())
    AND public.has_club_staff_access(club_id)
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 4. UPDATE du statut par un membre RÉSEAU (received→in_progress→done→closed).
--    Scope : membre réseau uniquement (la console réseau pilote le statut transverse).
--    Le bureau de club (UPDATE scopé-club) arrive en LOT C / ADM-009 — pas ici.
--    La validation des valeurs de `status` reste portée par le CHECK de migration 036.
--    GRANT UPDATE explicite (défense en profondeur — auto-expose Data API désactivé).
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "feedback: network update status" ON public.feedback;

CREATE POLICY "feedback: network update status"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (public.is_network_member())
  WITH CHECK (public.is_network_member());

GRANT UPDATE ON public.feedback TO authenticated;
