import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationTypeSelector, OperationTypeCard } from './OperationTypeSelector'

expect.extend(toHaveNoViolations)

describe('OperationTypeSelector', () => {
  it('rend les 6 types par défaut (boutons focusables)', () => {
    render(<OperationTypeSelector onSelect={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(screen.getByText('Cotisation')).toBeInTheDocument()
    expect(screen.getByText('Pénalité')).toBeInTheDocument()
  })

  it('onSelect émet la clé métier au clic', async () => {
    const u = userEvent.setup()
    const onSelect = vi.fn()
    render(<OperationTypeSelector onSelect={onSelect} />)
    await u.click(screen.getByText('Achat'))
    expect(onSelect).toHaveBeenCalledWith('buy')
  })

  it('activable au clavier (Enter sur le bouton)', async () => {
    const u = userEvent.setup()
    const onSelect = vi.fn()
    render(<OperationTypeSelector onSelect={onSelect} />)
    await u.tab()
    await u.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('contribution')
  })

  it('copy override (i18n)', () => {
    render(
      <OperationTypeSelector
        onSelect={() => {}}
        copy={{ contribution: { label: 'Contribution', description: 'A member payment' } }}
      />
    )
    expect(screen.getByText('Contribution')).toBeInTheDocument()
    expect(screen.getByText('A member payment')).toBeInTheDocument()
  })

  it('OperationTypeCard émet son type', async () => {
    const u = userEvent.setup()
    const onSelect = vi.fn()
    render(<OperationTypeCard type="sell" onSelect={onSelect} />)
    await u.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('sell')
  })

  it('jamais de rouge brand en dur', () => {
    const { container } = render(<OperationTypeSelector onSelect={() => {}} />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<OperationTypeSelector onSelect={() => {}} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
