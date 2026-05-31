import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { FilterBar } from './FilterBar'

expect.extend(toHaveNoViolations)

const sectors = ['Technologie', 'Santé']

describe('FilterBar', () => {
  it('rend un groupe nommé + une pill "Tous" et une pill par secteur', () => {
    render(
      <FilterBar
        sectors={sectors}
        sort="value"
        dir="desc"
        onSectorChange={() => {}}
        onSortChange={() => {}}
        onDirChange={() => {}}
      />
    )
    expect(screen.getByRole('group', { name: /filtres/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tous' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Technologie' })).toBeInTheDocument()
  })

  it('onSectorChange reçoit le secteur cliqué, et null pour "Tous"', async () => {
    const onSectorChange = vi.fn()
    render(
      <FilterBar
        sectors={sectors}
        sector="Technologie"
        sort="value"
        dir="desc"
        onSectorChange={onSectorChange}
        onSortChange={() => {}}
        onDirChange={() => {}}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Santé' }))
    expect(onSectorChange).toHaveBeenCalledWith('Santé')
    await userEvent.click(screen.getByRole('button', { name: 'Tous' }))
    expect(onSectorChange).toHaveBeenCalledWith(null)
  })

  it('onDirChange bascule asc/desc', async () => {
    const onDirChange = vi.fn()
    render(
      <FilterBar
        sectors={sectors}
        sort="value"
        dir="desc"
        onSectorChange={() => {}}
        onSortChange={() => {}}
        onDirChange={onDirChange}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /ordre/i }))
    expect(onDirChange).toHaveBeenCalledWith('asc')
  })

  it("n'a aucune violation a11y", async () => {
    const { container } = render(
      <FilterBar
        sectors={sectors}
        sort="value"
        dir="desc"
        onSectorChange={() => {}}
        onSortChange={() => {}}
        onDirChange={() => {}}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
