import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationField } from './OperationField'

expect.extend(toHaveNoViolations)

describe('OperationField', () => {
  it('label associé au contrôle (htmlFor/id)', () => {
    render(<OperationField label="Référence virement" />)
    const input = screen.getByLabelText('Référence virement')
    expect(input.tagName).toBe('INPUT')
  })

  it('required → astérisque + aria-required', () => {
    render(<OperationField label="Membre" required />)
    expect(screen.getByLabelText(/Membre/)).toHaveAttribute('aria-required', 'true')
  })

  it('variant amount → suffixe € + inputMode decimal', () => {
    const { container } = render(<OperationField variant="amount" label="Montant" />)
    expect(container.textContent).toContain('€')
    expect(screen.getByLabelText('Montant')).toHaveAttribute('inputmode', 'decimal')
  })

  it('error → role alert, aria-invalid, et masque le hint', () => {
    render(
      <OperationField
        variant="amount"
        label="Montant"
        hint="Cotisation mensuelle : 300 €."
        error="Montant sous le minimum de 100 €."
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Montant sous le minimum de 100 €.')
    expect(screen.getByLabelText('Montant')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('Cotisation mensuelle : 300 €.')).not.toBeInTheDocument()
  })

  it('erreur → bordure data-negative (jamais brand-red)', () => {
    const { container } = render(<OperationField label="Montant" error="x" />)
    expect(container.innerHTML).toContain('border-data-negative')
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('variant select rend un <select> avec ses options', () => {
    render(
      <OperationField variant="select" label="Membre">
        <option value="m1">Sofia Rossi</option>
      </OperationField>
    )
    const select = screen.getByLabelText('Membre')
    expect(select.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Sofia Rossi' })).toBeInTheDocument()
  })

  it('variant textarea rend un <textarea>', () => {
    render(<OperationField variant="textarea" label="Notes" />)
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA')
  })

  it('aucune violation a11y (erreur)', async () => {
    const { container } = render(
      <OperationField variant="amount" label="Montant" required error="Invalide." />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
