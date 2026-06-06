import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SegmentedProgress } from './SegmentedProgress'

expect.extend(toHaveNoViolations)

describe('SegmentedProgress — accessibilité', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<SegmentedProgress step={2} total={3} label="Étape 2 sur 3" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('SegmentedProgress — rendu', () => {
  it('expose un progressbar avec aria-label, valuenow/min/max', () => {
    const { getByRole } = render(<SegmentedProgress step={2} total={3} label="Étape 2 sur 3" />)
    const bar = getByRole('progressbar', { name: 'Étape 2 sur 3' })
    expect(bar.getAttribute('aria-valuenow')).toBe('2')
    expect(bar.getAttribute('aria-valuemin')).toBe('1')
    expect(bar.getAttribute('aria-valuemax')).toBe('3')
  })

  it('rend autant de segments décoratifs que d’étapes', () => {
    const { getByRole } = render(<SegmentedProgress step={1} total={3} label="Étape 1 sur 3" />)
    const bar = getByRole('progressbar')
    expect(bar.querySelectorAll('span[aria-hidden="true"]').length).toBe(3)
  })

  it('clamp défensif : step hors borne ne casse pas valuenow', () => {
    const { getByRole } = render(<SegmentedProgress step={9} total={3} label="Étape" />)
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('3')
  })
})
