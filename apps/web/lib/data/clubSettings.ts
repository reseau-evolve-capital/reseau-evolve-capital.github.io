// Couche data des paramètres du club (édition admin/président).
//
// Lecture : RLS « authenticated » sur clubs (lecture seule). Écriture : EXCLUSIVEMENT
// via la RPC SECURITY DEFINER `update_club_settings` (la garde staff est dans la RPC).
// Aucune écriture directe sur la table clubs (la RLS la refuse) ; jamais de service-role.
//
// Ce module expose :
//   - le type métier ClubSettings (lecture),
//   - getClubSettings() (lecture RLS),
//   - des helpers PURS de validation/normalisation des entrées (testés sans DB),
//   - buildUpdateArgs() : ClubSettingsInput → arguments RPC null-safe.
//
// Réf : migration 025, 022/024 (colonnes), CLAUDE.md (RLS, jamais service-role, jamais NaN).

import type { createServerClient, Database } from '@evolve/data'

type ServerClient = ReturnType<typeof createServerClient>
type ClubRow = Database['public']['Tables']['clubs']['Row']

/** Paramètres du club éditables + non éditables affichés en lecture. */
export interface ClubSettings {
  clubId: string
  name: string
  city: string | null
  country: string | null // ISO 3166-1 alpha-2 (MAJUSCULES) ou null
  brokerAccountRef: string | null // champ SENSIBLE
  annualInvestmentCap: number | null // champ sensible (EUR)
  /** Cotisation minimale du club (EUR). Éditable par le staff ; toujours définie (défaut 100). */
  minContribution: number
  /** Lecture seule (jamais éditable ici) : nom du courtier issu de settings.broker_name. */
  brokerName: string | null
}

/** Entrée brute du formulaire d'édition (chaînes telles que saisies). */
export interface ClubSettingsInput {
  name: string
  city: string
  country: string
  brokerAccountRef: string
  /** Chaîne du champ montant (peut contenir des espaces, virgule décimale FR). */
  annualInvestmentCap: string
  /** Chaîne du champ cotisation minimale (EUR). Requis (valeur toujours présente). */
  minContribution: string
}

/** Arguments passés à la RPC update_club_settings (null-safe). */
export interface ClubSettingsRpcArgs {
  p_club_id: string
  p_name: string
  p_city: string | null
  p_country: string | null
  p_broker_account_ref: string | null
  p_annual_investment_cap: number | null
  p_min_contribution: number | null
}

export type ValidationErrorCode =
  | 'name_required'
  | 'country_invalid'
  | 'cap_invalid'
  | 'min_contribution_invalid'

// ─── Helpers PURS (testés sans DB) ───────────────────────────────────────────

/** Trim ; chaîne vide → null. */
export function normalizeText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Pays : trim + MAJUSCULES ; '' → null. Ne valide pas le format (cf. validateInput). */
export function normalizeCountry(value: string): string | null {
  const t = normalizeText(value)
  return t === null ? null : t.toUpperCase()
}

/** Code pays valide ssi exactement 2 lettres A–Z (après normalisation), ou null. */
export function isValidCountry(value: string | null): boolean {
  if (value === null) return true
  return /^[A-Z]{2}$/.test(value)
}

/**
 * Parse un montant FR/EN en nombre. Accepte espaces (y compris NBSP/NNBSP),
 * séparateurs de milliers, virgule OU point décimal. '' → null. Renvoie NaN si invalide.
 */
export function parseAmount(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  // Supprime espaces (normaux, NBSP  , NNBSP  ) et symboles monétaires courants.
  const cleaned = trimmed.replace(/[\s  €$]/g, '')
  // Si une virgule est présente, on la traite comme séparateur décimal FR.
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return NaN
  return Number(normalized)
}

/** Valide une entrée formulaire ; renvoie la liste des codes d'erreur (vide = OK). */
export function validateInput(input: ClubSettingsInput): ValidationErrorCode[] {
  const errors: ValidationErrorCode[] = []
  if (normalizeText(input.name) === null) errors.push('name_required')
  if (!isValidCountry(normalizeCountry(input.country))) errors.push('country_invalid')
  const cap = parseAmount(input.annualInvestmentCap)
  if (cap !== null && (Number.isNaN(cap) || cap < 0)) errors.push('cap_invalid')
  // Cotisation minimale : REQUISE (valeur toujours présente) + nombre ≥ 0.
  const minC = parseAmount(input.minContribution)
  if (minC === null || Number.isNaN(minC) || minC < 0) errors.push('min_contribution_invalid')
  return errors
}

/** Construit les arguments RPC null-safe à partir d'une entrée formulaire (suppose valide). */
export function buildUpdateArgs(clubId: string, input: ClubSettingsInput): ClubSettingsRpcArgs {
  const cap = parseAmount(input.annualInvestmentCap)
  const minC = parseAmount(input.minContribution)
  return {
    p_club_id: clubId,
    p_name: input.name.trim(),
    p_city: normalizeText(input.city),
    p_country: normalizeCountry(input.country),
    p_broker_account_ref: normalizeText(input.brokerAccountRef),
    p_annual_investment_cap: cap !== null && !Number.isNaN(cap) ? cap : null,
    // null → inchangé côté RPC (colonne NOT NULL) ; sinon la nouvelle valeur saisie.
    p_min_contribution: minC !== null && !Number.isNaN(minC) ? minC : null,
  }
}

/** Vrai si le champ sensible broker_account_ref change (déclenche le double-warning UI). */
export function brokerRefChanged(current: string | null, next: string): boolean {
  return (current ?? '') !== next.trim()
}

// ─── Lecture DB (session + RLS) ──────────────────────────────────────────────

/** Lit les paramètres du club courant. RLS « authenticated » lecture seule sur clubs. */
export async function getClubSettings(
  supabase: ServerClient,
  clubId: string
): Promise<ClubSettings> {
  const { data, error } = await supabase
    .from('clubs')
    .select(
      'id, name, city, country, broker_account_ref, annual_investment_cap, min_contribution, settings'
    )
    .eq('id', clubId)
    .single<
      Pick<
        ClubRow,
        | 'id'
        | 'name'
        | 'city'
        | 'country'
        | 'broker_account_ref'
        | 'annual_investment_cap'
        | 'min_contribution'
      > & { settings: ClubRow['settings'] }
    >()
  if (error) throw error

  const settings = (data.settings ?? {}) as Record<string, unknown>
  const brokerName = typeof settings['broker_name'] === 'string' ? settings['broker_name'] : null

  return {
    clubId: data.id,
    name: data.name,
    city: data.city,
    country: data.country,
    brokerAccountRef: data.broker_account_ref,
    annualInvestmentCap:
      data.annual_investment_cap === null ? null : Number(data.annual_investment_cap),
    // NOT NULL en DB (défaut 100) ; repli défensif sur 100 si jamais absent.
    minContribution: data.min_contribution === null ? 100 : Number(data.min_contribution),
    brokerName,
  }
}
