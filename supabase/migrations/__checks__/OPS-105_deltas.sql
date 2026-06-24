-- OPS-105 — Calcul des 3 deltas du cahier §6.2 (legacy vs operations) par club fixture.
-- À lancer APRÈS migrate-to-operations sur les 2 clubs fixtures. Lecture seule.
--   1) solde espèces : portfolio_aggregates 'especes' (legacy) vs get_club_cash_balance() (ops)
--   2) nb cotisations : contribution_months status='paid' (legacy) vs operations type='contribution'
--   3) nb transactions : transactions (legacy) vs operations type IN (buy,sell,dividend_cash)
-- Lancer : psql "$DB_URL" -f <ce fichier>

\pset border 2
\pset format aligned

WITH clubs_fx AS (
  SELECT 'cccc1111-0000-0000-0000-000000000001'::uuid AS club_id, 'CONVERGENT' AS nom
  UNION ALL
  SELECT 'cccc2222-0000-0000-0000-000000000001'::uuid, 'OUVERTURE'
),
-- 1) Solde espèces
cash AS (
  SELECT c.club_id, c.nom,
    -- legacy : market_value de l'agrégat dont le label normalisé = 'especes'
    (SELECT pa.market_value FROM public.portfolio_aggregates pa
      WHERE pa.club_id = c.club_id
        AND lower(translate(pa.label,'ÉÈÊËéèêëÀÂàâ','EEEEeeeeAAaa')) = 'especes'
      LIMIT 1) AS legacy_cash,
    public.get_club_cash_balance(c.club_id) AS ops_cash
  FROM clubs_fx c
),
-- 2) Cotisations
contrib AS (
  SELECT c.club_id,
    (SELECT count(*) FROM public.contribution_months cm
      WHERE cm.club_id = c.club_id AND cm.status = 'paid' AND cm.paid_at IS NOT NULL) AS legacy_contrib,
    (SELECT count(*) FROM public.operations o
      WHERE o.club_id = c.club_id AND o.type = 'contribution'
        AND o.is_cancelled = FALSE) AS ops_contrib
  FROM clubs_fx c
),
-- 3) Transactions boursières
tx AS (
  SELECT c.club_id,
    (SELECT count(*) FROM public.transactions t WHERE t.club_id = c.club_id) AS legacy_tx,
    (SELECT count(*) FROM public.operations o
      WHERE o.club_id = c.club_id
        AND o.type IN ('buy','sell','dividend_cash')
        AND o.is_cancelled = FALSE) AS ops_tx
  FROM clubs_fx c
)
SELECT
  cash.nom                                                AS club,
  'solde_especes'                                         AS metrique,
  to_char(cash.legacy_cash, 'FM999990.00')                AS legacy,
  to_char(cash.ops_cash,    'FM999990.00')                AS operations,
  to_char(cash.ops_cash - cash.legacy_cash, 'FM999990.00') AS delta,
  CASE WHEN abs(cash.ops_cash - cash.legacy_cash) <= 1 THEN 'OK (<= ±1 €)' ELSE 'ECART A DOCUMENTER' END AS statut
FROM cash
UNION ALL
SELECT cf.nom, 'nb_cotisations',
  ct.legacy_contrib::text, ct.ops_contrib::text,
  (ct.ops_contrib - ct.legacy_contrib)::text,
  CASE WHEN ct.ops_contrib = ct.legacy_contrib THEN 'OK' ELSE 'ECART' END
FROM contrib ct JOIN clubs_fx cf USING (club_id)
UNION ALL
SELECT cf.nom, 'nb_transactions',
  tx.legacy_tx::text, tx.ops_tx::text,
  (tx.ops_tx - tx.legacy_tx)::text,
  CASE WHEN tx.ops_tx = tx.legacy_tx THEN 'OK' ELSE 'ECART' END
FROM tx JOIN clubs_fx cf USING (club_id)
ORDER BY club, metrique;
