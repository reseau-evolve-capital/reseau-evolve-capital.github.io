import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  NetworkClubsTable,
  deriveSyncStatus,
  DEFAULT_STALE_AFTER_MS,
  type NetworkClubRow,
} from './NetworkClubsTable'

expect.extend(toHaveNoViolations)

const NOW = new Date('2026-06-18T12:00:00Z')

const CLUBS: NetworkClubRow[] = [
  {
    id: 'evolve',
    name: 'Evolve Capital',
    slug: 'evolve-capital',
    activeMembersCount: 18,
    aggregatedValuation: 642_188.42,
    lastSyncedAt: '2026-06-18T10:30:00Z',
    matrixConnected: true,
  },
  {
    id: 'nouveau',
    name: 'Nouveau Club',
    slug: 'nouveau-club',
    activeMembersCount: 0,
    aggregatedValuation: null,
    lastSyncedAt: null,
    matrixConnected: false,
  },
]

describe('deriveSyncStatus — mapping statut sync → token', () => {
  it('null → never (jamais synchronisé)', () => {
    expect(deriveSyncStatus(null, NOW)).toBe('never')
  })

  it('date invalide → never (jamais de crash)', () => {
    expect(deriveSyncStatus('pas-une-date', NOW)).toBe('never')
  })

  it('sync récente → ok', () => {
    expect(deriveSyncStatus('2026-06-18T10:30:00Z', NOW)).toBe('ok')
  })

  it('sync au-delà du seuil → stale', () => {
    // 25 h avant NOW → > DEFAULT_STALE_AFTER_MS (24 h)
    const old = new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString()
    expect(deriveSyncStatus(old, NOW)).toBe('stale')
  })

  it('respecte un seuil personnalisé', () => {
    const fortyMinAgo = new Date(NOW.getTime() - 40 * 60 * 1000).toISOString()
    expect(deriveSyncStatus(fortyMinAgo, NOW, 30 * 60 * 1000)).toBe('stale')
    expect(deriveSyncStatus(fortyMinAgo, NOW, DEFAULT_STALE_AFTER_MS)).toBe('ok')
  })
})

describe('NetworkClubsTable — rendu', () => {
  it('rend 1 ligne par club', () => {
    render(<NetworkClubsTable clubs={CLUBS} now={NOW} />)
    expect(screen.getAllByTestId('network-club-row')).toHaveLength(2)
  })

  it('valo absente → « — » explicité (jamais NaN/undefined)', () => {
    render(<NetworkClubsTable clubs={[CLUBS[1]!]} now={NOW} />)
    // Le « — » muet porte un aria-label/title parlant.
    expect(screen.getByLabelText('Valorisation indisponible')).toBeInTheDocument()
  })

  it('club neuf → matrice « Non connectée » + « Jamais synchronisé »', () => {
    render(<NetworkClubsTable clubs={[CLUBS[1]!]} now={NOW} />)
    expect(screen.getByText('Non connectée')).toBeInTheDocument()
    expect(screen.getByText('Jamais synchronisé')).toBeInTheDocument()
  })

  it('valo présente → formatée en euros (locale FR)', () => {
    render(<NetworkClubsTable clubs={[CLUBS[0]!]} now={NOW} />)
    // formatEUR → NBSP comme séparateur de milliers et avant €.
    expect(screen.getByText(/642\s?188,42\s?€/)).toBeInTheDocument()
  })

  it('état vide → EmptyState « Aucun club »', () => {
    render(<NetworkClubsTable clubs={[]} now={NOW} />)
    expect(screen.getByText('Aucun club')).toBeInTheDocument()
    expect(screen.getByText('Ajoute un premier club pour démarrer le réseau.')).toBeInTheDocument()
  })
})

describe('NetworkClubsTable — actions', () => {
  it('onView / onSync remontent le club cliqué', async () => {
    const u = userEvent.setup()
    const onView = vi.fn()
    const onSync = vi.fn()
    render(<NetworkClubsTable clubs={[CLUBS[0]!]} now={NOW} onView={onView} onSync={onSync} />)
    await u.click(screen.getByRole('button', { name: /Voir le club Evolve Capital/i }))
    await u.click(screen.getByRole('button', { name: /Synchroniser le club Evolve Capital/i }))
    expect(onView).toHaveBeenCalledWith(CLUBS[0])
    expect(onSync).toHaveBeenCalledWith(CLUBS[0])
  })

  it('sans callbacks → pas de colonne actions (lecture seule)', () => {
    render(<NetworkClubsTable clubs={[CLUBS[0]!]} now={NOW} />)
    expect(screen.queryByRole('button', { name: /Voir le club/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Synchroniser le club/i })).toBeNull()
  })
})

describe('NetworkClubsTable — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(
      <NetworkClubsTable clubs={CLUBS} now={NOW} onView={() => {}} onSync={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
