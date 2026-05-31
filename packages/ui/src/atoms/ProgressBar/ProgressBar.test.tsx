import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ProgressBar } from './ProgressBar'

expect.extend(toHaveNoViolations)

describe('ProgressBar — accessibilité', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<ProgressBar value={50} label="Étape 1 sur 2" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('ProgressBar — rendu et clamping', () => {
  it('rend aria-valuenow à la valeur normale', () => {
    const { getByRole } = render(<ProgressBar value={33} label="Étape 1 sur 3" />)
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33')
  })

  it('clamp valeur > 100 → aria-valuenow vaut 100', () => {
    const { getByRole } = render(<ProgressBar value={150} label="Dépassement" />)
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('clamp valeur < 0 → aria-valuenow vaut 0', () => {
    const { getByRole } = render(<ProgressBar value={-10} label="Valeur négative" />)
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('aria-valuemin vaut 0 et aria-valuemax vaut 100', () => {
    const { getByRole } = render(<ProgressBar value={50} label="Moitié" />)
    const el = getByRole('progressbar')
    expect(el).toHaveAttribute('aria-valuemin', '0')
    expect(el).toHaveAttribute('aria-valuemax', '100')
  })

  it('aria-label correspond au label passé en prop', () => {
    const { getByRole } = render(<ProgressBar value={66} label="Étape 2 sur 3" />)
    expect(getByRole('progressbar', { name: 'Étape 2 sur 3' })).toBeTruthy()
  })
})
