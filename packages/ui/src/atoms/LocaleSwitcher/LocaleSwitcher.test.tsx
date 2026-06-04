import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { LocaleSwitcher } from './LocaleSwitcher'

expect.extend(toHaveNoViolations)

const LOCALES = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
] as const

describe('LocaleSwitcher', () => {
  it('marque la locale active via aria-pressed', () => {
    render(<LocaleSwitcher locales={LOCALES} current="fr" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: 'FR' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('appelle onSelect avec la locale choisie au clic', async () => {
    const u = userEvent.setup()
    const onSelect = vi.fn()
    render(<LocaleSwitcher locales={LOCALES} current="fr" onSelect={onSelect} />)
    await u.click(screen.getByRole('button', { name: 'EN' }))
    expect(onSelect).toHaveBeenCalledWith('en')
  })

  it('expose un groupe labellisé (aria-label par défaut FR)', () => {
    render(<LocaleSwitcher locales={LOCALES} current="fr" onSelect={() => {}} />)
    expect(screen.getByRole('group', { name: 'Changer de langue' })).toBeInTheDocument()
  })

  it('pas de violations axe', async () => {
    const { container } = render(
      <LocaleSwitcher locales={LOCALES} current="fr" onSelect={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
