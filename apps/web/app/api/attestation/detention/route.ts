// GET /api/attestation/detention?clubId=…&period=YYYY-MM — PDF d'attestation de détention (NTF-004).
//
// Document à VALEUR réelle. Garde-fous :
//   - authentification via session cookie Supabase → 401
//   - résolution du club : ?clubId=… sinon dernière adhésion active → 404 si aucun
//   - un membre n'exporte que SA propre attestation de SON club : la RLS isole déjà toutes
//     les lectures par auth.uid() ; on cible le `membership_id` du membre courant. Si aucune
//     adhésion active sur le club demandé → 403 (pas membre de ce club).
//   - assemble le DTO (fetch + mapper PUR), renderToBuffer, renvoie application/pdf en pièce jointe.
//
// JAMAIS de service-role ici — données nominatives, la RLS DOIT s'appliquer.
// Node runtime obligatoire (renderToBuffer @react-pdf + qrcode).
//
// Réf : NTF-004, DATA_MODEL.md §2.6/§2.7/§2.4, CLAUDE.md (RLS, jamais de service-role côté membre).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createServerClient } from '@evolve/data'
import {
  mapAttestation,
  renderAttestationPdf,
  type AttestationInput,
  type AttestationMonthInput,
  type AttestationPositionInput,
} from '@evolve/data/pdf'

export const runtime = 'nodejs'

/** Slugifie le nom du club pour le filename (ascii, kebab). */
function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'club'
  )
}

/** Période courante « YYYY-MM » (défaut si non fournie / invalide). */
function currentPeriod(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const supabase = createServerClient(cookieStore)

  const { data: auth, error: authError } = await supabase.auth.getUser()
  // Pas de session → getUser() renvoie une AuthSessionMissingError. Côté API (appel direct,
  // pas de redirect middleware), c'est un 401 « non authentifié », pas un 500.
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }
  const userId = auth.user.id

  const url = new URL(request.url)
  const rawPeriod = url.searchParams.get('period')
  const period = rawPeriod && /^\d{4}-\d{2}$/.test(rawPeriod) ? rawPeriod : currentPeriod()

  let clubId = url.searchParams.get('clubId')
  if (!clubId) {
    const { data: m } = await supabase
      .from('memberships')
      .select('club_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ club_id: string }>()
    clubId = m?.club_id ?? null
  }
  if (!clubId) {
    return NextResponse.json({ error: 'Aucun club.' }, { status: 404 })
  }

  // Adhésion active du membre courant sur CE club. RLS isole déjà par auth.uid() ; l'absence
  // d'adhésion (autre club, ou pas membre) → 403 : un membre n'exporte que SA propre attestation.
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, joined_at')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle<{ id: string; joined_at: string }>()
  if (membershipError) {
    return NextResponse.json({ error: 'Erreur de chargement.' }, { status: 500 })
  }
  if (!membership) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const membershipId = membership.id

  try {
    // Fetchs parallèles (indépendants) — tous filtrés/isolés par RLS.
    const [
      { data: userRow },
      { data: clubRow },
      { data: contributionRow },
      { data: positionRows },
      { data: monthRows },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('full_name, address, postal_address')
        .eq('id', userId)
        .maybeSingle<{
          full_name: string | null
          address: string | null
          postal_address: string | null
        }>(),
      supabase
        .from('clubs')
        .select('name, city, broker_account_ref, annual_investment_cap')
        .eq('id', clubId)
        .maybeSingle<{
          name: string | null
          city: string | null
          broker_account_ref: string | null
          annual_investment_cap: number | null
        }>(),
      supabase
        .from('contributions')
        .select('detention_pct, total_contributed, net_market_value, status, amount_due, penalties')
        .eq('membership_id', membershipId)
        .maybeSingle<{
          detention_pct: number | null
          total_contributed: number | null
          net_market_value: number | null
          status: string | null
          amount_due: number | null
          penalties: number | null
        }>(),
      supabase
        .from('positions')
        .select('quantity, market_value')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .returns<{ quantity: number | null; market_value: number | null }[]>(),
      supabase
        .from('contribution_months')
        .select('year, month, amount, status')
        .eq('membership_id', membershipId)
        .returns<{ year: number; month: number; amount: number | null; status: string | null }[]>(),
    ])

    // Pas de valo live serveur (la valo intraday est frontend, cf. CLAUDE.md) → on s'appuie sur
    // le snapshot DB (market_value). livePrice null → le mapper retombe sur le snapshot.
    const positions: AttestationPositionInput[] = (positionRows ?? []).map((p) => ({
      quantity: p.quantity,
      marketValue: p.market_value,
      livePrice: null,
    }))

    const months: AttestationMonthInput[] = (monthRows ?? []).map((m) => ({
      year: m.year,
      month: m.month,
      amount: m.amount,
      status: m.status,
    }))

    const verificationBaseUrl = `${url.origin}/verifier`

    const input: AttestationInput = {
      identity: {
        fullName: userRow?.full_name ?? null,
        clubName: clubRow?.name ?? null,
        clubCity: clubRow?.city ?? null,
        joinedAt: membership.joined_at,
        brokerAccountRef: clubRow?.broker_account_ref ?? null, // clubs.broker_account_ref (022)
        // Adresse dédiée attestation (postal_address) sinon adresse importée de Base (address).
        postalAddress: userRow?.postal_address ?? userRow?.address ?? null,
        brokerName: null, // défaut « Bourse Direct »
        annualInvestmentCap: clubRow?.annual_investment_cap ?? null, // → capacité restante (022)
      },
      contribution: contributionRow
        ? {
            detentionPct: contributionRow.detention_pct,
            totalContributed: contributionRow.total_contributed,
            netMarketValue: contributionRow.net_market_value,
            status: contributionRow.status,
            amountDue: contributionRow.amount_due,
            penalties: contributionRow.penalties,
          }
        : null,
      positions,
      months,
      period,
      generatedAt: new Date(),
      verificationBaseUrl,
    }

    const data = mapAttestation(input)
    const pdf = await renderAttestationPdf(data)

    const filename = `attestation-detention-${slugify(data.clubName)}-${period}.pdf`
    // Uint8Array vue sur le Buffer → BodyInit accepté par NextResponse (typage strict).
    const body = new Uint8Array(pdf)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur de génération.' }, { status: 500 })
  }
}
