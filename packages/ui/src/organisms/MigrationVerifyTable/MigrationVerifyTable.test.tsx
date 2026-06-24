import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  MigrationVerifyTable,
  countMismatches,
  type ClubVerifyData,
  type MigrationVerifyRow,
} from './MigrationVerifyTable'

expect.extend(toHaveNoViolations)

function row(
  key: string,
  metric: string,
  kind: 'cash' | 'count',
  legacy: number,
  operations: number
): MigrationVerifyRow {
  const delta = operations - legacy
  return { key, metric, kind, legacy, operations, delta, ok: delta === 0 }
}

const CLUB_OK: ClubVerifyData = {
  clubId: 'evolve',
  clubName: 'Evolve Capital',
  rows: [
    row('cash', 'Solde espèces', 'cash', 12_540.5, 12_540.5),
    row('contributions', 'Cotisations', 'count', 312, 312),
    row('transactions', 'Transactions', 'count', 87, 87),
  ],
}

const CLUB_MISMATCH: ClubVerifyData = {
  clubId: 'lyon',
  clubName: 'Cercle Lyonnais',
  rows: [
    row('cash', 'Solde espèces', 'cash', 8_000, 7_850.25),
    row('contributions', 'Cotisations', 'count', 140, 140),
    row('transactions', 'Transactions', 'count', 51, 48),
  ],
}

describe('countMismatches — comptage des écarts', () => {
  it('0 si tous les deltas sont nuls', () => {
    expect(countMismatches(CLUB_OK.rows)).toBe(0)
  })
  it('compte les lignes ok=false', () => {
    expect(countMismatches(CLUB_MISMATCH.rows)).toBe(2)
  })
  it('liste vide → 0 (jamais de NaN)', () => {
    expect(countMismatches([])).toBe(0)
  })
})

describe('MigrationVerifyTable — rendu', () => {
  it('rend une ligne par métrique', () => {
    render(<MigrationVerifyTable clubs={[CLUB_OK]} />)
    expect(screen.getAllByTestId('migration-verify-row')).toHaveLength(3)
  })

  it('club cohérent → bandeau « tout cohérent » + 3 badges ✓', () => {
    render(<MigrationVerifyTable clubs={[CLUB_OK]} />)
    expect(screen.getByText('Toutes les métriques sont cohérentes.')).toBeInTheDocument()
    expect(screen.getAllByText('Cohérent')).toHaveLength(3)
    expect(screen.queryByText('Écart détecté')).toBeNull()
  })

  it('club avec écarts → ✗ signalés + bandeau « N écarts »', () => {
    render(<MigrationVerifyTable clubs={[CLUB_MISMATCH]} />)
    expect(screen.getByText('2 écarts détectés à investiguer.')).toBeInTheDocument()
    expect(screen.getAllByText('Écart détecté')).toHaveLength(2)
    expect(screen.getByText('Cohérent')).toBeInTheDocument()
  })

  it('delta compteur → signe explicite (-3)', () => {
    render(<MigrationVerifyTable clubs={[CLUB_MISMATCH]} />)
    expect(screen.getByText('-3')).toBeInTheDocument()
  })

  it('solde espèces → formaté en euros (locale FR)', () => {
    render(<MigrationVerifyTable clubs={[CLUB_OK]} />)
    // formatEUR → NBSP comme séparateur de milliers et avant €.
    expect(screen.getAllByText(/12\s?540,50\s?€/).length).toBeGreaterThan(0)
  })

  it('multi-clubs → une section par club (vue network admin)', () => {
    render(<MigrationVerifyTable clubs={[CLUB_OK, CLUB_MISMATCH]} />)
    expect(screen.getAllByTestId('migration-verify-club')).toHaveLength(2)
    expect(screen.getByText('Evolve Capital')).toBeInTheDocument()
    expect(screen.getByText('Cercle Lyonnais')).toBeInTheDocument()
  })

  it('valeur non-finie → « — » (jamais NaN/undefined)', () => {
    const broken: ClubVerifyData = {
      clubId: 'x',
      clubName: 'Club X',
      rows: [row('cash', 'Solde espèces', 'cash', NaN, NaN)],
    }
    render(<MigrationVerifyTable clubs={[broken]} />)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('état vide → EmptyState « Aucune donnée à comparer »', () => {
    render(<MigrationVerifyTable clubs={[]} />)
    expect(screen.getByText('Aucune donnée à comparer')).toBeInTheDocument()
  })

  it('état erreur → EmptyState « Vérification indisponible »', () => {
    render(<MigrationVerifyTable clubs={[]} isError />)
    expect(screen.getByText('Vérification indisponible')).toBeInTheDocument()
  })

  it('labels i18n injectés (statuts + colonnes)', () => {
    render(
      <MigrationVerifyTable
        clubs={[CLUB_OK]}
        labels={{
          okLabel: 'OK',
          columns: { metric: 'Metric' },
          clubOkSummary: 'All consistent.',
        }}
      />
    )
    expect(screen.getAllByText('OK')).toHaveLength(3)
    expect(screen.getByText('Metric')).toBeInTheDocument()
    expect(screen.getByText('All consistent.')).toBeInTheDocument()
  })
})

describe('MigrationVerifyTable — accessibilité (jest-axe)', () => {
  it('pas de violations axe (club cohérent + club avec écarts)', async () => {
    const { container } = render(<MigrationVerifyTable clubs={[CLUB_OK, CLUB_MISMATCH]} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
