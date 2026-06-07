import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { PwaInstallSheet } from './PwaInstallSheet'

expect.extend(toHaveNoViolations)

const baseProps = {
  open: true,
  headline: 'Garde-la sous la main.',
  subline: "Installe Evolve Capital sur ton écran d'accueil.",
  badge: 'Web app · sans App Store',
  ctaLabel: 'Installer',
  dismissLabel: 'Plus tard',
  onCta: () => {},
  onDismiss: () => {},
  // reducedMotion : démontage/affichage instantané (pas de timers de transition en test).
  reducedMotion: true,
}

describe('PwaInstallSheet', () => {
  it('rend un dialog non-modal étiqueté par le headline', () => {
    render(<PwaInstallSheet {...baseProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'false')
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    expect(document.getElementById(labelledby as string)?.textContent).toBe(baseProps.headline)
  })

  it('affiche headline, subline et le badge (aria-hidden)', () => {
    render(<PwaInstallSheet {...baseProps} />)
    expect(screen.getByRole('heading', { name: baseProps.headline })).toBeInTheDocument()
    expect(screen.getByText(baseProps.subline)).toBeInTheDocument()
    const badge = screen.getByText(baseProps.badge)
    expect(badge).toHaveAttribute('aria-hidden', 'true')
  })

  it('clic CTA appelle onCta', async () => {
    const u = userEvent.setup()
    const onCta = vi.fn()
    render(<PwaInstallSheet {...baseProps} onCta={onCta} />)
    await u.click(screen.getByRole('button', { name: 'Installer' }))
    expect(onCta).toHaveBeenCalledTimes(1)
  })

  it('le X (closeLabel distinct) et « Plus tard » appellent tous deux onDismiss', async () => {
    const u = userEvent.setup()
    const onDismiss = vi.fn()
    render(<PwaInstallSheet {...baseProps} closeLabel="Fermer" onDismiss={onDismiss} />)
    // Bouton fantôme « Plus tard ».
    await u.click(screen.getByRole('button', { name: 'Plus tard' }))
    // Bouton X (aria-label distinct fourni).
    await u.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })

  it('sans closeLabel, le X retombe sur dismissLabel comme aria-label', () => {
    render(<PwaInstallSheet {...baseProps} />)
    // Deux boutons partagent alors le nom accessible « Plus tard » (X + fantôme).
    expect(screen.getAllByRole('button', { name: 'Plus tard' })).toHaveLength(2)
  })

  it("ctaState='loading' : bouton désactivé, aria-busy, n'appelle pas onCta", async () => {
    const u = userEvent.setup()
    const onCta = vi.fn()
    render(<PwaInstallSheet {...baseProps} ctaState="loading" onCta={onCta} />)
    const cta = screen.getByRole('button', { name: 'Installer' })
    expect(cta).toBeDisabled()
    expect(cta).toHaveAttribute('aria-busy', 'true')
    await u.click(cta)
    expect(onCta).not.toHaveBeenCalled()
  })

  it("ctaState='disabled' : bouton désactivé", async () => {
    const u = userEvent.setup()
    const onCta = vi.fn()
    render(<PwaInstallSheet {...baseProps} ctaState="disabled" onCta={onCta} />)
    const cta = screen.getByRole('button', { name: 'Installer' })
    expect(cta).toBeDisabled()
    await u.click(cta)
    expect(onCta).not.toHaveBeenCalled()
  })

  it('navigation clavier : Entrée sur le CTA focalisé appelle onCta', async () => {
    const u = userEvent.setup()
    const onCta = vi.fn()
    render(<PwaInstallSheet {...baseProps} onCta={onCta} />)
    const cta = screen.getByRole('button', { name: 'Installer' })
    cta.focus()
    expect(cta).toHaveFocus()
    await u.keyboard('{Enter}')
    expect(onCta).toHaveBeenCalledTimes(1)
  })

  it('jamais de rouge brand (#E93E3A)', () => {
    const { baseElement } = render(<PwaInstallSheet {...baseProps} />)
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
    expect(baseElement.innerHTML).not.toContain('brand-red')
  })

  it('accessibilité : pas de violations axe', async () => {
    const { baseElement } = render(<PwaInstallSheet {...baseProps} />)
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
