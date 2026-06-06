import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeToggle } from './ThemeToggle'

expect.extend(toHaveNoViolations)

beforeEach(() => {
  // Réinitialise l'état global entre chaque test.
  delete document.documentElement.dataset['theme']
  window.localStorage.clear()
})

describe('ThemeToggle — bascule', () => {
  it('part du thème clair (aucun data-theme) et bascule en sombre au clic', async () => {
    const u = userEvent.setup()
    render(<ThemeToggle />)
    // Après montage, le bouton expose aria-pressed (état lu depuis le DOM).
    const button = await screen.findByRole('button')
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'))

    await u.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(window.localStorage.getItem('ec-theme')).toBe('dark')
    expect(button).toHaveAttribute('aria-label', 'Activer le mode clair')
  })

  it('rebascule en clair (suppression de data-theme) au second clic', async () => {
    const u = userEvent.setup()
    render(<ThemeToggle />)
    const button = await screen.findByRole('button')

    await u.click(button) // -> sombre
    await u.click(button) // -> clair
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement.dataset['theme']).toBeUndefined()
    expect(window.localStorage.getItem('ec-theme')).toBe('light')
    expect(button).toHaveAttribute('aria-label', 'Activer le mode sombre')
  })

  it("lit l'état sombre initial posé sur <html>", async () => {
    document.documentElement.dataset['theme'] = 'dark'
    render(<ThemeToggle />)
    const button = await screen.findByRole('button')
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
  })
})

describe('ThemeToggle — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<ThemeToggle />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
