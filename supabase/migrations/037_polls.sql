-- 037_polls.sql — Vote anonyme V0 (spec docs/superpowers/specs/2026-06-13-vote-anonyme-design.md §6, §7, §10).
--
-- QUOI : deux tables (`polls`, `poll_responses`), leur RLS, trois RPC SECURITY DEFINER
--   (submit_vote / get_poll_results / has_voted) et un job pg_cron horaire de clôture auto.
--
-- ANONYMAT BY DESIGN (§6) :
--   `poll_responses.user_id` est stocké pour DEUX raisons légitimes — garantir 1 vote/membre
--   (UNIQUE (poll_id, user_id)) et permettre à un membre de savoir s'il a déjà voté
--   (has_voted()). Mais `user_id` n'est JAMAIS exposé à un rôle `authenticated` :
--     - AUCUNE policy SELECT sur poll_responses pour `authenticated` (REVOKE SELECT explicite) ;
--     - seules les RPC SECURITY DEFINER lisent les réponses, et get_poll_results ne renvoie
--       JAMAIS user_id (que des agrégats + textes sans attribution).
--
-- RLS (CLAUDE.md : RLS obligatoire dès la création, jamais joignable sans policy) :
--   polls          : membre lit open/closed de son club ; staff (treasurer/president/
--                    network_admin) FOR ALL (draft inclus).
--   poll_responses : INSERT seul pour `authenticated` (« membre peut voter »), aucun SELECT.
--
-- Réf : migrations 010 (get_user_role_in_club / get_user_club_ids — réutilisées), 028
--   (is_club_staff fail-closed — réutilisée), 011 (style RLS), 021/032 (pattern pg_cron),
--   036 (style table/RLS/commentaires).

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── Table polls ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.polls (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- Scope
  club_id            uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  network_wide       boolean NOT NULL DEFAULT false,          -- V1, non utilisé en V0

  -- Contenu
  title              text NOT NULL,
  description        text,
  question_type      text NOT NULL
                     CHECK (question_type IN ('yes_no', 'single_choice', 'multiple_choice', 'short_text')),
  options            jsonb,                                   -- null pour yes_no/short_text ; [{id,label}] sinon

  -- Paramètres
  results_visibility text NOT NULL DEFAULT 'after_close'
                     CHECK (results_visibility IN ('after_close', 'live')),
  closes_at          timestamptz,                             -- null = pas de clôture automatique
  notify_by_email    boolean NOT NULL DEFAULT false,

  -- Cycle de vie
  status             text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'open', 'closed')),
  closed_manually_at timestamptz,

  -- Auteur (auth.users — créateur authentifié, jamais exposé dans les résultats)
  created_by         uuid NOT NULL REFERENCES auth.users (id)
);

COMMENT ON TABLE public.polls IS
  'Votes anonymes V0 (un vote = une question). Géré par le staff (draft→open→closed). Les membres lisent open/closed de leur club via RLS.';

CREATE INDEX IF NOT EXISTS polls_club_status_idx ON public.polls (club_id, status);
-- Index partiel : le cron ne scanne que les votes ouverts avec une deadline.
CREATE INDEX IF NOT EXISTS polls_open_closes_at_idx ON public.polls (closes_at)
  WHERE status = 'open' AND closes_at IS NOT NULL;

-- ── Table poll_responses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poll_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),

  poll_id          uuid NOT NULL REFERENCES public.polls (id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users (id),

  -- Réponse selon question_type
  selected_options text[],                                   -- yes_no / single / multiple
  text_response    text CHECK (char_length(text_response) <= 280),  -- short_text (§10)

  UNIQUE (poll_id, user_id)                                  -- 1 vote par membre (§4)
);

COMMENT ON TABLE public.poll_responses IS
  'Réponses aux votes. user_id stocké pour l''unicité et has_voted(), mais JAMAIS exposé via RLS/RPC : anonymat by design (§6). Aucune policy SELECT pour authenticated.';

CREATE INDEX IF NOT EXISTS poll_responses_poll_id_idx ON public.poll_responses (poll_id);

-- ── RLS polls ─────────────────────────────────────────────────────────────────
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls: membre lit les votes de son club" ON public.polls;
DROP POLICY IF EXISTS "polls: staff gere les votes"            ON public.polls;

-- Membres : lecture des votes ouverts/clôturés de leur club (jamais les draft).
CREATE POLICY "polls: membre lit les votes de son club"
  ON public.polls FOR SELECT
  TO authenticated
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND status IN ('open', 'closed')
  );

-- Staff : lecture + écriture (draft inclus). is_club_staff() est fail-closed (migration 028).
CREATE POLICY "polls: staff gere les votes"
  ON public.polls FOR ALL
  TO authenticated
  USING (public.is_club_staff(club_id))
  WITH CHECK (public.is_club_staff(club_id));

-- ── RLS poll_responses ────────────────────────────────────────────────────────
ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poll_responses: membre peut voter" ON public.poll_responses;

-- INSERT : un membre actif du club peut insérer SA réponse à un vote ouvert.
-- (Le chemin nominal passe par submit_vote ; cette policy verrouille l'écriture directe.)
CREATE POLICY "poll_responses: membre peut voter"
  ON public.poll_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.polls p
      JOIN public.memberships m ON m.club_id = p.club_id
      WHERE p.id = poll_id
        AND m.user_id = auth.uid()
        AND m.is_active = TRUE
        AND p.status = 'open'
    )
  );

-- ── Grants table explicites (Data API) ───────────────────────────────────────
-- L'auto-exposition implicite des nouvelles tables aux rôles Data API est désactivée
-- depuis 2026-05-30 (cf. supabase/config.toml `auto_expose_new_tables`). Sans GRANT
-- explicite, toute requête PostgREST en rôle `authenticated` échoue en 42501 même si
-- une policy RLS l'autorise. On accorde donc les privilèges au niveau table ; la RLS
-- (policies ci-dessus) reste la garde fine sur les lignes/opérations.
--   • polls : membre lit (SELECT, RLS open/closed du club), staff écrit (RLS FOR ALL).
--   • poll_responses : le membre INSÈRE sa réponse (RLS) ; le SELECT reste révoqué
--     (anonymat — les agrégats passent par la RPC SECURITY DEFINER get_poll_results).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT INSERT ON public.poll_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_responses TO service_role;

-- NB : AUCUNE policy SELECT/UPDATE/DELETE pour `authenticated` sur poll_responses.
-- On révoque en plus le SELECT au niveau privilège table (défense en profondeur) :
-- même si une policy SELECT était ajoutée par erreur, le GRANT manquant bloquerait la lecture.
REVOKE SELECT ON public.poll_responses FROM authenticated;
REVOKE SELECT ON public.poll_responses FROM anon;

-- ════════════════════════════════════════════════════════════════════════════
-- RPC SECURITY DEFINER (§6)
-- ════════════════════════════════════════════════════════════════════════════

-- ── submit_vote (VOLATILE) ────────────────────────────────────────────────────
-- Vérifie : poll ouvert + membre actif du club + pas déjà voté → INSERT. RAISE sinon.
CREATE OR REPLACE FUNCTION public.submit_vote(
  p_poll_id          uuid,
  p_selected_options text[] DEFAULT NULL,
  p_text_response    text   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id       uuid;
  v_status        text;
  v_question_type text;
  v_uid           uuid := auth.uid();
  v_response_id   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentification requise' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 1. Le vote doit exister.
  SELECT club_id, status, question_type
    INTO v_club_id, v_status, v_question_type
    FROM public.polls WHERE id = p_poll_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'vote introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- 2. Le vote doit être ouvert (status = source de vérité, pas de check sur closes_at ici).
  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'vote non ouvert' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. L'appelant doit être membre actif du club.
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_uid AND club_id = v_club_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'acces refuse : membre actif requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 4. Pas déjà voté (garde explicite ; la contrainte UNIQUE reste le filet de sécurité).
  IF EXISTS (
    SELECT 1 FROM public.poll_responses WHERE poll_id = p_poll_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'vote deja enregistre' USING ERRCODE = 'unique_violation';
  END IF;

  -- 5. Cohérence réponse / type de question.
  IF v_question_type = 'short_text' THEN
    IF p_text_response IS NULL OR btrim(p_text_response) = '' THEN
      RAISE EXCEPTION 'reponse texte requise' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF char_length(p_text_response) > 280 THEN
      RAISE EXCEPTION 'reponse texte trop longue (max 280)' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    INSERT INTO public.poll_responses (poll_id, user_id, text_response)
    VALUES (p_poll_id, v_uid, p_text_response)
    RETURNING id INTO v_response_id;
  ELSE
    IF p_selected_options IS NULL OR array_length(p_selected_options, 1) IS NULL THEN
      RAISE EXCEPTION 'au moins une option requise' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF v_question_type IN ('yes_no', 'single_choice') AND array_length(p_selected_options, 1) > 1 THEN
      RAISE EXCEPTION 'une seule option autorisee' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    INSERT INTO public.poll_responses (poll_id, user_id, selected_options)
    VALUES (p_poll_id, v_uid, p_selected_options)
    RETURNING id INTO v_response_id;
  END IF;

  RETURN v_response_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_vote(uuid, text[], text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_vote(uuid, text[], text) TO authenticated;

-- ── has_voted (STABLE) → boolean ──────────────────────────────────────────────
-- Le membre peut savoir s'il a voté, sans jamais voir sa propre réponse.
CREATE OR REPLACE FUNCTION public.has_voted(p_poll_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.poll_responses
    WHERE poll_id = p_poll_id AND user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.has_voted(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.has_voted(uuid) TO authenticated;

-- ── get_poll_results (STABLE) ─────────────────────────────────────────────────
-- Vérifie : membre du club + visibilité (after_close → status=closed ; live → toujours).
-- Retourne un jsonb anonyme : { options: [{option,count,pct}], text_responses: [text],
-- total_responses: int }. JAMAIS user_id.
CREATE OR REPLACE FUNCTION public.get_poll_results(p_poll_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_club_id       uuid;
  v_status        text;
  v_visibility    text;
  v_question_type text;
  v_uid           uuid := auth.uid();
  v_total         int;
  v_options       jsonb;
  v_texts         jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentification requise' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT club_id, status, results_visibility, question_type
    INTO v_club_id, v_status, v_visibility, v_question_type
    FROM public.polls WHERE id = p_poll_id;
  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'vote introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- Membre (actif) du club requis.
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = v_uid AND club_id = v_club_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'acces refuse : membre du club requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Visibilité : after_close → uniquement si clôturé ; live → toujours.
  IF v_visibility = 'after_close' AND v_status <> 'closed' THEN
    RAISE EXCEPTION 'resultats disponibles a la cloture' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Total de réponses (= nombre de votants ; user_id agrégé, jamais listé).
  SELECT count(*) INTO v_total FROM public.poll_responses WHERE poll_id = p_poll_id;

  -- Agrégats par option (selected_options dépaqueté). pct sur le total de votants.
  SELECT COALESCE(
           jsonb_agg(jsonb_build_object(
             'option', opt,
             'count', cnt,
             'pct', CASE WHEN v_total > 0 THEN round((cnt::numeric * 100) / v_total, 2) ELSE 0 END
           ) ORDER BY cnt DESC, opt),
           '[]'::jsonb
         )
    INTO v_options
    FROM (
      SELECT opt, count(*)::int AS cnt
      FROM public.poll_responses pr
      CROSS JOIN LATERAL unnest(COALESCE(pr.selected_options, ARRAY[]::text[])) AS opt
      WHERE pr.poll_id = p_poll_id
      GROUP BY opt
    ) agg;

  -- Réponses texte sans attribution (short_text).
  SELECT COALESCE(jsonb_agg(text_response ORDER BY created_at), '[]'::jsonb)
    INTO v_texts
    FROM public.poll_responses
    WHERE poll_id = p_poll_id AND text_response IS NOT NULL;

  RETURN jsonb_build_object(
    'poll_id', p_poll_id,
    'question_type', v_question_type,
    'total_responses', v_total,
    'options', v_options,
    'text_responses', v_texts
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_poll_results(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Clôture automatique (§4) — fonction + job pg_cron horaire.
-- status est la source de vérité : le cron bascule open → closed quand closes_at < now().
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.close_due_polls()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.polls
     SET status = 'closed',
         closed_manually_at = now()
   WHERE status = 'open'
     AND closes_at IS NOT NULL
     AND closes_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.close_due_polls() FROM public;
-- Pas de GRANT à authenticated : appelée uniquement par le cron (rôle postgres).

-- Idempotence du job : désinscription avant (re)planification.
SELECT cron.unschedule('close-due-polls') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'close-due-polls'
);

-- « 0 * * * * » → toutes les heures pile (UTC).
SELECT cron.schedule(
  'close-due-polls',
  '0 * * * *',
  $$ SELECT public.close_due_polls(); $$
);
