-- Assertions OPS-101 / OPS-102 / OPS-103 — exécutées sur la DB locale après `make db-reset`.
-- Lancer : psql "$DB_URL" -v ON_ERROR_STOP=1 -f <ce fichier>
-- Tout échec d'assertion lève une exception → psql sort non-zéro.
-- Les fixtures vivent dans une transaction unique ROLLBACK à la fin (aucune persistance).
-- Les tests RLS simulent un rôle `authenticated` + auth.uid() via request.jwt.claims.

\set ON_ERROR_STOP on
\timing off
SET client_min_messages = notice;

BEGIN;

-- ── Fixtures ──────────────────────────────────────────────────────────────────
INSERT INTO public.clubs (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', 'Club A chk', 'club-a-chk'),
       ('22222222-2222-2222-2222-222222222222', 'Club B chk', 'club-b-chk');

INSERT INTO public.users (id, email, full_name)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a-chk@test.dev', 'ALICE Chk'),
       ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b-chk@test.dev', 'BOB Chk');

-- Alice = membre actif de Club A ; Bob = membre actif de Club B.
INSERT INTO public.memberships (id, user_id, club_id, role, status, joined_at)
VALUES ('a0000000-0000-0000-0000-0000000000a1',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111', 'member', 'active', '2020-01-01'),
       ('b0000000-0000-0000-0000-0000000000b1',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222', 'member', 'active', '2020-01-01');

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-101 (c) dividend_stock avec cash_delta != 0 → violation CHECK
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    INSERT INTO public.operations (club_id, type, symbol, cash_delta, operation_date)
    VALUES ('11111111-1111-1111-1111-111111111111', 'dividend_stock', 'AAPL', 10.0, '2024-01-01');
    RAISE EXCEPTION 'FAIL (c): dividend_stock cash_delta!=0 aurait dû violer le CHECK';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK  (c): dividend_stock cash_delta!=0 → check_violation';
  END;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-101 (d) contribution sans membership_id → violation
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    INSERT INTO public.operations (club_id, type, cash_delta, operation_date)
    VALUES ('11111111-1111-1111-1111-111111111111', 'contribution', 100.0, '2024-01-01');
    RAISE EXCEPTION 'FAIL (d): contribution sans membership_id aurait dû violer le CHECK';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK  (d): contribution sans membership_id → check_violation';
  END;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-101 (e) buy sans symbol → violation
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    INSERT INTO public.operations (club_id, type, cash_delta, operation_date)
    VALUES ('11111111-1111-1111-1111-111111111111', 'buy', -500.0, '2024-01-01');
    RAISE EXCEPTION 'FAIL (e): buy sans symbol aurait dû violer le CHECK';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK  (e): buy sans symbol → check_violation';
  END;
END $$;

-- Sanity : un INSERT valide (via owner/service-role implicite ici) passe + sera lu après.
INSERT INTO public.operations
  (id, club_id, membership_id, type, symbol, cash_delta, operation_date, status, is_cancelled)
VALUES
  ('0c000000-0000-0000-0000-0000000000a1'::uuid,
   '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-0000000000a1',
   'contribution', NULL, 100.0, '2024-01-01', 'confirmed', FALSE),
  -- opération annulée → ignorée par le solde
  ('0c000000-0000-0000-0000-0000000000a2'::uuid,
   '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-0000000000a1',
   'contribution', NULL, 999.0, '2024-01-02', 'confirmed', TRUE),
  -- opération pending → ignorée par le solde
  ('0c000000-0000-0000-0000-0000000000a3'::uuid,
   '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-0000000000a1',
   'contribution', NULL, 50.0, '2024-01-03', 'pending', FALSE),
  -- achat de titre confirmé : sortie de cash (symbol requis par le CHECK)
  ('0c000000-0000-0000-0000-0000000000a4'::uuid,
   '11111111-1111-1111-1111-111111111111',
   NULL, 'buy', 'AAPL', -30.0, '2024-01-04', 'confirmed', FALSE);

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-103 (service_role / owner path) : 100 - 30 = 70 ; ignore cancelled & pending.
-- En tant que superuser (auth.uid() NULL), la garde laisse passer.
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE v numeric;
BEGIN
  SELECT public.get_club_cash_balance('11111111-1111-1111-1111-111111111111') INTO v;
  IF v <> 70.0 THEN
    RAISE EXCEPTION 'FAIL (103 solde): attendu 70.0, obtenu %', v;
  END IF;
  RAISE NOTICE 'OK  (103 solde): 70.0 (ignore cancelled & pending)';
END $$;

-- club vide → 0 (jamais NULL)
DO $$
DECLARE v numeric;
BEGIN
  SELECT public.get_club_cash_balance('22222222-2222-2222-2222-222222222222') INTO v;
  IF v IS NULL OR v <> 0 THEN
    RAISE EXCEPTION 'FAIL (103 vide): attendu 0, obtenu %', v;
  END IF;
  RAISE NOTICE 'OK  (103 vide): 0 (jamais NULL)';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-101 (b) INSERT direct par un rôle `authenticated` → 42501 (droit absent).
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.operations (club_id, membership_id, type, cash_delta, operation_date)
    VALUES ('11111111-1111-1111-1111-111111111111',
            'a0000000-0000-0000-0000-0000000000a1', 'contribution', 1.0, '2024-02-01');
    RESET ROLE;
    RAISE EXCEPTION 'FAIL (b): INSERT authenticated aurait dû être refusé (42501)';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'OK  (b): INSERT authenticated → 42501 insufficient_privilege';
  END;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-101 RLS SELECT : Alice (membre actif Club A) voit les opérations de Club A.
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.operations
   WHERE club_id = '11111111-1111-1111-1111-111111111111';
  RESET ROLE;
  IF n <> 4 THEN
    RAISE EXCEPTION 'FAIL (RLS Alice/A): attendu 4 lignes visibles, obtenu %', n;
  END IF;
  RAISE NOTICE 'OK  (RLS): Alice voit les 4 opérations de Club A';
END $$;

-- Bob (membre Club B) ne voit AUCUNE opération de Club A.
DO $$
DECLARE n int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.operations
   WHERE club_id = '11111111-1111-1111-1111-111111111111';
  RESET ROLE;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL (RLS Bob/A): attendu 0 ligne, obtenu %', n;
  END IF;
  RAISE NOTICE 'OK  (RLS): Bob ne voit aucune opération de Club A';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-103 garde : un membre d'un autre club → 42501.
-- Bob (Club B) interroge le solde de Club A.
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.get_club_cash_balance('11111111-1111-1111-1111-111111111111');
    RESET ROLE;
    RAISE EXCEPTION 'FAIL (103 garde): Bob aurait dû être refusé (42501) sur Club A';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'OK  (103 garde): membre autre club → 42501';
  END;
END $$;

-- Alice (membre Club A) lit le solde de SON club sans erreur.
DO $$
DECLARE v numeric;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT public.get_club_cash_balance('11111111-1111-1111-1111-111111111111') INTO v;
  RESET ROLE;
  IF v <> 70.0 THEN
    RAISE EXCEPTION 'FAIL (103 Alice): attendu 70.0, obtenu %', v;
  END IF;
  RAISE NOTICE 'OK  (103 Alice): membre du club lit son solde = 70.0';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- OPS-102 : memberships.parts existe, type numeric(18,8), default 0.
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE v_default text; v_type text; v_parts numeric;
BEGIN
  SELECT data_type, column_default INTO v_type, v_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'parts';
  IF v_type IS NULL THEN
    RAISE EXCEPTION 'FAIL (102): colonne memberships.parts absente';
  END IF;
  -- valeur par défaut effective sur une ligne existante
  SELECT parts INTO v_parts FROM public.memberships
   WHERE id = 'a0000000-0000-0000-0000-0000000000a1';
  IF v_parts <> 0 THEN
    RAISE EXCEPTION 'FAIL (102): default parts attendu 0, obtenu %', v_parts;
  END IF;
  RAISE NOTICE 'OK  (102): memberships.parts présent (% , default %), valeur 0', v_type, v_default;
END $$;

\echo '════════════════════════════════════════════'
\echo 'TOUTES LES ASSERTIONS OPS-101/102/103 = OK'
\echo '════════════════════════════════════════════'

ROLLBACK;
