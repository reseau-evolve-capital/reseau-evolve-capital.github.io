import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import type { PortfolioPosition } from '@evolve/types'
import { DataRow } from './DataRow'

expect.extend(toHaveNoViolations)

const pos: PortfolioPosition = {
  id: '1',
  name: 'META PLATFORMS',
  symbol: 'NASDAQ:META',
  category: 'Actions',
  sector: 'Technologie',
  quantity: 248,
  pru: 450,
  livePrice: 585,
  currentValue: 145050,
  gainLossEur: 31834,
  gainLossPct: 0.28,
  allocationPct: 0.12,
  isLive: true,
}

describe('DataRow', () => {
  it('affiche nom, "parts × cours = valeur" et la perf en %', () => {
    render(<DataRow position={pos} />)
    expect(screen.getByText('META PLATFORMS')).toBeInTheDocument()
    expect(screen.getByText(/248 parts/)).toBeInTheDocument()
    // formatPct(0.28) → "+28,00 %" (NBSP). On matche de façon tolérante au NBSP.
    expect(screen.getByText(/\+28,00[\s ]%/)).toBeInTheDocument()
  })

  it('affiche "—" pour le cours quand livePrice est null', () => {
    render(<DataRow position={{ ...pos, livePrice: null, isLive: false }} />)
    expect(screen.getByText(/× —/)).toBeInTheDocument()
  })

  it('appelle onClick au clic', async () => {
    const onClick = vi.fn()
    render(<DataRow position={pos} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('rend un skeleton quand isLoading', () => {
    render(<DataRow position={pos} isLoading />)
    expect(screen.queryByText('META PLATFORMS')).not.toBeInTheDocument()
  })

  it("n'a aucune violation a11y", async () => {
    const { container } = render(<DataRow position={pos} onClick={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
