-- OPS-105 — Fixtures de convergence migration legacy → operations (cahier §6.2).
--
-- BUT : prouver le MÉCANISME de convergence sur 2 clubs contrôlés (la DB locale ne contient
--   PAS les 4 vrais clubs de prod → le delta €-réel se valide en PROD, cf. rapport).
--
-- Ce script SÈME les 2 fixtures EN DUR (NON transactionnel, persistant) pour que l'Edge
--   `migrate-to-operations` puisse être appelée dessus via HTTP (service-role), puis re-relire
--   les deltas. Idempotent : il purge d'abord ses propres clubs fixtures avant de réinsérer.
--
-- Fixtures :
--   • Club CONVERGENT (cccc1111-…) : Espèces Matrice == somme attendue des cash_delta → delta 0.
--   • Club OUVERTURE  (cccc2222-…) : Espèces Matrice == somme + 5000 € (apport initial absent
--     du legacy) → delta +5000 €, NON nul, À DOCUMENTER (cas prévu par la décision owner).
--
-- Données legacy identiques sur les 2 clubs :
--   contributions payées : +100 +150 +200            = +450
--   buy  AAPL 10 @ 50  → -(10×50)                     = -500
--   sell MSFT 5 @ 40   → +(5×40)                       = +200
--   dividend (total 30)→ +30                           = +30
--   ─────────────────────────────────────────────────────────
--   Σ cash_delta attendu                              = +180  (= Espèces du club CONVERGENT)
--
-- Lancer : psql "$DB_URL" -v ON_ERROR_STOP=1 -f <ce fichier>

\set ON_ERROR_STOP on

-- ── Purge idempotente (les FK ON DELETE CASCADE nettoient le reste) ────────────
DELETE FROM public.clubs WHERE id IN (
  'cccc1111-0000-0000-0000-000000000001',
  'cccc2222-0000-0000-0000-000000000001'
);

-- ── Clubs fixtures (is_active + sheet_id : respectent DEC-001 de sélection prod) ─
INSERT INTO public.clubs (id, name, slug, is_active, sheet_id) VALUES
  ('cccc1111-0000-0000-0000-000000000001', 'Club CONVERGENT OPS-105', 'club-convergent-ops105', TRUE, 'sheet-conv-ops105'),
  ('cccc2222-0000-0000-0000-000000000001', 'Club OUVERTURE OPS-105',  'club-ouverture-ops105',  TRUE, 'sheet-ouv-ops105');

-- ── Utilisateurs + memberships (membership_id requis par les cotisations) ──────
INSERT INTO public.users (id, email, full_name) VALUES
  ('c1aac1aa-0000-0000-0000-000000000001', 'conv-membre@ops105.test', 'CONV Membre'),
  ('c2aac2aa-0000-0000-0000-000000000001', 'ouv-membre@ops105.test',  'OUV Membre')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.memberships (id, user_id, club_id, role, status, joined_at) VALUES
  ('c1eec1ee-0000-0000-0000-000000000001',
   'c1aac1aa-0000-0000-0000-000000000001',
   'cccc1111-0000-0000-0000-000000000001', 'member', 'active', '2020-01-01'),
  ('c2eec2ee-0000-0000-0000-000000000001',
   'c2aac2aa-0000-0000-0000-000000000001',
   'cccc2222-0000-0000-0000-000000000001', 'member', 'active', '2020-01-01');

-- ── contribution_months PAYÉES (status='paid', paid_at IS NOT NULL) ────────────
--   3 lignes / club : 100 + 150 + 200 = +450.
INSERT INTO public.contribution_months
  (membership_id, club_id, year, month, amount, status, paid_at, synced_at)
VALUES
  -- CONVERGENT
  ('c1eec1ee-0000-0000-0000-000000000001','cccc1111-0000-0000-0000-000000000001', 2023, 1, 100.00, 'paid', '2023-01-15', now()),
  ('c1eec1ee-0000-0000-0000-000000000001','cccc1111-0000-0000-0000-000000000001', 2023, 2, 150.00, 'paid', '2023-02-15', now()),
  ('c1eec1ee-0000-0000-0000-000000000001','cccc1111-0000-0000-0000-000000000001', 2023, 3, 200.00, 'paid', '2023-03-15', now()),
  -- une cotisation DUE (non payée) → ne DOIT PAS être migrée (filtre status='paid')
  ('c1eec1ee-0000-0000-0000-000000000001','cccc1111-0000-0000-0000-000000000001', 2023, 4, 999.00, 'due',  NULL,         now()),
  -- OUVERTURE (mêmes montants payés)
  ('c2eec2ee-0000-0000-0000-000000000001','cccc2222-0000-0000-0000-000000000001', 2023, 1, 100.00, 'paid', '2023-01-15', now()),
  ('c2eec2ee-0000-0000-0000-000000000001','cccc2222-0000-0000-0000-000000000001', 2023, 2, 150.00, 'paid', '2023-02-15', now()),
  ('c2eec2ee-0000-0000-0000-000000000001','cccc2222-0000-0000-0000-000000000001', 2023, 3, 200.00, 'paid', '2023-03-15', now());

-- ── transactions (HISTORIQUE) ──────────────────────────────────────────────────
--   buy AAPL 10@50 = -500 ; sell MSFT 5@40 = +200 ; dividend 30 = +30 → Σ = -270.
INSERT INTO public.transactions
  (club_id, type, symbol, name, quantity, price, total, transaction_date, synced_at)
VALUES
  -- CONVERGENT
  ('cccc1111-0000-0000-0000-000000000001', 'buy',      'AAPL', 'Apple',     10, 50.00, 500.00, '2023-04-01', now()),
  ('cccc1111-0000-0000-0000-000000000001', 'sell',     'MSFT', 'Microsoft',  5, 40.00, 200.00, '2023-05-01', now()),
  ('cccc1111-0000-0000-0000-000000000001', 'dividend', 'AAPL', 'Apple',   NULL,  NULL,  30.00, '2023-06-01', now()),
  -- OUVERTURE (identique)
  ('cccc2222-0000-0000-0000-000000000001', 'buy',      'AAPL', 'Apple',     10, 50.00, 500.00, '2023-04-01', now()),
  ('cccc2222-0000-0000-0000-000000000001', 'sell',     'MSFT', 'Microsoft',  5, 40.00, 200.00, '2023-05-01', now()),
  ('cccc2222-0000-0000-0000-000000000001', 'dividend', 'AAPL', 'Apple',   NULL,  NULL,  30.00, '2023-06-01', now());

-- ── portfolio_aggregates : ligne « Espèces » (= solde liquidité legacy lu par l'app) ──
--   CONVERGENT : 180.00 == Σ cash_delta attendu (+450 -500 +200 +30) → delta 0.
--   OUVERTURE  : 5180.00 == Σ + 5000 (apport initial absent du legacy) → delta +5000.
INSERT INTO public.portfolio_aggregates (club_id, label, market_value, is_active, synced_at) VALUES
  ('cccc1111-0000-0000-0000-000000000001', 'Espèces',  180.00, TRUE, now()),
  ('cccc2222-0000-0000-0000-000000000001', 'Espèces', 5180.00, TRUE, now());

\echo '════════════════════════════════════════════'
\echo 'Fixtures OPS-105 semées (CONVERGENT + OUVERTURE).'
\echo '════════════════════════════════════════════'
