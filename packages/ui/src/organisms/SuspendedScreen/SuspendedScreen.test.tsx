import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SuspendedScreen } from './SuspendedScreen'

expect.extend(toHaveNoViolations)

describe('SuspendedScreen — rendu', () => {
  it('titre h1 + description + wordmark', () => {
    render(<SuspendedScreen treasurerMailto="mailto:t@x.fr" />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Votre accès a été suspendu.')
    expect(screen.getByText(/temporairement suspendu/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Evolve Capital')).toBeInTheDocument()
  })

  it('CTA trésorier pointe sur le mailto fourni', () => {
    render(<SuspendedScreen treasurerMailto="mailto:tresorier@x.fr" />)
    const cta = screen.getByRole('link', { name: /Contacter mon trésorier/i })
    expect(cta).toHaveAttribute('href', 'mailto:tresorier@x.fr')
  })

  it('masque le CTA quand treasurerMailto est absent', () => {
    render(<SuspendedScreen />)
    expect(screen.queryByRole('link', { name: /Contacter mon trésorier/i })).toBeNull()
  })

  it('lien de déconnexion : href + onSignOut', async () => {
    const u = userEvent.setup()
    const onSignOut = vi.fn()
    render(<SuspendedScreen signOutHref="/logout" onSignOut={onSignOut} />)
    const link = screen.getByRole('link', { name: /Me déconnecter/i })
    expect(link).toHaveAttribute('href', '/logout')
    await u.click(link)
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('force le thème sombre (data-theme="dark")', () => {
    const { container } = render(<SuspendedScreen treasurerMailto="mailto:t@x.fr" />)
    expect(container.querySelector('[data-theme="dark"]')).toBeInTheDocument()
  })

  it('logo personnalisé remplace le wordmark par défaut', () => {
    render(<SuspendedScreen logo={<span>MON LOGO</span>} />)
    expect(screen.getByText('MON LOGO')).toBeInTheDocument()
  })

  it('jamais de rouge brand', () => {
    const { container } = render(<SuspendedScreen treasurerMailto="mailto:t@x.fr" />)
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })
})

describe('SuspendedScreen — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<SuspendedScreen treasurerMailto="mailto:t@x.fr" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
