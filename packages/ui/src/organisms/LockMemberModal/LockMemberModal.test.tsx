import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { LockMemberModal } from './LockMemberModal'

expect.extend(toHaveNoViolations)

// Radix Select/Dialog s'appuient sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

describe('LockMemberModal — mode lock', () => {
  it('ouverte : titre avec le nom + description + CTA destructif', () => {
    render(
      <LockMemberModal open memberName="Inès BAMBA" onConfirm={() => {}} onOpenChange={() => {}} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText("Bloquer l'accès de Inès BAMBA ?")).toBeInTheDocument()
    expect(screen.getByText(/déconnectée immédiatement/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Bloquer l'accès" })).toBeInTheDocument()
  })

  it('confirme avec reason=null quand aucune raison choisie', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <LockMemberModal open memberName="Inès BAMBA" onConfirm={onConfirm} onOpenChange={() => {}} />
    )
    await u.click(screen.getByRole('button', { name: "Bloquer l'accès" }))
    expect(onConfirm).toHaveBeenCalledWith(null)
  })

  it('confirme avec le libellé de la raison choisie (Impayé)', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <LockMemberModal open memberName="Inès BAMBA" onConfirm={onConfirm} onOpenChange={() => {}} />
    )
    await u.click(screen.getByRole('combobox', { name: 'Raison (optionnel)' }))
    await u.click(await screen.findByRole('option', { name: 'Impayé' }))
    await u.click(screen.getByRole('button', { name: "Bloquer l'accès" }))
    expect(onConfirm).toHaveBeenCalledWith('Impayé')
  })

  it('« Autre » révèle un champ libre et remonte sa valeur', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <LockMemberModal open memberName="Inès BAMBA" onConfirm={onConfirm} onOpenChange={() => {}} />
    )
    await u.click(screen.getByRole('combobox', { name: 'Raison (optionnel)' }))
    await u.click(await screen.findByRole('option', { name: 'Autre' }))
    const free = screen.getByRole('textbox', { name: 'Préciser la raison du blocage' })
    await u.type(free, 'Litige adresse')
    await u.click(screen.getByRole('button', { name: "Bloquer l'accès" }))
    expect(onConfirm).toHaveBeenCalledWith('Litige adresse')
  })

  it('Escape déclenche onOpenChange(false)', async () => {
    const u = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <LockMemberModal
        open
        memberName="Inès BAMBA"
        onConfirm={() => {}}
        onOpenChange={onOpenChange}
      />
    )
    await u.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('jamais de rouge brand (token data-negative)', () => {
    const { baseElement } = render(
      <LockMemberModal open memberName="X" onConfirm={() => {}} onOpenChange={() => {}} />
    )
    expect(baseElement.innerHTML).toContain('data-negative')
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
    expect(baseElement.innerHTML).not.toContain('brand-red')
  })
})

describe('LockMemberModal — mode unlock', () => {
  it('titre « Débloquer » + pas de sélecteur de raison', () => {
    render(
      <LockMemberModal
        open
        mode="unlock"
        memberName="Inès BAMBA"
        onConfirm={() => {}}
        onOpenChange={() => {}}
      />
    )
    expect(screen.getByText("Débloquer l'accès de Inès BAMBA ?")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Débloquer' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('confirme avec reason=null en mode unlock', async () => {
    const u = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <LockMemberModal
        open
        mode="unlock"
        memberName="Inès BAMBA"
        onConfirm={onConfirm}
        onOpenChange={() => {}}
      />
    )
    await u.click(screen.getByRole('button', { name: 'Débloquer' }))
    expect(onConfirm).toHaveBeenCalledWith(null)
  })
})

describe('LockMemberModal — accessibilité (jest-axe)', () => {
  it('mode lock : pas de violations axe', async () => {
    const { baseElement } = render(
      <LockMemberModal open memberName="Inès BAMBA" onConfirm={() => {}} onOpenChange={() => {}} />
    )
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
