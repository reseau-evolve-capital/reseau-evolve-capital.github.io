import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Logo } from './Logo'

expect.extend(toHaveNoViolations)

describe('Logo — accessibilité', () => {
  it('variant full : pas de violations axe', async () => {
    const { container } = render(<Logo variant="full" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('variant mark : pas de violations axe', async () => {
    const { container } = render(<Logo variant="mark" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('affiche "Evolve Capital" en variant full', () => {
    const { getByText } = render(<Logo variant="full" />)
    expect(getByText('Evolve Capital')).toBeTruthy()
  })

  it('masque le texte en variant mark', () => {
    const { queryByText } = render(<Logo variant="mark" />)
    expect(queryByText('Evolve Capital')).toBeNull()
  })
})
