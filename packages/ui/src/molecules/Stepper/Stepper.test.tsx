import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Stepper, type StepperStep } from './Stepper'

expect.extend(toHaveNoViolations)

const STEPS: StepperStep[] = [
  { id: 'infos', label: 'Infos' },
  { id: 'matrice', label: 'Matrice' },
  { id: 'import', label: 'Import' },
]

describe('Stepper — comportement', () => {
  it('rend une liste ordonnée nommée par ariaLabel', () => {
    render(<Stepper steps={STEPS} current={0} ariaLabel="Étapes de l’assistant" />)
    expect(screen.getByRole('list', { name: 'Étapes de l’assistant' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('marque l’étape active avec aria-current="step"', () => {
    render(<Stepper steps={STEPS} current={1} ariaLabel="Étapes" />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[2]).not.toHaveAttribute('aria-current')
  })

  it('affiche les libellés des 3 étapes', () => {
    render(<Stepper steps={STEPS} current={2} ariaLabel="Étapes" />)
    expect(screen.getByText('Infos')).toBeInTheDocument()
    expect(screen.getByText('Matrice')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
  })
})

describe('Stepper — accessibilité (jest-axe)', () => {
  it('pas de violations axe (étape 1 active)', async () => {
    const { container } = render(<Stepper steps={STEPS} current={0} ariaLabel="Étapes" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('pas de violations axe (dernière étape)', async () => {
    const { container } = render(<Stepper steps={STEPS} current={2} ariaLabel="Étapes" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
