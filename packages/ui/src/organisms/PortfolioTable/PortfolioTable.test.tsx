import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import type { PortfolioPosition } from '@evolve/types'
import { PortfolioTable } from './PortfolioTable'

expect.extend(toHaveNoViolations)

const make = (over: Partial<PortfolioPosition>): PortfolioPosition => ({
  id: '1',
  name: 'META',
  symbol: 'NASDAQ:META',
  category: 'Actions',
  sector: 'Technologie',
  quantity: 10,
  pru: 100,
  livePrice: 200,
  currentValue: 2000,
  gainLossEur: 1000,
  gainLossPct: 1,
  allocationPct: 0.5,
  isLive: true,
  ...over,
})

const rows = [
  make({ id: '1', name: 'META', currentValue: 2000 }),
  make({ id: '2', name: 'NVIDIA', currentValue: 5000, gainLossPct: -0.1, gainLossEur: -500 }),
]

describe('PortfolioTable', () => {
  it('rend un <table> sémantique avec en-têtes scopés', () => {
    render(<PortfolioTable positions={rows} onRowClick={() => {}} />)
    expect(screen.getByRole('table', { name: /portefeuille/i })).toBeInTheDocument()
    const headers = screen.getAllByRole('columnheader')
    expect(headers.length).toBe(8)
    expect(headers[0]).toHaveAttribute('scope', 'col')
  })

  it('appelle onRowClick avec la position au clic ligne', async () => {
    const onRowClick = vi.fn()
    render(<PortfolioTable positions={rows} onRowClick={onRowClick} />)
    await userEvent.click(screen.getByText('META'))
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'META' }))
  })

  it('tri par valeur : aria-sort bascule descending → ascending au clic', async () => {
    render(<PortfolioTable positions={rows} onRowClick={() => {}} />)
    const valHeader = screen.getByRole('columnheader', { name: /Valeur/i })
    expect(valHeader).toHaveAttribute('aria-sort', 'descending') // défaut currentValue desc
    await userEvent.click(within(valHeader).getByRole('button'))
    expect(valHeader).toHaveAttribute('aria-sort', 'ascending')
  })

  it("affiche l'EmptyState quand aucune position", () => {
    render(<PortfolioTable positions={[]} onRowClick={() => {}} />)
    expect(screen.getByText(/aucune position/i)).toBeInTheDocument()
  })

  it("n'a aucune violation a11y", async () => {
    const { container } = render(<PortfolioTable positions={rows} onRowClick={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('perf négative : cellule en text-data-negative, jamais brand-red', () => {
    const { container } = render(<PortfolioTable positions={rows} onRowClick={() => {}} />)
    expect(container.innerHTML).toContain('data-negative')
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })

  it("activation clavier d'une ligne (Enter) → onRowClick", async () => {
    const onRowClick = vi.fn()
    render(<PortfolioTable positions={rows} onRowClick={onRowClick} />)
    const row = screen.getByLabelText(/Voir le détail de META/i)
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'META' }))
  })
})
