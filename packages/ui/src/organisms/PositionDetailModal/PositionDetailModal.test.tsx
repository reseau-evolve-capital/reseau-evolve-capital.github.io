import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import type { PortfolioPosition } from '@evolve/types'
import { PositionDetailModal } from './PositionDetailModal'

expect.extend(toHaveNoViolations)

const pos: PortfolioPosition = {
  id: '1',
  name: 'META PLATFORMS',
  symbol: 'NASDAQ:META',
  category: 'Actions',
  sector: 'Technologie',
  typologie: 'Offensif',
  quantity: 248,
  pru: 450,
  livePrice: 585,
  marketPrice: 585,
  currentValue: 145050,
  gainLossEur: 31834,
  gainLossPct: 0.28,
  allocationPct: 0.12,
  isLive: true,
}

describe('PositionDetailModal', () => {
  it('ouverte : titre, symbole et stats visibles', () => {
    render(<PositionDetailModal position={pos} open onOpenChange={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('META PLATFORMS')).toBeInTheDocument()
    expect(screen.getByText('NASDAQ:META')).toBeInTheDocument()
    expect(screen.getByText('Quantité')).toBeInTheDocument()
    expect(screen.getByText('% du portefeuille')).toBeInTheDocument()
  })

  it('ne rend rien quand position est null', () => {
    render(<PositionDetailModal position={null} open onOpenChange={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Cours affiche "—" quand livePrice est null', () => {
    render(
      <PositionDetailModal
        position={{ ...pos, livePrice: null, isLive: false }}
        open
        onOpenChange={() => {}}
      />
    )
    const coursLabel = screen.getByText('Cours')
    expect(coursLabel.parentElement?.textContent).toContain('—')
  })

  it('perte : classe data-negative présente, jamais de rouge brand', () => {
    const { baseElement } = render(
      <PositionDetailModal
        position={{ ...pos, gainLossPct: -0.08, gainLossEur: -1200 }}
        open
        onOpenChange={() => {}}
      />
    )
    expect(baseElement.innerHTML).toContain('data-negative')
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
    expect(baseElement.innerHTML).not.toContain('brand-red')
  })

  it('Escape déclenche onOpenChange(false)', async () => {
    const onOpenChange = vi.fn()
    render(<PositionDetailModal position={pos} open onOpenChange={onOpenChange} />)
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("n'a aucune violation a11y", async () => {
    const { baseElement } = render(
      <PositionDetailModal position={pos} open onOpenChange={() => {}} />
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
