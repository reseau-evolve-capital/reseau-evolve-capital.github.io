import { describe, it, expect } from 'vitest'

import type { createServerClient } from '@evolve/data'

import { contributionStatusLabel, getDashboardData, type ContributionStatus } from './dashboard'

type ServerClient = ReturnType<typeof createServerClient>

/** Réponse `{ data, error }` retournée par un terminateur `maybeSingle`. */
type SingleResult = { data: unknown; error: unknown }

/**
 * Construit un faux client Supabase chaînable (zéro réseau).
 * `.from(table)` renvoie un objet dont `.select().eq()....maybeSingle()`
 * résout vers la fixture associée à la table. Les `.eq()` se chaînent à
 * l'infini ; seul `.maybeSingle()` termine la chaîne.
 */
function makeSupabaseMock(fixtures: Record<string, SingleResult>): ServerClient {
  const from = (table: string) => {
    const result = fixtures[table] ?? { data: null, error: null }
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.eq = () => chain
    chain.maybeSingle = () => Promise.resolve(result)
    return chain
  }
  return { from } as unknown as ServerClient
}

describe('contributionStatusLabel', () => {
  it.each([
    ['ok', 'À jour'],
    ['pending', 'En attente'],
    ['late', 'En retard'],
    ['exempt', 'Exempté'],
  ] as [ContributionStatus, string][])('mappe %s → %s', (status, label) => {
    expect(contributionStatusLabel(status)).toBe(label)
  })

  it('retourne le fallback "—" pour une valeur hors enum', () => {
    expect(contributionStatusLabel('unknown' as ContributionStatus)).toBe('—')
  })
})

describe('getDashboardData', () => {
  it('retourne null si member_quote_part est vide (état empty)', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: { data: null, error: null },
    })
    const result = await getDashboardData(supabase, 'user-1', 'club-1')
    expect(result).toBeNull()
  })

  it('rejette si la requête member_quote_part renvoie une erreur', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: { data: null, error: { message: 'boom' } },
    })
    await expect(getDashboardData(supabase, 'user-1', 'club-1')).rejects.toThrow()
  })

  it('coerce les colonnes numériques (string → number) et compose le DTO', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: {
        data: {
          role: 'member',
          joined_at: '2018-06-01',
          detention_pct: '0.1234',
          total_contributed: '12000',
          net_market_value: '65574.87',
          contribution_status: 'ok',
          amount_due: '0',
        },
        error: null,
      },
      users: { data: { firstname: 'Ruben', full_name: 'AFOUDAH Ruben' }, error: null },
      // E2 : syncedAt vient de clubs.synced_at (timestamp du club), pas de member_quote_part.
      clubs: { data: { name: 'Club Test', synced_at: '2026-06-05T10:00:00Z' }, error: null },
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')

    expect(result).not.toBeNull()
    // E2 : la source du statut de sync est clubs.synced_at (unifiée avec la topbar desktop).
    expect(result?.syncedAt).toBe('2026-06-05T10:00:00Z')
    // Coercition Number() : valeurs numériques renvoyées comme number, pas string.
    expect(result?.netMarketValue).toBe(65574.87)
    expect(typeof result?.netMarketValue).toBe('number')
    expect(result?.detentionPct).toBe(0.1234)
    expect(result?.totalContributed).toBe(12000)
    expect(result?.clubId).toBe('club-1')
    expect(result?.contribution.status).toBe('ok')
    expect(result?.contribution.amountDue).toBe(0)
    expect(result?.club.name).toBe('Club Test')
    expect(result?.member.firstname).toBe('Ruben')
    expect(result?.member.fullName).toBe('AFOUDAH Ruben')
    expect(result?.member.role).toBe('member')
  })

  it('retombe sur "Membre" quand le profil utilisateur est absent', async () => {
    const supabase = makeSupabaseMock({
      member_quote_part: {
        data: {
          role: 'member',
          joined_at: null,
          detention_pct: '0',
          total_contributed: '0',
          net_market_value: '0',
          contribution_status: 'pending',
          amount_due: '0',
        },
        error: null,
      },
      users: { data: null, error: null },
      // clubs.synced_at absent → syncedAt retombe sur null (état « jamais synchronisé »).
      clubs: { data: { name: 'Club Test' }, error: null },
    })

    const result = await getDashboardData(supabase, 'user-1', 'club-1')

    expect(result?.member.fullName).toBe('Membre')
    expect(result?.member.firstname).toBeNull()
    expect(result?.syncedAt).toBeNull()
  })
})
