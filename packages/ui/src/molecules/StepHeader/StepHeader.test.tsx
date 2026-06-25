import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { StepHeader } from './StepHeader'

expect.extend(toHaveNoViolations)

describe('StepHeader', () => {
  it('affiche titre, lien retour et « Étape N / M »', () => {
    render(<StepHeader step={2} total={3} />)
    expect(screen.getByText('Nouvelle opération')).toBeInTheDocument()
    expect(screen.getByText('Opérations')).toBeInTheDocument()
    expect(screen.getByText('Étape 2 / 3')).toBeInTheDocument()
  })

  it('rend 3 pills, active = la N-ième (26px)', () => {
    const { container } = render(<StepHeader step={2} total={3} />)
    const pills = container.querySelectorAll('ol[aria-label] li')
    expect(pills).toHaveLength(3)
    expect(pills[0]!.className).toContain('w-[18px]') // passée
    expect(pills[1]!.className).toContain('w-[26px]') // active
    expect(pills[2]!.className).toContain('bg-border-strong') // future
  })

  it('clamp step hors bornes', () => {
    render(<StepHeader step={9} total={3} />)
    expect(screen.getByText('Étape 3 / 3')).toBeInTheDocument()
  })

  it('onBack déclenché au clic (rendu <button> sans href)', async () => {
    const u = userEvent.setup()
    const onBack = vi.fn()
    render(<StepHeader step={1} onBack={onBack} />)
    await u.click(screen.getByText('Opérations'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('rendu <a> quand backHref fourni', () => {
    render(<StepHeader step={1} backHref="/admin/operations" />)
    expect(screen.getByText('Opérations').closest('a')).toHaveAttribute('href', '/admin/operations')
  })

  it('libellés via props (EN)', () => {
    render(
      <StepHeader
        step={1}
        title="New operation"
        backLabel="Operations"
        stepLabelTemplate="Step {n} / {total}"
      />
    )
    expect(screen.getByText('New operation')).toBeInTheDocument()
    expect(screen.getByText('Step 1 / 3')).toBeInTheDocument()
  })

  it('jamais de rouge brand en dur', () => {
    const { container } = render(<StepHeader step={1} />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<StepHeader step={2} onBack={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
