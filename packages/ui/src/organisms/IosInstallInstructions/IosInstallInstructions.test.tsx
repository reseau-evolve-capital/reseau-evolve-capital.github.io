import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'

import {
  IosInstallInstructions,
  type IosInstallInstructionsCopy,
  type IosInstallStep,
} from './IosInstallInstructions'

expect.extend(toHaveNoViolations)

// Radix Dialog s'appuie sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

const copy: IosInstallInstructionsCopy = {
  step1Title: 'Appuie sur Partager',
  step1Body: "L'icône Partager, en bas de Safari.",
  step1Caption: 'En bas de Safari',
  step2Title: "« Sur l'écran d'accueil »",
  step2Body: 'Dans le menu, descends puis choisis cette option.',
  step2Caption: "Cherche « Sur l'écran d'accueil »",
  versionNote:
    "Selon ta version d'iPhone, l'écran peut être légèrement différent — cherche toujours « Sur l'écran d'accueil ».",
  step2HighlightLabel: "Sur l'écran d'accueil",
  next: 'Étape suivante',
  done: "C'est fait",
  close: 'Fermer',
  stepLabel: (current: IosInstallStep, total: number) => `Étape ${current} sur ${total}`,
}

const baseProps = {
  open: true,
  device: 'iphone' as const,
  onClose: () => {},
  copy,
}

describe('IosInstallInstructions', () => {
  it("affiche l'étape 1 (titre + compteur)", () => {
    render(<IosInstallInstructions {...baseProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Appuie sur Partager')).toBeInTheDocument()
    expect(screen.getByText('Étape 1 sur 2')).toBeInTheDocument()
  })

  it('« Étape suivante » passe à l’étape 2 et notifie onStepView(2)', async () => {
    const u = userEvent.setup()
    const onStepView = vi.fn()
    render(<IosInstallInstructions {...baseProps} onStepView={onStepView} />)
    await u.click(screen.getByRole('button', { name: 'Étape suivante' }))
    await waitFor(() => expect(screen.getByText("« Sur l'écran d'accueil »")).toBeInTheDocument())
    expect(screen.getByText('Étape 2 sur 2')).toBeInTheDocument()
    expect(onStepView).toHaveBeenCalledWith(2)
  })

  it("affiche la note de version iOS à l'étape 2 (absente à l'étape 1)", async () => {
    const u = userEvent.setup()
    render(<IosInstallInstructions {...baseProps} />)
    // Étape 1 : pas de note de version.
    expect(screen.queryByText(copy.versionNote)).not.toBeInTheDocument()
    // Passe à l'étape 2 → la note apparaît.
    await u.click(screen.getByRole('button', { name: 'Étape suivante' }))
    await waitFor(() => expect(screen.getByText(copy.versionNote)).toBeInTheDocument())
    // La caption non-positionnelle reste visible.
    expect(screen.getByText("Cherche « Sur l'écran d'accueil »")).toBeInTheDocument()
  })

  it('« C’est fait » à l’étape 2 appelle onClose', async () => {
    const u = userEvent.setup()
    const onClose = vi.fn()
    render(<IosInstallInstructions {...baseProps} onClose={onClose} />)
    await u.click(screen.getByRole('button', { name: 'Étape suivante' }))
    await u.click(screen.getByRole('button', { name: "C'est fait" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape ferme (onClose)', async () => {
    const u = userEvent.setup()
    const onClose = vi.fn()
    render(<IosInstallInstructions {...baseProps} onClose={onClose} />)
    await u.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('revient à l’étape 1 à la réouverture', async () => {
    const u = userEvent.setup()
    function Harness() {
      const [open, setOpen] = React.useState(true)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            rouvrir
          </button>
          <IosInstallInstructions {...baseProps} open={open} onClose={() => setOpen(false)} />
        </>
      )
    }
    render(<Harness />)
    // Avance à l'étape 2 puis ferme.
    await u.click(screen.getByRole('button', { name: 'Étape suivante' }))
    await waitFor(() => expect(screen.getByText("« Sur l'écran d'accueil »")).toBeInTheDocument())
    await u.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Rouvre → doit repartir à l'étape 1.
    await u.click(screen.getByRole('button', { name: 'rouvrir' }))
    await waitFor(() => expect(screen.getByText('Appuie sur Partager')).toBeInTheDocument())
    expect(screen.getByText('Étape 1 sur 2')).toBeInTheDocument()
  })

  it('variante iPad rend aussi l’étape 1', () => {
    render(<IosInstallInstructions {...baseProps} device="ipad" />)
    expect(screen.getByText('Appuie sur Partager')).toBeInTheDocument()
  })

  it('jamais de rouge brand (#E93E3A)', () => {
    const { baseElement } = render(<IosInstallInstructions {...baseProps} />)
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
    expect(baseElement.innerHTML).not.toContain('brand-red')
  })

  it('accessibilité : pas de violations axe (étape 1)', async () => {
    const { baseElement } = render(<IosInstallInstructions {...baseProps} />)
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
