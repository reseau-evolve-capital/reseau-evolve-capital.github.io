import { render } from '@testing-library/react'
import { TrendBadge } from './TrendBadge'

describe('TrendBadge — règle brand-red', () => {
  it('direction down ne contient JAMAIS #E93E3A (brand-red)', () => {
    const { container } = render(<TrendBadge direction="down" value="-5,2 %" />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })

  it('direction down utilise data-negative dans ses classes', () => {
    const { container } = render(<TrendBadge direction="down" value="-5,2 %" />)
    expect(container.innerHTML).toContain('data-negative')
  })

  it('direction up affiche ▲', () => {
    const { getAllByText } = render(<TrendBadge direction="up" value="+1,2 %" />)
    expect(getAllByText('▲').length).toBeGreaterThan(0)
  })

  it('affiche subValue si fourni', () => {
    const { getByText } = render(<TrendBadge direction="up" value="+1,2 %" subValue="+773 €" />)
    expect(getByText('+773 €')).toBeTruthy()
  })
})
