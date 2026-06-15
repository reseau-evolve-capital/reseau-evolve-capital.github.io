import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SegmentedToggle, type SegmentedToggleProps } from './SegmentedToggle'

expect.extend(toHaveNoViolations)

const baseProps: SegmentedToggleProps = {
  options: [
    { value: 'sector', label: 'Par secteur' },
    { value: 'title', label: 'Par titre' },
  ],
  value: 'sector',
  onChange: () => {},
  ariaLabel: 'Mode de répartition',
}

function renderToggle(overrides: Partial<SegmentedToggleProps> = {}) {
  return render(<SegmentedToggle {...baseProps} {...overrides} />)
}

describe('SegmentedToggle — rendu', () => {
  it('rend un groupe nommé (role=group) et un bouton par option', () => {
    renderToggle()
    expect(screen.getByRole('group', { name: 'Mode de répartition' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Par secteur' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Par titre' })).toBeInTheDocument()
  })

  it('l’option active porte aria-pressed="true", les autres "false"', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: 'Par secteur' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Par titre' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('l’option active porte la classe pill active (bg-accent)', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: 'Par secteur' }).className).toContain('bg-accent')
    expect(screen.getByRole('button', { name: 'Par titre' }).className).not.toContain('bg-accent')
  })
})

describe('SegmentedToggle — interaction', () => {
  it('clic sur une option → onChange(value)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderToggle({ onChange })
    await user.click(screen.getByRole('button', { name: 'Par titre' }))
    expect(onChange).toHaveBeenCalledWith('title')
  })

  it('navigation clavier : Tab atteint le 1ᵉʳ bouton, Enter déclenche onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderToggle({ onChange })
    await user.tab()
    expect(screen.getByRole('button', { name: 'Par secteur' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('sector')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Par titre' })).toHaveFocus()
    await user.keyboard('[Space]')
    expect(onChange).toHaveBeenCalledWith('title')
  })

  it('options mobileHidden portent les classes hidden md:inline-flex (pas de useMediaQuery)', () => {
    renderToggle({
      options: [
        { value: '7d', label: '7J' },
        { value: '90d', label: '90J', mobileHidden: true },
        { value: 'max', label: 'MAX' },
      ],
      value: '7d',
    })
    const hidden = screen.getByRole('button', { name: '90J', hidden: true })
    expect(hidden.className).toContain('hidden')
    expect(hidden.className).toContain('md:inline-flex')
  })
})

describe('SegmentedToggle — tokens & a11y', () => {
  it('aucun code hex brut dans le rendu (tokens uniquement)', () => {
    const { container } = renderToggle()
    expect(container.innerHTML).not.toMatch(/#[0-9A-Fa-f]{6}/)
  })

  it('aucune violation a11y (jest-axe)', async () => {
    const { container } = renderToggle()
    expect(await axe(container)).toHaveNoViolations()
  })
})
