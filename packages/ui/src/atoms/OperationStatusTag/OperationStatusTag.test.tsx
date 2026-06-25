import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationStatusTag } from './OperationStatusTag'

expect.extend(toHaveNoViolations)

describe('OperationStatusTag', () => {
  it('settlée → label par défaut + fond dividend-tag + texte dividend-fg (piège dark)', () => {
    const { container } = render(<OperationStatusTag variant="settled" />)
    expect(container.textContent).toBe('Settlée')
    expect(container.innerHTML).toContain('bg-data-dividend-tag-50')
    expect(container.innerHTML).toContain('text-data-dividend-fg')
  })

  it('annulée → fond card-sub, texte ter, bordure', () => {
    const { container } = render(<OperationStatusTag variant="cancelled" />)
    expect(container.textContent).toBe('Annulée')
    expect(container.innerHTML).toContain('bg-card-sub')
    expect(container.innerHTML).toContain('text-text-ter')
    expect(container.innerHTML).toContain('border-border-strong')
  })

  it('libellés surchargés (i18n côté apps/web)', () => {
    const { container } = render(<OperationStatusTag variant="settled" settledLabel="Settled" />)
    expect(container.textContent).toBe('Settled')
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<OperationStatusTag variant="settled" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
