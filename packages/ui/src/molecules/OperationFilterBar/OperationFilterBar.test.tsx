import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { FilterChip, OperationFilterBar } from './OperationFilterBar'

expect.extend(toHaveNoViolations)

const filters = [
  { key: 'type', label: 'Type', value: 'Tous' },
  { key: 'member', label: 'Membre', value: 'Tous' },
  { key: 'period', label: 'Période', value: '6 derniers mois' },
]

describe('FilterChip', () => {
  it('rend label + valeur et déclenche onClick', () => {
    const onClick = vi.fn()
    render(<FilterChip label="Type" value="Tous" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Tous')).toBeInTheDocument()
  })
})

describe('OperationFilterBar', () => {
  it('rend tous les filtres + libellé de tri', () => {
    render(<OperationFilterBar filters={filters} />)
    expect(screen.getByText('Membre')).toBeInTheDocument()
    expect(screen.getByText('6 derniers mois')).toBeInTheDocument()
    expect(screen.getByText('Trié par date')).toBeInTheDocument()
  })

  it('onFilterClick reçoit la clé', () => {
    const onFilterClick = vi.fn()
    render(<OperationFilterBar filters={filters} onFilterClick={onFilterClick} />)
    fireEvent.click(screen.getByText('Période'))
    expect(onFilterClick).toHaveBeenCalledWith('period')
  })

  it('aucune violation a11y', async () => {
    const { container } = render(<OperationFilterBar filters={filters} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
