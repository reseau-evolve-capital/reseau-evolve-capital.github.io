// Mapper PUR : assemble un DTO `AttestationData` à partir des rows déjà chargées (NTF-004).
//
// Le fetch (session + RLS) vit dans la route API ; ce mapper ne fait QUE de la mise en
// forme — il est testable sans DB. Règle d'or (CLAUDE.md) : aucune lacune ne produit
// `NaN`/`undefined`/chaîne vide à l'écran → fallback `—` partout. L'adresse postale, le n°
// de compte courtier et le plafond annuel (→ capacité restante) sont désormais alimentables
// (colonnes users.postal_address / clubs.broker_account_ref / clubs.annual_investment_cap,
// migration 022) ; une colonne vide reste rendue « — »/null. Les dirigeants restent hors DV0.
//
// Le formatage FR (formatEUR/formatPct/formatDate) est appliqué dans le composant PDF, pas
// ici : le mapper produit des VALEURS numériques (ou null) + des libellés bruts, pour rester
// testable indépendamment de la locale.
//
// Réf : NTF-004, DATA_MODEL.md §2.6/§2.7/§2.9/§2.4, CLAUDE.md (jamais de NaN/undefined, fallback —).

/** Tiret cadratin — fallback unique pour toute donnée absente (cf. @evolve/utils). */
export const DASH = '—'

/** Synthèse cotisation du membre (sous-ensemble de `contributions`). */
export interface AttestationContributionInput {
  detentionPct: number | null // fraction 0..1 (detention_pct)
  totalContributed: number | null
  netMarketValue: number | null // valorisation de la quote-part
  status: string | null
  amountDue: number | null
  penalties: number | null
}

/** Position du portefeuille du club (sous-ensemble de `positions`), pour la valo Σ. */
export interface AttestationPositionInput {
  quantity: number | null
  marketValue: number | null // snapshot DB (fallback si pas de prix live)
  livePrice: number | null // cours live (EUR) si fourni, sinon null → fallback snapshot
}

/** Mois de cotisation (sous-ensemble de `contribution_months`), pour les agrégats annuels/mensuels. */
export interface AttestationMonthInput {
  year: number
  month: number // 1..12
  amount: number | null
  status: string | null // 'paid' | 'due' | 'late' | 'exempt'
}

/** Identité membre + club + courtier. */
export interface AttestationIdentityInput {
  fullName: string | null
  clubName: string | null
  clubCity: string | null
  joinedAt: string | null // ISO date (memberships.joined_at)
  /** N° de compte courtier — pas en DB V0 → null → `—`. */
  brokerAccountRef: string | null
  /** Adresse postale — `clubs`/`users` (postal_address) ; null → `—`. */
  postalAddress: string | null
  brokerName: string | null // défaut « Bourse Direct »
  /** Plafond annuel d'investissement (EUR) — clubs.annual_investment_cap ; null → capacité « — ». */
  annualInvestmentCap: number | null
}

export interface AttestationInput {
  identity: AttestationIdentityInput
  contribution: AttestationContributionInput | null
  positions: AttestationPositionInput[]
  /**
   * Valorisation TOTALE du portefeuille du club = `market_value` de la ligne d'agrégat
   * « Portefeuille » (col G de la matrice, `portfolio_aggregates`), qui inclut les ESPÈCES
   * et les soldes — EXACTEMENT le total affiché sur la page /portfolio. `null` si l'agrégat
   * est absent → le mapper retombe sur la somme des positions (`sumPortfolioValue`).
   * Source de vérité unique : `apps/web/lib/data/portfolio.ts#totalFromAggregates`.
   */
  portfolioTotalValue: number | null
  months: AttestationMonthInput[]
  /** Période demandée « YYYY-MM » (pilote « investissement année courante » + « effort du mois »). */
  period: string
  /** Date de génération du document (injectable pour les tests). */
  generatedAt: Date
  /** Base URL de vérification (n° de réf encodé dans le QR). */
  verificationBaseUrl?: string
}

/** Un chiffre/complément : `value` numérique (ou null si lacune) + son `format` de rendu. */
export interface AttestationMetric {
  /** Valeur numérique brute, ou null → rendu `—`. */
  value: number | null
  /** Pilote le formatter appliqué côté composant. */
  format: 'eur' | 'pct'
}

export interface AttestationData {
  // En-tête
  reference: string // n° de référence unique (REC-AAAAMM-XXXX)
  verificationUrl: string // lien encodé dans le QR
  generatedAtIso: string // ISO de génération (formatée à l'affichage)
  periodLabel: string // « YYYY-MM » brut (libellé localisé côté composant)

  // Identité
  fullName: string
  clubName: string
  clubCity: string
  joinedAtIso: string | null // null → `—`
  brokerName: string
  brokerAccountRef: string // `—` si absent
  postalAddress: string // `—` si absent

  // 4 chiffres clés
  detentionPct: AttestationMetric
  totalContributed: AttestationMetric
  quotePartValue: AttestationMetric // net_market_value
  portfolioValue: AttestationMetric // total agrégat « Portefeuille » (espèces incluses) — fallback Σ positions

  // 3 compléments (⚠ dérivés ou `—`)
  yearInvested: AttestationMetric // investissement cumulé année en cours (dérivé)
  yearRemainingCapacity: AttestationMetric // plafond − cumulé → null (pas de plafond DB)
  monthClubEffort: AttestationMetric // effort de cotisation du club, mois courant (dérivé)
}

/** Normalise une valeur numérique : null/NaN/Infinity → null (rendu `—`). */
function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Texte non vide, sinon `—` (jamais undefined/chaîne vide à l'écran). */
function text(v: string | null | undefined): string {
  const t = (v ?? '').trim()
  return t === '' ? DASH : t
}

/** Σ valorisation du portefeuille : live (quantity × livePrice) si prix > 0, sinon snapshot.
 *  Renvoie null si AUCUNE position ne fournit de valeur exploitable (→ `—`). */
export function sumPortfolioValue(positions: AttestationPositionInput[]): number | null {
  if (positions.length === 0) return null
  let total = 0
  let counted = 0
  for (const p of positions) {
    const live = num(p.livePrice)
    const qty = num(p.quantity)
    const snapshot = num(p.marketValue)
    let value: number | null = null
    if (live !== null && live > 0 && qty !== null) {
      value = qty * live
    } else if (snapshot !== null) {
      value = snapshot
    }
    if (value !== null) {
      total += value
      counted += 1
    }
  }
  return counted > 0 ? total : null
}

/** Investissement cumulé sur l'année de `period` : Σ des montants des mois `paid` de cette année.
 *  Renvoie null si aucun mois exploitable (→ `—`). */
export function sumYearInvested(months: AttestationMonthInput[], year: number): number | null {
  let total = 0
  let counted = 0
  for (const m of months) {
    if (m.year !== year || m.status !== 'paid') continue
    const a = num(m.amount)
    if (a !== null) {
      total += a
      counted += 1
    }
  }
  return counted > 0 ? total : null
}

/** Effort de cotisation du membre pour le mois courant (montant du mois `period`).
 *  Renvoie null si le mois est absent ou sans montant exploitable (→ `—`). */
export function monthEffort(
  months: AttestationMonthInput[],
  year: number,
  month: number
): number | null {
  const m = months.find((x) => x.year === year && x.month === month)
  if (!m) return null
  return num(m.amount)
}

/** Découpe « YYYY-MM » en { year, month }. Période invalide → année 0 / mois 0 (agrégats → null). */
export function parsePeriod(period: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim())
  if (!m) return { year: 0, month: 0 }
  return { year: Number(m[1]), month: Number(m[2]) }
}

/** Génère un n° de référence déterministe REC-AAAAMM-XXXX à partir d'un seed (réf + période).
 *  XXXX = hash court (base36) du seed → stable, lisible, sans dépendance crypto lourde. */
export function buildReference(seed: string, period: string): string {
  const { year, month } = parsePeriod(period)
  const ym = year > 0 ? `${year}${String(month).padStart(2, '0')}` : '000000'
  // Hash djb2 → base36, 4 caractères (suffisant pour un identifiant lisible non-secret).
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i)
  }
  const suffix = (h >>> 0).toString(36).toUpperCase().padStart(4, '0').slice(-4)
  return `REC-${ym}-${suffix}`
}

const DEFAULT_BROKER = 'Bourse Direct'
const DEFAULT_VERIFY_BASE = 'https://app.evolve.capital/verifier'

/** Assemble le DTO d'attestation. PUR : aucune I/O. Fallback `—`/null sur toute lacune. */
export function mapAttestation(input: AttestationInput): AttestationData {
  const { year, month } = parsePeriod(input.period)
  const c = input.contribution

  // Investissement cumulé de l'année + capacité restante = plafond − cumulé.
  // Capacité non calculable si le plafond est absent (→ null → `—`). Si rien n'est investi
  // cette année (yearInvested null), la capacité restante = le plafond entier.
  const yearInvested = sumYearInvested(input.months, year)
  const cap = num(input.identity.annualInvestmentCap)
  const yearRemainingCapacity = cap === null ? null : cap - (yearInvested ?? 0)

  // Seed du n° de réf : identité + période (déterministe, non-secret).
  const seed = `${text(input.identity.fullName)}|${text(input.identity.clubName)}|${input.period}`
  const reference = buildReference(seed, input.period)
  const base = (input.verificationBaseUrl ?? DEFAULT_VERIFY_BASE).replace(/\/+$/, '')
  const verificationUrl = `${base}/${encodeURIComponent(reference)}`

  return {
    reference,
    verificationUrl,
    generatedAtIso: input.generatedAt.toISOString(),
    periodLabel: input.period,

    fullName: text(input.identity.fullName),
    clubName: text(input.identity.clubName),
    clubCity: text(input.identity.clubCity),
    joinedAtIso: input.identity.joinedAt ?? null,
    brokerName: text(input.identity.brokerName ?? DEFAULT_BROKER),
    brokerAccountRef: text(input.identity.brokerAccountRef),
    postalAddress: text(input.identity.postalAddress),

    detentionPct: { value: num(c?.detentionPct ?? null), format: 'pct' },
    totalContributed: { value: num(c?.totalContributed ?? null), format: 'eur' },
    quotePartValue: { value: num(c?.netMarketValue ?? null), format: 'eur' },
    // Valorisation portefeuille = total agrégat « Portefeuille » (espèces + soldes inclus),
    // pour COÏNCIDER avec la page /portfolio. Fallback Σ positions si l'agrégat est absent.
    portfolioValue: {
      value: num(input.portfolioTotalValue) ?? sumPortfolioValue(input.positions),
      format: 'eur',
    },

    yearInvested: { value: yearInvested, format: 'eur' },
    // Capacité restante = plafond annuel − investissement cumulé de l'année.
    // Plafond absent (clubs.annual_investment_cap null) → non calculable → `—`.
    yearRemainingCapacity: { value: yearRemainingCapacity, format: 'eur' },
    monthClubEffort: { value: monthEffort(input.months, year, month), format: 'eur' },
  }
}
