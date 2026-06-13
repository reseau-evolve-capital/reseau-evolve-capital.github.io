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

// FileReader.readAsDataURL déterministe (jsdom n'expose pas toujours un résultat stable) :
// on stubbe la lecture pour renvoyer une dataURL prévisible par fichier. `result` étant
// un getter-only sur le prototype jsdom, on le redéfinit sur l'instance avant le onload.
beforeEach(() => {
  vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (
    this: FileReader,
    file: Blob
  ) {
    // Nom de fichier encodé dans la dataURL pour distinguer les vignettes.
    const name = (file as File).name ?? 'img'
    Object.defineProperty(this, 'result', {
      configurable: true,
      value: `data:image/png;base64,AAAA-${name}`,
    })
    this.onload?.(new ProgressEvent('load') as ProgressEvent<FileReader>)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function imageFile(name: string) {
  return new File(['x'], name, { type: 'image/png' })
}

function getFileInput(): HTMLInputElement {
  // Input file caché (type="file") — pas de rôle accessible, on le cible par sélecteur.
  const input = document.body.querySelector('input[type="file"]')
  if (!input) throw new Error('file input introuvable')
  return input as HTMLInputElement
}

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

  it('le bouton joindre des images est toujours présent (input file dans le DOM)', () => {
    setup()
    expect(
      screen.getByRole('button', { name: 'Joindre des images (optionnel)' })
    ).toBeInTheDocument()
    const input = getFileInput()
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('multiple')
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
    // Sans image jointe, imageDataUrls est absent.
    expect(arg['imageDataUrls']).toBeUndefined()
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

describe('FeedbackSheet — images jointes', () => {
  it('joindre une image → vignette + mention vie privée + bouton retirer', async () => {
    const u = userEvent.setup()
    setup()
    await u.upload(getFileInput(), imageFile('a.png'))
    await waitFor(() => expect(document.body.querySelectorAll('img[alt=""]').length).toBe(1))
    expect(screen.getByRole('button', { name: 'Retirer l’image 1' })).toBeInTheDocument()
    expect(screen.getAllByText('Image jointe').length).toBe(1)
    // Mention vie privée plurielle, honnête (pas de claim « floutées »).
    expect(
      screen.getByText('Ces images seront partagées uniquement avec l’équipe technique.')
    ).toBeInTheDocument()
    // Compteur discret 1/3 sur le bouton joindre encore visible.
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('retirer une image revient à l’état sans vignette', async () => {
    const u = userEvent.setup()
    setup()
    await u.upload(getFileInput(), imageFile('a.png'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Retirer l’image 1' })).toBeInTheDocument()
    )
    await u.click(screen.getByRole('button', { name: 'Retirer l’image 1' }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Retirer l’image 1' })).not.toBeInTheDocument()
    )
    expect(document.body.querySelectorAll('img[alt=""]').length).toBe(0)
  })

  it('cap à 3 : un 4ᵉ fichier est ignoré (max 3 vignettes)', async () => {
    const u = userEvent.setup()
    setup()
    await u.upload(getFileInput(), [
      imageFile('1.png'),
      imageFile('2.png'),
      imageFile('3.png'),
      imageFile('4.png'),
    ])
    await waitFor(() => expect(document.body.querySelectorAll('img[alt=""]').length).toBe(3))
    // À 3 images : bouton joindre masqué, hint « 3 images maximum » affiché.
    expect(
      screen.queryByRole('button', { name: 'Joindre des images (optionnel)' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('3 images maximum')).toBeInTheDocument()
  })

  it('ajout incrémental : tronque au-delà de 3 sur une 2ᵉ sélection', async () => {
    const u = userEvent.setup()
    setup()
    await u.upload(getFileInput(), [imageFile('1.png'), imageFile('2.png')])
    await waitFor(() => expect(document.body.querySelectorAll('img[alt=""]').length).toBe(2))
    // 2 déjà + 2 nouveaux → cap à 3.
    await u.upload(getFileInput(), [imageFile('3.png'), imageFile('4.png')])
    await waitFor(() => expect(document.body.querySelectorAll('img[alt=""]').length).toBe(3))
  })

  it('un fichier non-image est ignoré proprement (pas de vignette)', async () => {
    const u = userEvent.setup()
    setup()
    const notImage = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    await u.upload(getFileInput(), notImage)
    // Aucune vignette ; le composant ne crashe pas.
    expect(document.body.querySelectorAll('img[alt=""]').length).toBe(0)
    expect(
      screen.getByRole('button', { name: 'Joindre des images (optionnel)' })
    ).toBeInTheDocument()
  })

  it('les dataURLs des images sont incluses dans le submit', async () => {
    const u = userEvent.setup()
    const { onSubmit } = setup()
    await u.upload(getFileInput(), [imageFile('a.png'), imageFile('b.png')])
    await waitFor(() => expect(document.body.querySelectorAll('img[alt=""]').length).toBe(2))
    await u.type(screen.getByLabelText('Ton message'), 'avec images')
    await u.click(screen.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const arg = onSubmit.mock.calls[0]![0] as Record<string, unknown>
    expect(arg['imageDataUrls']).toEqual([
      'data:image/png;base64,AAAA-a.png',
      'data:image/png;base64,AAAA-b.png',
    ])
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
        attach: 'Attach images (optional)',
        removeImage: 'Remove image {n}',
      },
    })
    expect(screen.getByText('Share feedback?')).toBeInTheDocument()
    expect(screen.getByLabelText('Your message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Idea' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send →' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attach images (optional)' })).toBeInTheDocument()
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

  it('cibles tactiles : pills et bouton joindre ont min-h ≥ 44px (classes)', () => {
    setup()
    const bug = screen.getByRole('button', { name: 'Bug' })
    expect(bug.className).toMatch(/min-h-\[44px\]/)
    const attach = screen.getByRole('button', { name: 'Joindre des images (optionnel)' })
    expect(attach.className).toMatch(/min-h-\[44px\]/)
  })

  it('bouton retirer image : hit-area ≥ 44px (classes)', async () => {
    const u = userEvent.setup()
    setup()
    await u.upload(getFileInput(), imageFile('a.png'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Retirer l’image 1' })).toBeInTheDocument()
    )
    const remove = screen.getByRole('button', { name: 'Retirer l’image 1' })
    expect(remove.className).toMatch(/min-h-\[44px\]/)
    expect(remove.className).toMatch(/min-w-\[44px\]/)
  })

  it('focus visible (glow) sur les interactifs', () => {
    setup()
    const cta = screen.getByRole('button', { name: 'Envoyer →' })
    expect(cta.className).toContain('--sh-glow')
  })

  it('pas de violations axe (idle)', async () => {
    const { baseElement } = setup()
    expect(await axe(baseElement)).toHaveNoViolations()
  })

  it('pas de violations axe (avec images jointes)', async () => {
    const u = userEvent.setup()
    const { baseElement } = setup()
    await u.upload(getFileInput(), [imageFile('a.png'), imageFile('b.png')])
    await waitFor(() => expect(document.body.querySelectorAll('img[alt=""]').length).toBe(2))
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
