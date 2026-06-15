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

describe('DataRow', () => {
  it('affiche nom, "parts × cours = valeur" et la perf en %', () => {
    render(<DataRow position={pos} />)
    expect(screen.getByText('META PLATFORMS')).toBeInTheDocument()
    expect(screen.getByText(/248 parts/)).toBeInTheDocument()
    // formatPct(0.28) → "+28,00 %" (NBSP). On matche de façon tolérante au NBSP.
    expect(screen.getByText(/\+28,00[\s ]%/)).toBeInTheDocument()
  })

  it('replie sur le cours matrice quand livePrice est null', () => {
    render(<DataRow position={{ ...pos, livePrice: null, isLive: false }} />)
    // marketPrice (585) sert de repli d'affichage → pas de "—" (QA 2026-06-07).
    expect(screen.getByText(/× 585,00[\s ]€/)).toBeInTheDocument()
  })

  it('affiche "—" pour le cours quand livePrice ET marketPrice sont null', () => {
    render(<DataRow position={{ ...pos, livePrice: null, marketPrice: null, isLive: false }} />)
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

  it('variante statique (sans onClick) : aucune violation a11y', async () => {
    const { container } = render(<DataRow position={pos} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('perte : classe data-negative présente, jamais de rouge brand', () => {
    const { container } = render(
      <DataRow position={{ ...pos, gainLossPct: -0.08, gainLossEur: -1200 }} />
    )
    expect(container.innerHTML).toContain('data-negative')
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })

  // RT-02 : la valeur de perf (%) réserve une colonne droite (`pr-*`) pour que l'InfoTip
  // superposé en absolu n'empiète jamais dessus (chevauchement (i) ↔ %, retours prod
  // 2026-06-15). Vérif structurelle (robuste en jsdom) ; le non-chevauchement géométrique
  // est couvert par la story `PerfInfoNoOverlap` (play sur les bounding boxes).
  it("réserve l'espace de l'InfoTip à droite du % (padding droit)", () => {
    const { container } = render(<DataRow position={{ ...pos, gainLossPct: -0.1234 }} />)
    const pct = screen.getByText(/-12,34[\s ]%/)
    expect(pct.className).toMatch(/\bpr-\d/)
    // L'espace réservé doit être présent que la carte soit cliquable ou non.
    expect(container.querySelector('[class*="pr-"]')).not.toBeNull()
  })
})
