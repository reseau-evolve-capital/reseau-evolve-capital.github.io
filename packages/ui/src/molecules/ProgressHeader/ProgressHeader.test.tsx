import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ProgressHeader } from './ProgressHeader'

expect.extend(toHaveNoViolations)

describe('ProgressHeader — accessibilité', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<ProgressHeader step={1} total={3} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('ProgressHeader — rendu', () => {
  it('affiche "Étape 1 sur 3"', () => {
    const { getByText } = render(<ProgressHeader step={1} total={3} />)
    expect(getByText('Étape 1 sur 3')).toBeTruthy()
  })

  it('affiche "Étape 2 sur 4"', () => {
    const { getByText } = render(<ProgressHeader step={2} total={4} />)
    expect(getByText('Étape 2 sur 4')).toBeTruthy()
  })

  it('le progressbar a aria-label correspondant au label', () => {
    const { getByRole } = render(<ProgressHeader step={3} total={3} />)
    expect(getByRole('progressbar', { name: 'Étape 3 sur 3' })).toBeTruthy()
  })
})
