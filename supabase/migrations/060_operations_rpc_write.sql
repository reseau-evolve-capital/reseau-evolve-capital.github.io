-- 060_operations_rpc_write.sql — Saisie trésorier d'opérations (OPS-201/202/203).
--
-- QUOI : 3 RPC d'écriture/lecture sur public.operations (table 057), source de vérité de la
--   trésorerie et des positions d'un club. Écriture RPC-only (la table n'accorde ni INSERT ni
--   UPDATE à `authenticated` — cf. 057) : ces fonctions SECURITY DEFINER sont le SEUL chemin
--   d'écriture côté app, derrière une garde staff fail-closed.
--
--   1) record_operation       — enregistre une opération (cotisation, achat, vente, dividende, …).
--   2) cancel_operation       — annule (soft) une opération non soldée, motif obligatoire.
--   3) get_club_positions_from_ops — positions titres agrégées depuis le journal d'opérations.
--
-- SÉCURITÉ : toutes en SECURITY DEFINER (bypass RLS) → garde explicite en tête.
--   - record/cancel : is_club_staff(club_id) → 42501 sinon (trésorier/président/network_admin).
--   - get_club_positions_from_ops : lecture fail-closed (membre du club) ; service_role autorisé.
--   actor_id de l'audit = auth.uid() EN INTERNE (log_audit_event, 053) — jamais un paramètre.
--
-- DÉCISIONS OWNER :
--   - DEC contribution : un montant < clubs.min_contribution n'est PAS refusé par la RPC
--     (l'UI avertit, la RPC accepte). AUCUNE validation min_contribution ici.
--
-- Réf : 057 (operations + CHECKs DB), 059 (get_club_cash_balance, style garde lecture),
--   028 (is_club_staff fail-closed), 050 (get_user_club_ids), 053 (log_audit_event), 033 (min_contribution).

-- ════════════════════════════════════════════════════════════════════════════
-- 1) record_operation — enregistre une opération confirmée. RETURNS l'id créé.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.record_operation(
  p_club_id       uuid,
  p_type          text,
  p_cash_delta    numeric,
  p_operation_date date,
  p_membership_id uuid     DEFAULT NULL,
  p_symbol        text     DEFAULT NULL,
  p_asset_name    text     DEFAULT NULL,
  p_quantity      numeric  DEFAULT NULL,
  p_unit_price    numeric  DEFAULT NULL,
  p_currency      char(3)  DEFAULT 'EUR',
  p_fx_rate       numeric  DEFAULT 1.0,
  p_notes         text     DEFAULT NULL,
  p_broker_ref    text     DEFAULT NULL,
  p_metadata      jsonb    DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_id            uuid;
  v_recorded_by   uuid;
  v_expected      numeric;
BEGIN
  -- Garde staff fail-closed (28). NULL → false → refus.
  IF NOT public.is_club_staff(p_club_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  -- Validation cohérence montant/sens par type. Les autres CHECK (dividend_stock=0,
  -- valuation=0, membership/symbol requis) sont déjà posés en DB (057) et remontent proprement.
  IF p_type = 'buy' THEN
    IF p_quantity IS NULL OR p_unit_price IS NULL THEN
      RAISE EXCEPTION 'buy requires quantity and unit_price' USING ERRCODE = '22023';
    END IF;
    v_expected := -ROUND(p_quantity * p_unit_price * COALESCE(p_fx_rate, 1.0), 4);
    IF p_cash_delta >= 0 OR ABS(p_cash_delta - v_expected) > 0.01 THEN
      RAISE EXCEPTION 'buy cash_delta must equal -(quantity*unit_price*fx_rate) and be negative (expected %)', v_expected
        USING ERRCODE = '22023';
    END IF;

  ELSIF p_type = 'sell' THEN
    IF p_quantity IS NULL OR p_unit_price IS NULL THEN
      RAISE EXCEPTION 'sell requires quantity and unit_price' USING ERRCODE = '22023';
    END IF;
    v_expected := ROUND(p_quantity * p_unit_price * COALESCE(p_fx_rate, 1.0), 4);
    IF p_cash_delta <= 0 OR ABS(p_cash_delta - v_expected) > 0.01 THEN
      RAISE EXCEPTION 'sell cash_delta must equal +(quantity*unit_price*fx_rate) and be positive (expected %)', v_expected
        USING ERRCODE = '22023';
    END IF;

  ELSIF p_type = 'contribution' THEN
    -- Une cotisation est une entrée de trésorerie : cash_delta strictement positif.
    -- DÉCISION OWNER : NE PAS comparer à clubs.min_contribution (l'UI avertit, la RPC accepte).
    IF p_cash_delta <= 0 THEN
      RAISE EXCEPTION 'contribution cash_delta must be positive' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Membership actif de l'appelant dans ce club (NULL si service_role sans session JWT).
  SELECT id INTO v_recorded_by
    FROM public.memberships
   WHERE club_id = p_club_id AND user_id = auth.uid() AND is_active = TRUE
   LIMIT 1;

  INSERT INTO public.operations (
    club_id, membership_id, type, status, cash_delta,
    symbol, asset_name, quantity, unit_price, currency, fx_rate,
    operation_date, recorded_by, source, broker_reference, notes, metadata
  ) VALUES (
    p_club_id, p_membership_id, p_type, 'confirmed', p_cash_delta,
    p_symbol, p_asset_name, p_quantity, p_unit_price, p_currency, COALESCE(p_fx_rate, 1.0),
    p_operation_date, v_recorded_by, 'manual', p_broker_ref, p_notes, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  PERFORM public.log_audit_event(
    'record_operation', 'operations', v_id::text,
    jsonb_build_object('type', p_type, 'cash_delta', p_cash_delta, 'club_id', p_club_id::text)
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_operation(uuid, text, numeric, date, uuid, text, text, numeric, numeric, char, numeric, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.record_operation(uuid, text, numeric, date, uuid, text, text, numeric, numeric, char, numeric, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_operation(uuid, text, numeric, date, uuid, text, text, numeric, numeric, char, numeric, text, text, jsonb) TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2) cancel_operation — annulation (soft) d'une opération non soldée.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cancel_operation(
  p_operation_id uuid,
  p_reason       text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_op           public.operations%ROWTYPE;
  v_cancelled_by uuid;
BEGIN
  SELECT * INTO v_op FROM public.operations WHERE id = p_operation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'operation_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_club_staff(v_op.club_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'cancellation_reason_required' USING ERRCODE = '22023';
  END IF;

  IF v_op.is_cancelled THEN
    RAISE EXCEPTION 'operation_already_cancelled' USING ERRCODE = '22023';
  END IF;

  -- Une opération déjà soldée (parts allouées) ne s'annule pas : passer par une correction.
  IF v_op.parts_allocated IS NOT NULL THEN
    RAISE EXCEPTION 'cannot_cancel_settled_operation: use a correction operation instead' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_cancelled_by
    FROM public.memberships
   WHERE club_id = v_op.club_id AND user_id = auth.uid() AND is_active = TRUE
   LIMIT 1;

  UPDATE public.operations
     SET is_cancelled        = TRUE,
         status              = 'cancelled',
         cancelled_at        = now(),
         cancelled_by        = v_cancelled_by,
         cancellation_reason = p_reason,
         updated_at          = now()
   WHERE id = p_operation_id;

  PERFORM public.log_audit_event(
    'cancel_operation', 'operations', p_operation_id::text,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_operation(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_operation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_operation(uuid, text) TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 3) get_club_positions_from_ops — positions titres agrégées depuis le journal.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_club_positions_from_ops(p_club_id uuid)
RETURNS TABLE (
  symbol          text,
  asset_name      text,
  currency        text,
  total_quantity  numeric,
  last_unit_price numeric,
  cash_invested   numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- Garde lecture fail-closed (cf. 059). service_role (auth.uid() NULL) autorisé.
  IF auth.uid() IS NOT NULL
     AND NOT (p_club_id IN (SELECT get_user_club_ids())) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    o.symbol,
    o.asset_name,
    o.currency::text,
    SUM(CASE o.type
          WHEN 'buy'            THEN o.quantity
          WHEN 'dividend_stock' THEN o.quantity
          WHEN 'sell'           THEN -o.quantity
          ELSE 0
        END) AS total_quantity,
    (SELECT lp.unit_price
       FROM public.operations lp
      WHERE lp.club_id = o.club_id
        AND lp.symbol = o.symbol
        AND lp.type IN ('buy', 'sell', 'valuation')
        AND lp.is_cancelled = FALSE
        AND lp.unit_price IS NOT NULL
      ORDER BY lp.operation_date DESC, lp.recorded_at DESC
      LIMIT 1) AS last_unit_price,
    SUM(CASE WHEN o.type = 'buy' THEN ABS(o.cash_delta) ELSE 0 END) AS cash_invested
  FROM public.operations o
  WHERE o.club_id = p_club_id
    AND o.is_cancelled = FALSE
    AND o.status = 'confirmed'
    AND o.symbol IS NOT NULL
  GROUP BY o.club_id, o.symbol, o.asset_name, o.currency
  HAVING SUM(CASE o.type
               WHEN 'buy'            THEN o.quantity
               WHEN 'dividend_stock' THEN o.quantity
               WHEN 'sell'           THEN -o.quantity
               ELSE 0
             END) > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.get_club_positions_from_ops(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_club_positions_from_ops(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_positions_from_ops(uuid) TO service_role;
