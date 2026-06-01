import { render, screen, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MembersList, type MemberRow } from './MembersList'

expect.extend(toHaveNoViolations)

const MEMBERS: MemberRow[] = [
  {
    id: '1',
    fullName: 'AFOUDAH Ruben',
    email: 'ruben@x.fr',
    role: 'treasurer',
    totalContributed: 4200,
    detentionPct: 0.18,
    monthsCount: 24,
    status: 'ok',
  },
  {
    id: '2',
    fullName: 'BAMBA Inès',
    email: 'ines@x.fr',
    role: 'member',
    totalContributed: 1200,
    detentionPct: 0.05,
    monthsCount: 12,
    status: 'late',
  },
  {
    id: '3',
    fullName: 'COLY Marc',
    email: 'marc@x.fr',
    role: 'member',
    totalContributed: 800,
    detentionPct: 0.03,
    monthsCount: 8,
    status: null,
  },
]

describe('MembersList — rendu', () => {
  it('rend 1 ligne par membre + en-tête Statut scopé', () => {
    render(<MembersList members={MEMBERS} />)
    const rows = screen.getAllByTestId('member-row')
    expect(rows).toHaveLength(3)

    const headers = screen.getAllByRole('columnheader')
    const statutHeader = headers.find((h) => h.textContent === 'Statut')
    expect(statutHeader).toHaveAttribute('scope', 'col')
  })

  it('formate le total EUR en locale FR', () => {
    render(<MembersList members={MEMBERS} />)
    // formatEUR(4200) — on cherche le texte dans le document
    const container = screen.getByRole('table')
    expect(container.textContent).toMatch(/4\s*200/)
    expect(container.textContent).toMatch(/€/)
  })

  it('formate la quote-part en pourcentage', () => {
    render(<MembersList members={MEMBERS} />)
    // formatPct(0.18, {showSign: false}) → "18 %" ou "18%"
    const container = screen.getByRole('table')
    expect(container.textContent).toMatch(/18/)
    expect(container.textContent).toMatch(/%/)
  })

  it('affiche — pour status null', () => {
    render(<MembersList members={MEMBERS} />)
    // COLY Marc a status: null
    const rows = screen.getAllByTestId('member-row')
    // Le tri par défaut est totalContributed desc : AFOUDAH(4200), BAMBA(1200), COLY(800)
    expect(rows).toHaveLength(3)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const colyRow = rows[2]!
    expect(within(colyRow).getByText('—')).toBeInTheDocument()
  })

  it('état vide → EmptyState « Aucun membre »', () => {
    render(<MembersList members={[]} />)
    expect(screen.getByText('Aucun membre')).toBeInTheDocument()
  })
})

describe('MembersList — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<MembersList members={MEMBERS} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
