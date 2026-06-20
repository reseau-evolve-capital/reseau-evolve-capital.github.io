-- ════════════════════════════════════════════════════════════════════════════
-- 048 — Unicité de la matrice Google Sheets par club.
--
-- Une même matrice (clubs.sheet_id) ne doit JAMAIS être reliée à deux clubs : sinon
-- l'import sync écraserait les données d'un club avec celles de l'autre, et les écrans
-- membres mélangeraient deux portefeuilles. Jusqu'ici rien ne l'empêchait (aucune
-- contrainte, RPC sans garde) → on pouvait brancher 2× le même sheet_id.
--
-- Deux niveaux de défense :
--   1. Index UNIQUE PARTIEL sur clubs.sheet_id (où non NULL) — garantie DB inviolable,
--      sûre même en cas de course entre deux connexions simultanées.
--   2. Garde explicite dans network_set_club_sheet — message métier clair AVANT l'update
--      (mappé 'duplicate' côté UI), au lieu d'une violation d'index brute.
--
-- Réf : NET-003 (migration 042 RPC write), CLAUDE.md (multi-club via clubs.sheet_id),
--   DATA_MODEL §5 (la matrice est la source de vérité d'UN club).
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Garantie DB : un sheet_id non NULL est unique sur l'ensemble des clubs.
CREATE UNIQUE INDEX IF NOT EXISTS clubs_sheet_id_unique
  ON public.clubs (sheet_id)
  WHERE sheet_id IS NOT NULL;

-- 2. network_set_club_sheet — refuse une matrice déjà reliée à un AUTRE club.
CREATE OR REPLACE FUNCTION public.network_set_club_sheet(
  p_club_id  UUID,
  p_sheet_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_sheet TEXT;
BEGIN
  IF NOT public.is_network_admin() THEN
    RAISE EXCEPTION 'acces refuse : network_admin requis' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clubs WHERE id = p_club_id) THEN
    RAISE EXCEPTION 'club introuvable' USING ERRCODE = 'no_data_found';
  END IF;

  -- '' → NULL (débranche la matrice).
  v_sheet := NULLIF(btrim(p_sheet_id), '');

  -- Garde anti-doublon : la même matrice ne peut pas être reliée à un autre club.
  -- Message métier stable consommé par l'UI (mapPgError → 'duplicate').
  IF v_sheet IS NOT NULL AND EXISTS (
    SELECT 1 FROM clubs WHERE sheet_id = v_sheet AND id <> p_club_id
  ) THEN
    RAISE EXCEPTION 'matrice déjà reliée à un autre club' USING ERRCODE = 'unique_violation';
  END IF;

  UPDATE clubs
     SET sheet_id   = v_sheet,
         updated_at = NOW()
   WHERE id = p_club_id;

  PERFORM public.network_log_event(
    'network_set_club_sheet', 'club', p_club_id,
    jsonb_build_object('connected', v_sheet IS NOT NULL)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.network_set_club_sheet(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.network_set_club_sheet(UUID, TEXT) TO authenticated;
