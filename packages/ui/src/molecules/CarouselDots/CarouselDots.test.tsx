import { render, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { CarouselDots } from './CarouselDots'

expect.extend(toHaveNoViolations)

describe('CarouselDots — accessibilité', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<CarouselDots count={3} active={0} onSelect={() => undefined} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('CarouselDots — interaction', () => {
  it('cliquer sur le point 2 appelle onSelect(1)', () => {
    const handler = vi.fn()
    const { getByRole } = render(<CarouselDots count={3} active={0} onSelect={handler} />)
    fireEvent.click(getByRole('tab', { name: 'Aller à la slide 2' }))
    expect(handler).toHaveBeenCalledWith(1)
  })

  it('le point actif a aria-selected=true', () => {
    const { getByRole } = render(<CarouselDots count={3} active={1} onSelect={() => undefined} />)
    const dot2 = getByRole('tab', { name: 'Aller à la slide 2' })
    expect(dot2).toHaveAttribute('aria-selected', 'true')
  })

  it('rend autant de tabs que count', () => {
    const { getAllByRole } = render(
      <CarouselDots count={5} active={0} onSelect={() => undefined} />
    )
    expect(getAllByRole('tab')).toHaveLength(5)
  })
})
