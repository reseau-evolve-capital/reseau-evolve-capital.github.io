-- 059_get_club_cash_balance.sql — Solde de trésorerie d'un club (OPS-103, cahier §4.x).
--
-- QUOI : get_club_cash_balance(p_club_id) = somme des cash_delta des opérations actives
--   et confirmées du club. C'est le solde de trésorerie canonique (= ce qui n'est pas
--   investi en titres). Toujours numeric, jamais NULL (COALESCE → 0 sur club vide).
--
-- SÉCURITÉ : SECURITY DEFINER bypasse la RLS → garde lecture fail-closed obligatoire en
--   tête (le cahier l'omet, on l'ajoute). Choix service_role documenté ci-dessous.
--
-- Réf : 057 (operations), 010 (get_user_club_ids — réutilisé), 038/045 (style RPC).

CREATE OR REPLACE FUNCTION public.get_club_cash_balance(p_club_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_catalog
AS $$
BEGIN
  -- Garde fail-closed. SECURITY DEFINER bypasse la RLS, donc on filtre l'accès ici.
  -- Choix service_role : un appel service_role n'a pas de session JWT → auth.uid() IS NULL.
  -- On LAISSE PASSER ce cas (le service_role pilote les RPC/jobs de calcul et doit lire
  -- n'importe quel club), mais on BLOQUE un utilisateur authentifié qui interroge un club
  -- dont il n'est pas membre actif (get_user_club_ids() ne renvoie que ses clubs actifs).
  IF auth.uid() IS NOT NULL
     AND NOT (p_club_id IN (SELECT get_user_club_ids())) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN COALESCE(
    (SELECT SUM(cash_delta)
       FROM public.operations
      WHERE club_id = p_club_id
        AND is_cancelled = FALSE
        AND status = 'confirmed'),
    0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_club_cash_balance(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_club_cash_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_cash_balance(uuid) TO service_role;
