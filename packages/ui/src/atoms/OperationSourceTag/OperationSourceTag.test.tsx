import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationSourceTag } from './OperationSourceTag'

expect.extend(toHaveNoViolations)

describe('OperationSourceTag', () => {
  it('manuel → label + puce ronde neutre', () => {
    const { container } = render(<OperationSourceTag variant="manual" />)
    expect(container.textContent).toBe('Manuel')
    expect(container.innerHTML).toContain('rounded-pill')
    expect(container.innerHTML).toContain('bg-data-neutral')
  })

  it('migré → label + puce carrée ambre', () => {
    const { container } = render(<OperationSourceTag variant="migrated" />)
    expect(container.textContent).toBe('Migré')
    expect(container.innerHTML).toContain('rounded-[2px]')
    expect(container.innerHTML).toContain('bg-data-warning')
  })

  it('libellés surchargés (i18n)', () => {
    const { container } = render(<OperationSourceTag variant="manual" manualLabel="Manual" />)
    expect(container.textContent).toBe('Manual')
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<OperationSourceTag variant="migrated" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
