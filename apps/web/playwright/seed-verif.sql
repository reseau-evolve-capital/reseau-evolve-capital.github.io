-- =============================================================================
-- seed-verif.sql — Seed de VÉRIFICATION / QA MANUELLE (Club E2E)
-- =============================================================================
--
-- BUT
--   Peupler la base Supabase LOCALE pour vérifier au runtime (navigateur) les vues
--   qui n'apparaissaient qu'en empty/guard lors de l'audit :
--     - /portfolio        (table + donut 3 secteurs + footer total)
--     - /contributions    (timeline pluriannuelle, statuts variés, bandeau retard)
--     - /admin            (KPIs club, alerte impayé, liste membres > 1, cotisations)
--
--   Tout est SCOPÉ au club « Club E2E » et au membre de seed test@example.com,
--   plus 2 membres factices (BAMBA / COLY). Aucune autre donnée n'est touchée.
--
-- IMPORTANT — ce n'est PAS le seed officiel (supabase/seed.sql, rejoué au reset).
--   C'est un seed JETABLE de QA. Il s'appuie sur le fait que supabase/seed.sql a déjà
--   créé le club, l'utilisateur test@example.com et son adhésion. Si la DB a été
--   re-seedée par l'app (login magic-link), l'utilisateur est ré-identifié par EMAIL
--   ci-dessous — jamais par un id fixe.
--
-- IDEMPOTENCE
--   Rejouable sans erreur : DELETE ciblés (scopés au club / aux ids factices) puis
--   INSERT, et ON CONFLICT DO UPDATE pour la synthèse cotisations. Re-jouer écrase les
--   données de vérif sans dupliquer.
--
-- COMMENT REJOUER
--   /opt/homebrew/bin/psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -f apps/web/playwright/seed-verif.sql
--   (ou `psql "$E2E_DB_URL" -f apps/web/playwright/seed-verif.sql`)
--
-- COMMENT NETTOYER (revenir à l'état seed.sql nominal)
--   Voir le bloc « ROLLBACK MANUEL » commenté en fin de fichier.
--
-- Réf : schéma packages/data/src/supabase/types.gen.ts ; specs e2e portfolio/
--       contributions/admin ; readers apps/web/lib/data/{portfolio,contributions,admin}.ts
-- =============================================================================

-- Une seule transaction : tout ou rien.
BEGIN;

-- Constantes locales (psql ne supporte pas les variables en plain SQL → on utilise
-- des sous-requêtes par email/slug pour rester robuste au re-key des ids).
-- club_id Club E2E       : aaaaaaaa-0000-0000-0000-000000000001 (slug 'club-e2e')
-- membre de seed         : test@example.com (id re-keyé au login → résolu par email)
-- membres factices (ids EXPLICITES → cleanup déterministe) :
--   cccccccc-0000-0000-0000-000000000002  BAMBA Inès  (à jour)
--   cccccccc-0000-0000-0000-000000000003  COLY Marc   (EN IMPAYÉ — late, 150 € dus)


-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Pré-requis : le club et le membre de seed doivent exister.
--    (Filet de sécurité si la DB a été partiellement nettoyée.)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO clubs (id, name, slug, sheet_id, currency, min_contribution)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Club E2E', 'club-e2e', 'sheet-e2e', 'EUR', 100)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. clubs.synced_at = now()  → topbar « Synchronisé il y a … »
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE clubs
   SET synced_at = NOW(), updated_at = NOW()
 WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rôle trésorier pour test@example.com sur Club E2E
--    member_role ∈ {member, treasurer, president, network_admin} → 'treasurer'.
--    is_active est GENERATED (status='active') → JAMAIS écrit ; on garantit status.
--    Membre résolu par EMAIL (robuste au re-key user au login).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE memberships
   SET role = 'treasurer'::member_role,
       status = 'active'::member_status,
       updated_at = NOW()
 WHERE club_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
   AND user_id IN (SELECT id FROM users WHERE email = 'test@example.com');


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. POSITIONS (table positions) — 10 positions actives, 3 secteurs.
--    ON CONFLICT key = (club_id, symbol).
--    NOT NULL sans défaut : club_id, name, symbol, quantity, synced_at.
--    Le reader portfolio.ts lit : quantity, pump(=PRU), market_price_eur,
--    market_value, book_value, allocation_pct, gain_loss_eur, gain_loss_pct, sector.
--    Conventions du reader :
--      - gain_loss_pct / allocation_pct stockés en POINTS de % (÷100 à l'affichage).
--      - market_value = quantity × cours (valo snapshot, fallback si pas de prix live).
--      - book_value   = quantity × pump  (valeur d'acquisition).
--      - gain_loss_eur = market_value − book_value.
--    Au moins 1 position EN PERTE (cours < PRU → gain_loss négatif → token data-negative).
--    Secteurs : Technologie, Santé, Industrie (libellés attendus par les pills FilterBar).
-- ─────────────────────────────────────────────────────────────────────────────

-- Purge ciblée des positions du club (re-seed propre).
DELETE FROM positions WHERE club_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid;

INSERT INTO positions (
  club_id, symbol, name, sector, category, currency,
  quantity, pump, market_price_eur, book_value, market_value,
  gain_loss_eur, gain_loss_pct, allocation_pct,
  is_active, synced_at
)
VALUES
  -- ── Technologie (4) ────────────────────────────────────────────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NASDAQ:NVDA', 'NVIDIA',     'Technologie', 'Actions', 'USD',
    40,  650.00,  920.00,  26000.00, 36800.00,  10800.00,  41.54,  20.45, true, NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NASDAQ:META', 'Meta',       'Technologie', 'Actions', 'USD',
    50,  300.00,  470.00,  15000.00, 23500.00,   8500.00,  56.67,  13.06, true, NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NASDAQ:MSFT', 'Microsoft',  'Technologie', 'Actions', 'USD',
    30,  340.00,  410.00,  10200.00, 12300.00,   2100.00,  20.59,   6.83, true, NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NASDAQ:AAPL', 'Apple',      'Technologie', 'Actions', 'USD',
    60,  195.00,  178.00,  11700.00, 10680.00,  -1020.00,  -8.72,   5.93, true, NOW()),  -- PERTE
  -- ── Santé (3) ────────────────────────────────────────────────────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NYSE:JNJ',   'Johnson & Johnson', 'Santé', 'Actions', 'USD',
    80,  155.00,  168.00,  12400.00, 13440.00,   1040.00,   8.39,   7.46, true, NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NYSE:PFE',   'Pfizer',      'Santé', 'Actions', 'USD',
    120, 38.00,   29.00,    4560.00,  3480.00,  -1080.00, -23.68,   1.93, true, NOW()),  -- PERTE
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'EPA:SAN',    'Sanofi',      'Santé', 'Actions', 'EUR',
    70,  88.00,   97.50,    6160.00,  6825.00,    665.00,  10.80,   3.79, true, NOW()),
  -- ── Industrie (3) ─────────────────────────────────────────────────────────────
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NYSE:CAT',   'Caterpillar', 'Industrie', 'Actions', 'USD',
    25,  250.00,  330.00,   6250.00,  8250.00,   2000.00,  32.00,   4.58, true, NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'EPA:AIR',    'Airbus',      'Industrie', 'Actions', 'EUR',
    90,  120.00,  148.00,  10800.00, 13320.00,   2520.00,  23.33,   7.40, true, NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'NYSE:GE',    'GE Aerospace','Industrie', 'Actions', 'USD',
    55,  100.00,   92.00,   5500.00,  5060.00,   -440.00,  -8.00,   2.81, true, NOW())   -- PERTE
;
-- Total market_value attendu ≈ 133 655 € sur 3 secteurs (Tech ~83 280, Santé ~23 745, Industrie ~26 630).
-- 3 positions en perte : Apple, Pfizer, GE Aerospace.


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CONTRIBUTION_MONTHS pour le membre de seed (timeline /contributions).
--    month_status ∈ {paid, due, late, exempt}. (Le mois « en cours » se rend en
--    'due' → variante visuelle 'pending' côté UI, cf. contributions.ts MONTH_VARIANT.)
--    ON CONFLICT key = (membership_id, year, month).
--    NOT NULL sans défaut : club_id, membership_id, month, year, status, synced_at.
--    Montant ~100 €. Historique 2019 → 2026 (mois courant = juin 2026 'due').
--    Liaison : contribution_months.membership_id → memberships.id (PK stable).
--    On résout l'adhésion du membre de seed par EMAIL.
-- ─────────────────────────────────────────────────────────────────────────────

-- Purge ciblée des mois de l'adhésion de seed.
DELETE FROM contribution_months cm
 USING memberships m, users u
 WHERE cm.membership_id = m.id
   AND m.user_id = u.id
   AND u.email = 'test@example.com'
   AND m.club_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid;

-- Génère un historique pluriannuel via generate_series, puis applique une
-- répartition de statuts (majorité 'paid', quelques 'late'/'exempt', mois courant 'due').
INSERT INTO contribution_months (membership_id, club_id, year, month, amount, status, due_date, paid_at, synced_at)
SELECT
  m.id,
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  y.year,
  mo.month,
  CASE st.status WHEN 'due' THEN 0 ELSE 100 END,
  st.status::month_status,
  make_date(y.year, mo.month, 5),                                    -- échéance le 5
  CASE st.status WHEN 'paid' THEN make_date(y.year, mo.month, 5)::timestamptz ELSE NULL END,
  NOW()
FROM users u
JOIN memberships m ON m.user_id = u.id
 AND m.club_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
CROSS JOIN generate_series(2019, 2026) AS y(year)
CROSS JOIN generate_series(1, 12)      AS mo(month)
-- Statut dérivé : par défaut 'paid' ; exceptions pour varier la timeline.
CROSS JOIN LATERAL (
  SELECT CASE
    -- Mois futurs (après juin 2026) : non rendus → on ne les insère pas (filtrés plus bas).
    WHEN (y.year = 2026 AND mo.month = 6) THEN 'due'        -- mois courant (juin 2026)
    WHEN (y.year = 2026 AND mo.month IN (4, 5)) THEN 'late' -- 2 mois récents en retard
    WHEN (y.year = 2023 AND mo.month IN (7, 8)) THEN 'exempt' -- congé d'été exempté
    WHEN (y.year = 2021 AND mo.month = 11) THEN 'late'      -- un retard ponctuel
    ELSE 'paid'
  END AS status
) st
WHERE u.email = 'test@example.com'
  -- Ne pas insérer les mois futurs (> juin 2026) : ils ne sont pas rendus par l'UI.
  AND NOT (y.year = 2026 AND mo.month > 6)
ON CONFLICT (membership_id, year, month) DO UPDATE
  SET amount    = EXCLUDED.amount,
      status    = EXCLUDED.status,
      due_date  = EXCLUDED.due_date,
      paid_at   = EXCLUDED.paid_at,
      synced_at = EXCLUDED.synced_at;

-- Synthèse `contributions` du membre de seed : alignée sur l'historique généré.
-- (Une ligne existe déjà — posée par global-setup/e2e — on la met à jour.)
-- ~89 mois payés × 100 € ≈ 8 900 € ; statut 'ok', detention 5 %.
INSERT INTO contributions (
  membership_id, club_id, months_count, detention_pct, total_contributed,
  penalties, status, amount_due, synced_at, updated_at
)
SELECT m.id, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
       89, 0.0520, 8900.00, 0, 'ok'::contribution_status, 0, NOW(), NOW()
FROM users u
JOIN memberships m ON m.user_id = u.id
 AND m.club_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid
WHERE u.email = 'test@example.com'
ON CONFLICT (membership_id) DO UPDATE
  SET months_count      = EXCLUDED.months_count,
      detention_pct     = EXCLUDED.detention_pct,
      total_contributed = EXCLUDED.total_contributed,
      penalties         = EXCLUDED.penalties,
      status            = EXCLUDED.status,
      amount_due        = EXCLUDED.amount_due,
      synced_at         = EXCLUDED.synced_at,
      updated_at        = NOW();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MEMBRES ADDITIONNELS (pour /admin/members : compteur « N membres » > 1).
--    public.users n'a PAS de FK vers auth.users (vérifié) → insert direct possible,
--    pas besoin de créer de lignes auth.users.
--    is_active GENERATED → on garantit status='active' à la place.
--    Chaque membre a une ligne `contributions` (lue par getClubMembers) :
--      - BAMBA Inès : à jour     (status 'ok',   amount_due 0)
--      - COLY Marc  : EN IMPAYÉ  (status 'late', amount_due 150) → exerce l'alerte impayé
-- ─────────────────────────────────────────────────────────────────────────────

-- users
INSERT INTO users (id, email, full_name, onboarding_completed)
VALUES
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'bamba.verif@example.com', 'BAMBA Inès', true),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'coly.verif@example.com',  'COLY Marc',  true)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

-- memberships (status='active' → is_active=true par GENERATED)
INSERT INTO memberships (id, user_id, club_id, role, status, joined_at)
VALUES
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'cccccccc-0000-0000-0000-000000000002'::uuid,
   'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'member'::member_role, 'active'::member_status, '2020-01-01'),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'cccccccc-0000-0000-0000-000000000003'::uuid,
   'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'member'::member_role, 'active'::member_status, '2021-03-01')
ON CONFLICT (user_id, club_id) DO UPDATE
  SET status = 'active'::member_status, role = 'member'::member_role, updated_at = NOW();

-- contributions des 2 membres factices
INSERT INTO contributions (
  membership_id, club_id, months_count, detention_pct, total_contributed,
  penalties, status, amount_due, synced_at, updated_at
)
VALUES
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
   60, 0.0350, 6000.00, 0,   'ok'::contribution_status,   0,   NOW(), NOW()),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
   42, 0.0210, 4200.00, 0, 'late'::contribution_status, 150,   NOW(), NOW())
ON CONFLICT (membership_id) DO UPDATE
  SET months_count      = EXCLUDED.months_count,
      detention_pct     = EXCLUDED.detention_pct,
      total_contributed = EXCLUDED.total_contributed,
      penalties         = EXCLUDED.penalties,
      status            = EXCLUDED.status,
      amount_due        = EXCLUDED.amount_due,
      synced_at         = EXCLUDED.synced_at,
      updated_at        = NOW();

-- Quelques contribution_months pour les membres factices (enrichit /admin/cotisations,
-- timeline club + stat « Versement moyen »). BAMBA : 2025 jan-juin payés.
-- COLY : 2025 jan-avr payés + mai/juin en retard (cohérent avec status 'late').
DELETE FROM contribution_months
 WHERE membership_id IN (
   'cccccccc-0000-0000-0000-000000000002'::uuid,
   'cccccccc-0000-0000-0000-000000000003'::uuid
 );

INSERT INTO contribution_months (membership_id, club_id, year, month, amount, status, due_date, paid_at, synced_at)
VALUES
  -- BAMBA — 2025 jan..juin payés
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 1, 100, 'paid',  '2025-01-05', '2025-01-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 2, 100, 'paid',  '2025-02-05', '2025-02-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 3, 100, 'paid',  '2025-03-05', '2025-03-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 4, 100, 'paid',  '2025-04-05', '2025-04-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 5, 100, 'paid',  '2025-05-05', '2025-05-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000002'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 6, 100, 'paid',  '2025-06-05', '2025-06-05', NOW()),
  -- COLY — 2025 jan..avr payés, mai/juin en retard
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 1, 100, 'paid',  '2025-01-05', '2025-01-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 2, 100, 'paid',  '2025-02-05', '2025-02-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 3, 100, 'paid',  '2025-03-05', '2025-03-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 4, 100, 'paid',  '2025-04-05', '2025-04-05', NOW()),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 5, 100, 'late',  '2025-05-05', NULL, NOW()),
  ('cccccccc-0000-0000-0000-000000000003'::uuid, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 2025, 6, 100, 'late',  '2025-06-05', NULL, NOW())
ON CONFLICT (membership_id, year, month) DO UPDATE
  SET amount = EXCLUDED.amount, status = EXCLUDED.status,
      due_date = EXCLUDED.due_date, paid_at = EXCLUDED.paid_at, synced_at = EXCLUDED.synced_at;


COMMIT;


-- =============================================================================
-- VÉRIFICATIONS (à lancer manuellement après application)
-- =============================================================================
-- \echo '--- positions club (attendu 10, 3 secteurs) ---'
-- SELECT count(*) AS positions, count(DISTINCT sector) AS secteurs
--   FROM positions WHERE club_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid AND is_active;
-- \echo '--- contribution_months du membre de seed (par statut) ---'
-- SELECT status, count(*) FROM contribution_months cm
--   JOIN memberships m ON m.id = cm.membership_id
--   JOIN users u ON u.id = m.user_id WHERE u.email='test@example.com' GROUP BY status;
-- \echo '--- rôle du membre de seed (attendu treasurer) ---'
-- SELECT u.email, mem.role FROM memberships mem JOIN users u ON u.id=mem.user_id
--   WHERE mem.club_id='aaaaaaaa-0000-0000-0000-000000000001'::uuid AND u.email='test@example.com';
-- \echo '--- membres actifs du club (attendu 3) ---'
-- SELECT count(*) FROM memberships WHERE club_id='aaaaaaaa-0000-0000-0000-000000000001'::uuid AND is_active;
-- \echo '--- synced_at du club (non null) ---'
-- SELECT synced_at FROM clubs WHERE id='aaaaaaaa-0000-0000-0000-000000000001'::uuid;


-- =============================================================================
-- ROLLBACK MANUEL (revenir à l'état seed.sql nominal — NON exécuté par défaut)
-- =============================================================================
-- BEGIN;
--   -- Supprime les membres factices (contributions + contribution_months CASCADE).
--   DELETE FROM memberships WHERE id IN (
--     'cccccccc-0000-0000-0000-000000000002'::uuid,
--     'cccccccc-0000-0000-0000-000000000003'::uuid);
--   DELETE FROM users WHERE id IN (
--     'cccccccc-0000-0000-0000-000000000002'::uuid,
--     'cccccccc-0000-0000-0000-000000000003'::uuid);
--   -- Vide les positions et les mois de cotisation de vérif.
--   DELETE FROM positions WHERE club_id='aaaaaaaa-0000-0000-0000-000000000001'::uuid;
--   DELETE FROM contribution_months cm USING memberships m, users u
--     WHERE cm.membership_id=m.id AND m.user_id=u.id AND u.email='test@example.com';
--   -- Rétablit le membre de seed en 'member'.
--   UPDATE memberships SET role='member'::member_role
--    WHERE club_id='aaaaaaaa-0000-0000-0000-000000000001'::uuid
--      AND user_id IN (SELECT id FROM users WHERE email='test@example.com');
-- COMMIT;
-- =============================================================================
