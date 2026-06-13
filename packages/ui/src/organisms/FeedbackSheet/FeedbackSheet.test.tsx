import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { FeedbackSheet, type FeedbackSheetProps } from './FeedbackSheet'

expect.extend(toHaveNoViolations)

// Radix Dialog s'appuie sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

function setup(props: Partial<FeedbackSheetProps> = {}) {
  const onOpenChange = vi.fn()
  const onSubmit = vi.fn<(d: unknown) => Promise<void>>().mockResolvedValue(undefined)
  const utils = render(
    <FeedbackSheet
      open
      onOpenChange={onOpenChange}
      currentRoute="/portefeuille · 18.04"
      onSubmit={onSubmit}
      {...props}
    />
  )
  return { onOpenChange, onSubmit, ...utils }
}

describe('FeedbackSheet — idle', () => {
  it('ouvert : dialog + titre/sous-titre + 3 pills de type + textarea + CTA envoyer', () => {
    setup()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Un retour à partager ?')).toBeInTheDocument()
    expect(screen.getByText('Bug, idée ou question — on lit chaque message.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bug', pressed: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Idée', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Question', pressed: false })).toBeInTheDocument()
    expect(screen.getByLabelText('Ton message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Envoyer →' })).toBeInTheDocument()
  })

  it('le type par défaut est « feature » (Idée) avec aria-pressed', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Idée' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sélectionner un type met à jour aria-pressed et le placeholder', async () => {
    const u = userEvent.setup()
    setup()
    await u.click(screen.getByRole('button', { name: 'Bug' }))
    expect(screen.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Idée' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByPlaceholderText('Décris ce que tu as constaté…')).toBeInTheDocument()
  })

  it('affiche la route capturée', () => {
    setup({ currentRoute: '/portefeuille · 18.04' })
    expect(screen.getByText('/portefeuille · 18.04')).toBeInTheDocument()
    expect(screen.getByText('Route capturée')).toBeInTheDocument()
  })

  it('CTA envoyer désactivé tant que le message est vide', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Envoyer →' })).toBeDisabled()
  })

  it('CTA actif dès qu’un message est saisi', async () => {
    const u = userEvent.setup()
    setup()
    await u.type(screen.getByLabelText('Ton message'), 'un bug')
    expect(screen.getByRole('button', { name: 'Envoyer →' })).toBeEnabled()
  })

  it('masque le bouton joindre quand onCaptureScreenshot est absent', () => {
    setup()
    expect(screen.queryByRole('button', { name: /Joindre/i })).not.toBeInTheDocument()
  })

  it('affiche le bouton joindre quand onCaptureScreenshot est fourni', () => {
    setup({ onCaptureScreenshot: vi.fn() })
    expect(
      screen.getByRole('button', { name: "Joindre une capture d'écran (optionnel)" })
    ).toBeInTheDocument()
  })
})

describe('FeedbackSheet — submit', () => {
  it('soumet un FeedbackSubmission complet (type, message, route, url, ua)', async () => {
    const u = userEvent.setup()
    const { onSubmit } = setup({ currentRoute: '/dashboard' })
    await u.click(screen.getByRole('button', { name: 'Bug' }))
    await u.type(screen.getByLabelText('Ton message'), '  ça plante  ')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const arg = onSubmit.mock.calls[0]![0] as Record<string, unknown>
    expect(arg).toMatchObject({
      type: 'bug',
      message: 'ça plante',
      pageRoute: '/dashboard',
    })
    expect(typeof arg['pageUrl']).toBe('string')
    expect(typeof arg['userAgent']).toBe('string')
  })

  it('après résolution de onSubmit, passe en success', async () => {
    const u = userEvent.setup()
    setup()
    await u.type(screen.getByLabelText('Ton message'), 'merci')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => expect(screen.getByText('Merci pour ton retour.')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument()
  })

  it('success → Fermer appelle onOpenChange(false)', async () => {
    const u = userEvent.setup()
    const { onOpenChange } = setup()
    await u.type(screen.getByLabelText('Ton message'), 'merci')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => screen.getByRole('button', { name: 'Fermer' }))
    await u.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('FeedbackSheet — error', () => {
  it('onSubmit rejette → affiche un bandeau d’erreur (role alert)', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn<(d: unknown) => Promise<void>>().mockRejectedValue(new Error('boom'))
    render(<FeedbackSheet open onOpenChange={vi.fn()} currentRoute="/x" onSubmit={onSubmit} />)
    await u.type(screen.getByLabelText('Ton message'), 'oups')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("L'envoi a échoué."))
  })

  it('Réessayer re-passe en idle en conservant type et message', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn<(d: unknown) => Promise<void>>().mockRejectedValue(new Error('boom'))
    render(<FeedbackSheet open onOpenChange={vi.fn()} currentRoute="/x" onSubmit={onSubmit} />)
    await u.click(screen.getByRole('button', { name: 'Question' }))
    await u.type(screen.getByLabelText('Ton message'), 'ma question')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => screen.getByRole('button', { name: 'Réessayer' }))
    await u.click(screen.getByRole('button', { name: 'Réessayer' }))
    // Données pré-remplies préservées.
    expect(screen.getByLabelText('Ton message')).toHaveValue('ma question')
    expect(screen.getByRole('button', { name: 'Question' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('FeedbackSheet — capture', () => {
  it('joindre → onCaptureScreenshot renvoie une dataURL → vignette + bouton retirer', async () => {
    const u = userEvent.setup()
    const onCaptureScreenshot = vi
      .fn<() => Promise<string | undefined>>()
      .mockResolvedValue('data:image/png;base64,AAAA')
    setup({ onCaptureScreenshot })
    await u.click(screen.getByRole('button', { name: "Joindre une capture d'écran (optionnel)" }))
    await waitFor(() => expect(onCaptureScreenshot).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Capture jointe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirer' })).toBeInTheDocument()
    // Mention vie privée honnête (pas de claim « floutés automatiquement »).
    expect(
      screen.getByText('Cette capture sera partagée uniquement avec l’équipe technique.')
    ).toBeInTheDocument()
  })

  it('retirer la capture revient à l’état sans vignette', async () => {
    const u = userEvent.setup()
    const onCaptureScreenshot = vi
      .fn<() => Promise<string | undefined>>()
      .mockResolvedValue('data:image/png;base64,AAAA')
    setup({ onCaptureScreenshot })
    await u.click(screen.getByRole('button', { name: "Joindre une capture d'écran (optionnel)" }))
    await screen.findByText('Capture jointe')
    await u.click(screen.getByRole('button', { name: 'Retirer' }))
    expect(screen.queryByText('Capture jointe')).not.toBeInTheDocument()
  })

  it('la dataURL capturée est incluse dans le submit', async () => {
    const u = userEvent.setup()
    const onCaptureScreenshot = vi
      .fn<() => Promise<string | undefined>>()
      .mockResolvedValue('data:image/png;base64,AAAA')
    const { onSubmit } = setup({ onCaptureScreenshot })
    await u.click(screen.getByRole('button', { name: "Joindre une capture d'écran (optionnel)" }))
    await screen.findByText('Capture jointe')
    await u.type(screen.getByLabelText('Ton message'), 'avec capture')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const arg = onSubmit.mock.calls[0]![0] as Record<string, unknown>
    expect(arg['screenshotDataUrl']).toBe('data:image/png;base64,AAAA')
  })

  it('si onCaptureScreenshot renvoie undefined, pas de vignette (no-op propre)', async () => {
    const u = userEvent.setup()
    const onCaptureScreenshot = vi
      .fn<() => Promise<string | undefined>>()
      .mockResolvedValue(undefined)
    setup({ onCaptureScreenshot })
    await u.click(screen.getByRole('button', { name: "Joindre une capture d'écran (optionnel)" }))
    await waitFor(() => expect(onCaptureScreenshot).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Capture jointe')).not.toBeInTheDocument()
  })
})

describe('FeedbackSheet — i18n', () => {
  it('libellés via props (EN)', () => {
    setup({
      labels: {
        title: 'Share feedback?',
        types: { bug: 'Bug', feature: 'Idea', question: 'Question' },
        messageLabel: 'Your message',
        submit: 'Send →',
      },
    })
    expect(screen.getByText('Share feedback?')).toBeInTheDocument()
    expect(screen.getByLabelText('Your message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Idea' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send →' })).toBeInTheDocument()
  })
})

describe('FeedbackSheet — tokens & a11y', () => {
  it('jamais de rouge brand ni de hex en dur pour l’état error', () => {
    const { baseElement } = setup()
    expect(baseElement.innerHTML).not.toMatch(/E93E3A/i)
    expect(baseElement.innerHTML).not.toContain('brand-red')
    expect(baseElement.innerHTML).not.toMatch(/#3D1212/i)
  })

  it('Escape déclenche onOpenChange(false)', async () => {
    const u = userEvent.setup()
    const { onOpenChange } = setup()
    await u.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cibles tactiles : pills et CTA ont min-h ≥ 44px (classes)', () => {
    setup({ onCaptureScreenshot: vi.fn() })
    const bug = screen.getByRole('button', { name: 'Bug' })
    expect(bug.className).toMatch(/min-h-\[44px\]/)
    const attach = screen.getByRole('button', {
      name: "Joindre une capture d'écran (optionnel)",
    })
    expect(attach.className).toMatch(/min-h-\[44px\]/)
  })

  it('focus visible (glow) sur les interactifs', () => {
    setup()
    const cta = screen.getByRole('button', { name: 'Envoyer →' })
    expect(cta.className).toContain('--sh-glow')
  })

  it('pas de violations axe (idle)', async () => {
    const { baseElement } = setup({ onCaptureScreenshot: vi.fn() })
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe (success)', async () => {
    const u = userEvent.setup()
    const { baseElement } = setup()
    await u.type(screen.getByLabelText('Ton message'), 'merci')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => screen.getByText('Merci pour ton retour.'))
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe (error)', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn<(d: unknown) => Promise<void>>().mockRejectedValue(new Error('x'))
    const { baseElement } = render(
      <FeedbackSheet open onOpenChange={vi.fn()} currentRoute="/x" onSubmit={onSubmit} />
    )
    await u.type(screen.getByLabelText('Ton message'), 'oups')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => screen.getByRole('alert'))
    expect(await axe(baseElement)).toHaveNoViolations()
  })
})
