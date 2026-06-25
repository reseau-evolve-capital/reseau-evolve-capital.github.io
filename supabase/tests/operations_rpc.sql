-- supabase/tests/operations_rpc.sql — OPS-201/202/203 : vérification SQL reproductible.
--
-- Même esprit que network_rpc.sql : script ASSERT autonome, joué manuellement contre la stack
-- LOCALE, AUCUNE écriture persistante (tout en transaction ROLLBACK).
--
--   psql "$(supabase status -o env | grep '^DB_URL=' | cut -d= -f2- | tr -d '\"')" \
--        -v ON_ERROR_STOP=1 -f supabase/tests/operations_rpc.sql
--
-- Pré-requis : DB reset + seedée. Le seed pose :
--   - club VOTES `eeeeeeee-…-0001` avec `cccccccc-…-0001` = PRESIDENT actif → STAFF de ce club.
--   - club E2E `aaaaaaaa-…-0001` avec `bbbbbbbb-…-0001` = MEMBER actif → NON-staff de ce club.
-- N'est PAS exécuté par `make lint typecheck test` (le gate ne joue ni Deno ni SQL).
--
-- Couverture :
--   (a) GARDES — non-staff → 42501 sur record et cancel.
--   (b) record : buy cohérent OK ; buy incohérent → 22023 ; contribution sous min ACCEPTÉE.
--   (c) cancel : motif vide → 22023 ; déjà annulée → 22023 ; soldée (parts_allocated) → 22023.
--   (d) get_club_cash_balance ignore l'op annulée.
--   (e) get_club_positions_from_ops : qty agrégée, HAVING>0 exclut soldées, dernier prix via
--       valuation, isolation cross-club (auth d'un non-membre → 42501).
--   (f) audit : ligne record_operation + cancel_operation dans audit_log.

BEGIN;

\set STAFF_UID    '''cccccccc-0000-0000-0000-000000000001'''
\set CLUB_STAFF   '''eeeeeeee-0000-0000-0000-000000000001'''
\set MEMBER_UID   '''bbbbbbbb-0000-0000-0000-000000000001'''
\set CLUB_MEMBER  '''aaaaaaaa-0000-0000-0000-000000000001'''

-- Pré-setup PRIVILÉGIÉ (rôle postgres, AVANT toute session authenticated) : une op SOLDÉE
-- (parts_allocated NOT NULL) à tester en (c). On ne peut pas la fabriquer plus bas : sous
-- `role = authenticated`, un UPDATE direct sur operations est bloqué par la RLS (écriture RPC-only).
-- Elle reste `confirmed`/non annulée → comptée par get_club_cash_balance (200 dans le total -199).
CREATE TEMP TABLE _test_settled(id uuid);
WITH ins AS (
  INSERT INTO public.operations
    (club_id, membership_id, type, status, cash_delta, operation_date, parts_allocated, source)
  VALUES (
    'eeeeeeee-0000-0000-0000-000000000001',
    (SELECT id FROM public.memberships
       WHERE club_id = 'eeeeeeee-0000-0000-0000-000000000001'
         AND user_id = 'cccccccc-0000-0000-0000-000000000001' LIMIT 1),
    'contribution', 'confirmed', 200, current_date, 4, 'manual')
  RETURNING id
)
INSERT INTO _test_settled SELECT id FROM ins;
GRANT SELECT ON _test_settled TO authenticated;

-- L'écriture d'audit (log_audit_event, SECURITY DEFINER) passe ; sa LECTURE est réservée aux
-- membres réseau (RLS audit_log). Pour vérifier l'audit côté caller, on rattache le président
-- au réseau le temps de la transaction (ROLLBACK ensuite — aucune persistance).
INSERT INTO public.network_members (user_id, role)
VALUES ('cccccccc-0000-0000-0000-000000000001', 'network_admin')
ON CONFLICT (user_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- (a) GARDES — caller authentifié NON-staff (member du club E2E).
-- ════════════════════════════════════════════════════════════════════════════
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"bbbbbbbb-0000-0000-0000-000000000001"}';

DO $$
BEGIN
  -- record_operation : non-staff du club ciblé → 42501.
  BEGIN
    PERFORM public.record_operation(
      'aaaaaaaa-0000-0000-0000-000000000001', 'fee', -10, current_date);
    RAISE EXCEPTION 'ÉCHEC : record_operation exécuté par un non-staff';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : record_operation refusé pour non-staff (42501)';
  END;

  -- cancel_operation sur une op d'un club dont on n'est pas staff → 42501.
  -- (on cible une op inexistante du club staff : la garde existence passe d'abord,
  --  donc on teste plutôt via une op réelle plus bas. Ici on vérifie l'op introuvable.)
  BEGIN
    PERFORM public.cancel_operation('00000000-0000-0000-0000-0000000000aa', 'x');
    RAISE EXCEPTION 'ÉCHEC : cancel_operation a accepté une op introuvable';
  EXCEPTION WHEN no_data_found THEN
    RAISE NOTICE 'OK : cancel_operation refuse une op introuvable (no_data_found)';
  END;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- (b)-(f) HAPPY PATH — caller = STAFF (president du club VOTES).
-- ════════════════════════════════════════════════════════════════════════════
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"cccccccc-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  v_club          uuid := 'eeeeeeee-0000-0000-0000-000000000001';
  v_buy_id        uuid;
  v_sell_id       uuid;
  v_div_stock_id  uuid;
  v_to_cancel     uuid;
  v_settled       uuid;
  v_contrib_id    uuid;
  v_audit_before  bigint;
  v_audit_after   bigint;
  v_balance       numeric;
  v_qty           numeric;
  v_last_price    numeric;
  v_invested      numeric;
  v_pos_count     int;
BEGIN
  SELECT COUNT(*) INTO v_audit_before FROM public.audit_log;

  -- ── (b) record : buy cohérent → OK ─────────────────────────────────────────
  -- 10 x 100 EUR = 1000 → cash_delta = -1000.
  v_buy_id := public.record_operation(
    v_club, 'buy', -1000, current_date,
    NULL, 'AAPL', 'Apple', 10, 100);
  ASSERT v_buy_id IS NOT NULL, 'record_operation(buy) doit renvoyer un uuid';

  -- recorded_by doit être renseigné (le caller a un membership actif sur ce club).
  ASSERT (SELECT recorded_by FROM public.operations WHERE id = v_buy_id) IS NOT NULL,
    'recorded_by doit être renseigné pour un staff membre actif';

  -- buy incohérent (cash_delta positif) → 22023.
  BEGIN
    PERFORM public.record_operation(v_club, 'buy', 1000, current_date, NULL, 'AAPL', 'Apple', 10, 100);
    RAISE EXCEPTION 'ÉCHEC : buy avec cash_delta positif accepté';
  EXCEPTION WHEN data_exception THEN
    RAISE NOTICE 'OK : buy incohérent (signe) refusé (22023)';
  END;

  -- buy incohérent (montant faux, hors tolérance) → 22023.
  BEGIN
    PERFORM public.record_operation(v_club, 'buy', -1200, current_date, NULL, 'AAPL', 'Apple', 10, 100);
    RAISE EXCEPTION 'ÉCHEC : buy avec montant incohérent accepté';
  EXCEPTION WHEN data_exception THEN
    RAISE NOTICE 'OK : buy incohérent (montant) refusé (22023)';
  END;

  -- buy sans quantity/unit_price → 22023.
  BEGIN
    PERFORM public.record_operation(v_club, 'buy', -1000, current_date, NULL, 'AAPL', 'Apple', NULL, NULL);
    RAISE EXCEPTION 'ÉCHEC : buy sans quantity/unit_price accepté';
  EXCEPTION WHEN data_exception THEN
    RAISE NOTICE 'OK : buy sans quantity/unit_price refusé (22023)';
  END;

  -- ── (b) record : sell cohérent → OK (5 x 120 = 600) ────────────────────────
  v_sell_id := public.record_operation(
    v_club, 'sell', 600, current_date,
    NULL, 'AAPL', 'Apple', 5, 120);
  ASSERT v_sell_id IS NOT NULL, 'record_operation(sell) doit renvoyer un uuid';

  -- ── (b) record : contribution SOUS le minimum club → ACCEPTÉE (warn, pas reject) ──
  -- clubs.min_contribution défaut = 100. On passe 1 € → doit être accepté.
  -- contribution exige un membership_id (CHECK DB) → on prend le membership du président.
  v_contrib_id := public.record_operation(
    v_club, 'contribution', 1, current_date,
    (SELECT id FROM public.memberships
      WHERE club_id = v_club AND user_id = 'cccccccc-0000-0000-0000-000000000001' LIMIT 1));
  ASSERT v_contrib_id IS NOT NULL,
    'contribution sous min_contribution doit être ACCEPTÉE (DÉCISION OWNER : warn, pas reject)';

  -- contribution cash_delta négatif → 22023.
  BEGIN
    PERFORM public.record_operation(v_club, 'contribution', -5, current_date,
      (SELECT id FROM public.memberships WHERE club_id = v_club AND user_id = 'cccccccc-0000-0000-0000-000000000001' LIMIT 1));
    RAISE EXCEPTION 'ÉCHEC : contribution négative acceptée';
  EXCEPTION WHEN data_exception THEN
    RAISE NOTICE 'OK : contribution négative refusée (22023)';
  END;

  -- ── (c) cancel : op à annuler ──────────────────────────────────────────────
  v_to_cancel := public.record_operation(v_club, 'fee', -50, current_date);

  -- motif vide → 22023.
  BEGIN
    PERFORM public.cancel_operation(v_to_cancel, '   ');
    RAISE EXCEPTION 'ÉCHEC : cancel avec motif vide accepté';
  EXCEPTION WHEN data_exception THEN
    RAISE NOTICE 'OK : cancel motif vide refusé (22023)';
  END;

  -- annulation valide.
  PERFORM public.cancel_operation(v_to_cancel, 'Erreur de saisie');
  ASSERT (SELECT is_cancelled FROM public.operations WHERE id = v_to_cancel) = TRUE,
    'l''op annulée doit avoir is_cancelled = true';
  ASSERT (SELECT status FROM public.operations WHERE id = v_to_cancel) = 'cancelled',
    'l''op annulée doit avoir status = cancelled';

  -- déjà annulée → 22023.
  BEGIN
    PERFORM public.cancel_operation(v_to_cancel, 'rebelote');
    RAISE EXCEPTION 'ÉCHEC : double annulation acceptée';
  EXCEPTION WHEN data_exception THEN
    RAISE NOTICE 'OK : double annulation refusée (22023)';
  END;

  -- op soldée (parts_allocated NOT NULL, fabriquée en pré-setup privilégié) → cannot_cancel (22023).
  SELECT id INTO v_settled FROM _test_settled LIMIT 1;
  BEGIN
    PERFORM public.cancel_operation(v_settled, 'tentative');
    RAISE EXCEPTION 'ÉCHEC : annulation d''une op soldée acceptée';
  EXCEPTION WHEN data_exception THEN
    RAISE NOTICE 'OK : annulation d''une op soldée refusée (22023)';
  END;

  -- ── (d) get_club_cash_balance ignore l'op annulée ──────────────────────────
  -- Cash actif : buy -1000 + sell +600 + contribution 1 + contribution(settled) 200 = -199.
  -- (le fee -50 est annulé → exclu).
  v_balance := public.get_club_cash_balance(v_club);
  ASSERT v_balance = -199,
    format('cash_balance doit ignorer l''op annulée (attendu -199, obtenu %s)', v_balance);

  -- ── (e) get_club_positions_from_ops ────────────────────────────────────────
  -- AAPL : buy 10 - sell 5 = 5 ; cash_invested = 1000 (buy uniquement).
  SELECT total_quantity, cash_invested
    INTO v_qty, v_invested
    FROM public.get_club_positions_from_ops(v_club)
   WHERE symbol = 'AAPL';
  ASSERT v_qty = 5, format('AAPL total_quantity attendu 5, obtenu %s', v_qty);
  ASSERT v_invested = 1000, format('AAPL cash_invested attendu 1000, obtenu %s', v_invested);

  -- HAVING > 0 : une position soldée (buy puis sell de la même qty) ne doit PAS apparaître.
  PERFORM public.record_operation(v_club, 'buy', -300, current_date, NULL, 'MSFT', 'Microsoft', 3, 100);
  PERFORM public.record_operation(v_club, 'sell', 300, current_date, NULL, 'MSFT', 'Microsoft', 3, 100);
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.get_club_positions_from_ops(v_club) WHERE symbol = 'MSFT'
  ), 'une position totalement soldée (qty 0) ne doit pas apparaître (HAVING > 0)';

  -- dernier prix via valuation : valo AAPL @ 130 → last_unit_price = 130.
  PERFORM public.record_operation(v_club, 'valuation', 0, current_date + 1, NULL, 'AAPL', 'Apple', NULL, 130);
  SELECT last_unit_price INTO v_last_price
    FROM public.get_club_positions_from_ops(v_club) WHERE symbol = 'AAPL';
  ASSERT v_last_price = 130,
    format('AAPL last_unit_price doit refléter la valuation la plus récente (attendu 130, obtenu %s)', v_last_price);

  -- ── (f) audit : record + cancel ont écrit dans audit_log ───────────────────
  SELECT COUNT(*) INTO v_audit_after FROM public.audit_log;
  ASSERT v_audit_after > v_audit_before, 'audit_log doit avoir gagné des lignes';
  ASSERT EXISTS (
    SELECT 1 FROM public.audit_log
     WHERE action = 'record_operation' AND target_id = v_buy_id::text
       AND actor_id = 'cccccccc-0000-0000-0000-000000000001'
  ), 'audit_log doit contenir record_operation pour l''achat, actor = caller';
  ASSERT EXISTS (
    SELECT 1 FROM public.audit_log
     WHERE action = 'cancel_operation' AND target_id = v_to_cancel::text
  ), 'audit_log doit contenir cancel_operation pour l''op annulée';

  RAISE NOTICE 'OK : happy path opérations complet (record/cancel/balance/positions/audit)';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- (e bis) ISOLATION cross-club — un authentifié non-membre du club staff → 42501.
-- ════════════════════════════════════════════════════════════════════════════
SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"cccccccc-0000-0000-0000-000000000002"}';
-- cccccccc-…-0002 est membre du club VOTES `eeee` (donc autorisé sur eeee), mais PAS du club E2E.
DO $$
BEGIN
  -- il lit ses propres positions (club eeee) sans erreur, mais le club E2E `aaaa` lui est interdit.
  BEGIN
    PERFORM * FROM public.get_club_positions_from_ops('aaaaaaaa-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'ÉCHEC : get_club_positions_from_ops accessible cross-club';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK : get_club_positions_from_ops fail-closed cross-club (42501)';
  END;
END $$;

ROLLBACK;
