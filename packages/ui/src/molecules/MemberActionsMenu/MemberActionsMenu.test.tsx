import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MemberActionsMenu } from './MemberActionsMenu'

expect.extend(toHaveNoViolations)

// Radix DropdownMenu s'appuie sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

describe('MemberActionsMenu — statut active', () => {
  it('ouvre le menu et propose « Bloquer l’accès » + « Voir la fiche »', async () => {
    const u = userEvent.setup()
    render(<MemberActionsMenu accessStatus="active" />)
    await u.click(screen.getByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menuitem', { name: /Bloquer l'accès/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Voir la fiche/i })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Débloquer/i })).toBeNull()
  })

  it('appelle onLock au clic sur « Bloquer l’accès »', async () => {
    const u = userEvent.setup()
    const onLock = vi.fn()
    render(<MemberActionsMenu accessStatus="active" onLock={onLock} />)
    await u.click(screen.getByRole('button', { name: 'Actions' }))
    await u.click(await screen.findByRole('menuitem', { name: /Bloquer l'accès/i }))
    expect(onLock).toHaveBeenCalledTimes(1)
  })
})

describe('MemberActionsMenu — statut locked', () => {
  it('propose « Débloquer » (pas « Bloquer »)', async () => {
    const u = userEvent.setup()
    const onUnlock = vi.fn()
    render(<MemberActionsMenu accessStatus="locked" onUnlock={onUnlock} />)
    await u.click(screen.getByRole('button', { name: 'Actions' }))
    const unlock = await screen.findByRole('menuitem', { name: /Débloquer/i })
    // « Bloquer l'accès » (exact) ne doit pas être présent en mode locked.
    expect(screen.queryByRole('menuitem', { name: "Bloquer l'accès" })).toBeNull()
    await u.click(unlock)
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })
})

describe('MemberActionsMenu — accessibilité (jest-axe)', () => {
  it('trigger fermé : pas de violations axe', async () => {
    const { container } = render(<MemberActionsMenu accessStatus="active" />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
