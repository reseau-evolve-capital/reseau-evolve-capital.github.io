-- 057_operations.sql — Module Opérations natif (OPS-101, cahier §4.1).
--
-- QUOI : table `public.operations` — journal canonique des opérations d'un club
--   (cotisations, sorties, achats/ventes de titres, dividendes, frais, valorisations,
--   corrections…). Source de vérité de la trésorerie et des parts, en remplacement de
--   la dérivation Matrice. Écriture RPC-only (les Server Actions / migrate-to-operations
--   passent par service_role et les RPC SECURITY DEFINER ; `authenticated` lit seulement).
--
-- RLS (CLAUDE.md : RLS obligatoire dès la création ; auto-expose Data API désactivé donc
--   grants explicites) :
--   • SELECT pour `authenticated` : membre ACTIF du club de l'opération uniquement.
--   • INSERT/UPDATE/DELETE NON accordés à `authenticated` (écriture RPC-only).
--   • service_role : tous droits (pilote migrate-to-operations et les RPC).
--
-- Réf : 004 (memberships — id uuid PK, FK cibles), 010 (get_user_club_ids — réutilisé),
--   040 (set_updated_at — réutilisé, JAMAIS redéfini), 038 (style table/RLS/grants/commentaires).

-- ── Table operations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operations (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  club_id                   uuid NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  membership_id             uuid REFERENCES public.memberships (id) ON DELETE SET NULL,

  -- Nature de l'opération
  type                      text NOT NULL,
  status                    text NOT NULL DEFAULT 'confirmed',

  -- Impact trésorerie (signe : entrée > 0, sortie < 0). Source de vérité du cash.
  cash_delta                numeric(18,4) NOT NULL DEFAULT 0,

  -- Titre concerné (pour buy/sell/dividend_*/valuation)
  symbol                    text,
  asset_name                text,
  quantity                  numeric(18,8),
  unit_price                numeric(18,4),
  currency                  char(3) DEFAULT 'EUR',
  fx_rate                   numeric(15,6) DEFAULT 1.0,

  -- Dates
  operation_date            date NOT NULL,
  settlement_date           date,
  recorded_at               timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  -- Annulation (soft-delete par renversement / marquage)
  is_cancelled              boolean NOT NULL DEFAULT false,
  cancelled_at              timestamptz,
  cancelled_by              uuid REFERENCES public.memberships (id) ON DELETE SET NULL,
  cancellation_reason       text,
  corrects_operation_id     uuid REFERENCES public.operations (id),

  -- Parts (mode OPCVM) — MAJ par settle_contributions_wave
  parts_allocated           numeric(18,8),
  part_price_at_settlement  numeric(18,6),

  -- Traçabilité
  recorded_by               uuid REFERENCES public.memberships (id) ON DELETE SET NULL,
  source                    text NOT NULL DEFAULT 'manual',
  broker_reference          text,
  notes                     text,
  metadata                  jsonb NOT NULL DEFAULT '{}',

  -- ── CHECKs cahier §4.1 ────────────────────────────────────────────────────
  CONSTRAINT operations_type_check CHECK (type IN (
    'contribution', 'member_exit', 'buy', 'sell', 'dividend_cash', 'dividend_stock',
    'fee', 'penalty', 'capital_call', 'distribution', 'valuation', 'correction'
  )),
  CONSTRAINT operations_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  CONSTRAINT operations_source_check CHECK (source IN ('manual', 'matrice_migration', 'matrice_sync')),
  CONSTRAINT operations_cash_delta_dividend_stock CHECK (type <> 'dividend_stock' OR cash_delta = 0),
  CONSTRAINT operations_cash_delta_valuation       CHECK (type <> 'valuation'       OR cash_delta = 0),

  -- ── CHECKs supplémentaires OPS-101 ──────────────────────────────────────────
  -- Une opération qui touche un membre nommément doit référencer son membership.
  CONSTRAINT operations_membership_required CHECK (
    type NOT IN ('contribution', 'penalty', 'member_exit') OR membership_id IS NOT NULL
  ),
  -- Une opération sur titre doit porter un symbole.
  CONSTRAINT operations_symbol_required CHECK (
    type NOT IN ('buy', 'sell', 'dividend_cash', 'dividend_stock', 'valuation') OR symbol IS NOT NULL
  )
);

COMMENT ON TABLE public.operations IS
  'Journal canonique des opérations d''un club (trésorerie + parts). Source de vérité remplaçant la dérivation Matrice. Écriture RPC-only (service_role + RPC SECURITY DEFINER) ; authenticated lit les opérations de ses clubs actifs via RLS.';

-- ── Index cahier §4.1 (6) ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_operations_club_date ON public.operations (club_id, operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_operations_type      ON public.operations (club_id, type);
CREATE INDEX IF NOT EXISTS idx_operations_member    ON public.operations (membership_id) WHERE membership_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_active    ON public.operations (club_id) WHERE is_cancelled = false;
CREATE INDEX IF NOT EXISTS idx_operations_pending_settlement ON public.operations (club_id, recorded_at)
  WHERE settlement_date IS NULL AND is_cancelled = false AND type = 'contribution' AND status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_operations_symbol    ON public.operations (club_id, symbol) WHERE symbol IS NOT NULL;

-- ── Trigger updated_at (réutilise set_updated_at de la migration 040) ────────
DROP TRIGGER IF EXISTS set_operations_updated_at ON public.operations;
CREATE TRIGGER set_operations_updated_at
  BEFORE UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS + grants ──────────────────────────────────────────────────────────────
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operations FROM public;

-- authenticated : SELECT seulement (écriture RPC-only — pas d'INSERT/UPDATE/DELETE).
GRANT SELECT ON public.operations TO authenticated;
-- service_role : pilote migrate-to-operations et les RPC SECURITY DEFINER.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations TO service_role;

DROP POLICY IF EXISTS operations_select_club_member ON public.operations;

-- Lecture : membre ACTIF du club de l'opération. get_user_club_ids() filtre déjà sur
-- is_active = TRUE, mais on confirme l'appartenance active sur LA ligne via memberships
-- (défense en profondeur + cohérence avec le cahier OPS-101).
CREATE POLICY operations_select_club_member
  ON public.operations FOR SELECT
  TO authenticated
  USING (
    club_id IN (SELECT get_user_club_ids())
    AND COALESCE(
      (SELECT m.is_active
         FROM public.memberships m
        WHERE m.club_id = operations.club_id
          AND m.user_id = auth.uid()
        LIMIT 1),
      FALSE
    )
  );
