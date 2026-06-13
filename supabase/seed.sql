-- Seed local Supabase — données de développement.
-- Vide pour l'instant : les clubs/membres sont importés via l'Edge Function sync (SHE-006).

-- Fixture E2E (AUT-009) : un club + un membre invité non onboardé.
INSERT INTO clubs (id, name, slug, sheet_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Club E2E', 'club-e2e', 'sheet-e2e')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, full_name, onboarding_completed)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'test@example.com', 'Test Membre', false)
ON CONFLICT (email) DO NOTHING;

INSERT INTO memberships (user_id, club_id, role, joined_at)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'member', '2024-01-01')
ON CONFLICT (user_id, club_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- Vote anonyme V0 (migration 037) — fixtures de test, idempotentes.
--
-- Objectif : couvrir les tests e2e/RPC :
--   - un membre qui N'A PAS voté (poll_member_b : peut voter) ;
--   - un membre qui a déjà voté (poll_member_a : has_voted=true sur le vote yes_no live) ;
--   - les 4 types de question sur des votes OPEN (yes_no live, single after_close,
--     multiple, short_text) ;
--   - un vote CLOSED avec réponses pour tester get_poll_results (agrégats + textes anonymes).
--
-- Les FK polls.created_by / poll_responses.user_id pointent sur auth.users → on seed
-- auth.users + public.users (liaison par email) + memberships actives.
-- IDs préfixés `ec`/`dd`/`ee` pour ne pas collisionner avec les fixtures AUT-009 ci-dessus.
-- ════════════════════════════════════════════════════════════════════════════

-- ── auth.users (FK des tables polls) ────────────────────────────────────────
-- Insert minimal compatible GoTrue ; instance_id/aud/role aux valeurs par défaut.
INSERT INTO auth.users (instance_id, id, aud, role, email, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'poll-president@example.com', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'poll-member-a@example.com',  now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'poll-member-b@example.com',  now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── public.users (mêmes ids que auth.users — liaison directe) ───────────────
INSERT INTO public.users (id, email, full_name, country, onboarding_completed)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'poll-president@example.com', 'Président Vote', 'FR', true),
  ('cccccccc-0000-0000-0000-000000000002', 'poll-member-a@example.com',  'Membre A Vote',  'FR', true),
  ('cccccccc-0000-0000-0000-000000000003', 'poll-member-b@example.com',  'Membre B Vote',  'FR', true)
ON CONFLICT (id) DO NOTHING;

-- ── memberships actives (club E2E) ──────────────────────────────────────────
INSERT INTO memberships (user_id, club_id, role, status, joined_at)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'president', 'active', '2024-01-01'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'member',    'active', '2024-01-01'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'member',    'active', '2024-01-01')
ON CONFLICT (user_id, club_id) DO NOTHING;

-- ── polls ───────────────────────────────────────────────────────────────────
-- 1. yes_no OPEN, live (bannière dashboard + has_voted)
-- 2. single_choice OPEN, after_close
-- 3. multiple_choice OPEN, after_close
-- 4. short_text OPEN, live
-- 5. single_choice CLOSED, live (résultats agrégés visibles)
INSERT INTO public.polls
  (id, club_id, title, description, question_type, options, results_visibility, status, closes_at, created_by)
VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Faut-il investir dans une nouvelle ligne tech ?', 'Vote indicatif du club.',
   'yes_no', NULL, 'live', 'open', now() + interval '7 days',
   'cccccccc-0000-0000-0000-000000000001'),

  ('dddddddd-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Quel secteur privilégier au prochain trimestre ?', NULL,
   'single_choice',
   '[{"id":"tech","label":"Tech"},{"id":"energie","label":"Énergie"},{"id":"sante","label":"Santé"}]'::jsonb,
   'after_close', 'open', now() + interval '7 days',
   'cccccccc-0000-0000-0000-000000000001'),

  ('dddddddd-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Quels formats de réunion vous conviennent ?', NULL,
   'multiple_choice',
   '[{"id":"presentiel","label":"Présentiel"},{"id":"visio","label":"Visio"},{"id":"hybride","label":"Hybride"}]'::jsonb,
   'after_close', 'open', now() + interval '7 days',
   'cccccccc-0000-0000-0000-000000000001'),

  ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Une suggestion pour améliorer le club ?', 'Réponse anonyme, visible de l''équipe.',
   'short_text', NULL, 'live', 'open', NULL,
   'cccccccc-0000-0000-0000-000000000001'),

  ('dddddddd-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001',
   'Approuvez-vous le rapport annuel ?', NULL,
   'single_choice',
   '[{"id":"oui","label":"Oui"},{"id":"non","label":"Non"}]'::jsonb,
   'live', 'closed', now() - interval '1 day',
   'cccccccc-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── poll_responses ──────────────────────────────────────────────────────────
-- Vote 1 (yes_no live) : Membre A a voté "yes" → has_voted(A)=true, has_voted(B)=false.
--   NB : pour question_type='yes_no', les valeurs canoniques sont 'yes' | 'no' | 'abstain'
--   (ids émis par PollVoteSheet et mappés en libellés localisés par yesNoLabel côté web).
-- Vote 5 (closed, single_choice) : 3 réponses (options 'oui'/'non' définies dans son jsonb).
INSERT INTO public.poll_responses (poll_id, user_id, selected_options, text_response)
VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', ARRAY['yes'], NULL),

  ('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000001', ARRAY['oui'], NULL),
  ('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000002', ARRAY['oui'], NULL),
  ('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003', ARRAY['non'], NULL)
ON CONFLICT (poll_id, user_id) DO NOTHING;
