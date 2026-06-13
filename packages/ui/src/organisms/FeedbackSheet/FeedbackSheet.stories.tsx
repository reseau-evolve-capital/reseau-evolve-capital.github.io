import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { FeedbackSheet, type FeedbackSheetProps } from './FeedbackSheet'

// 1×1 PNG transparent — sert de contenu aux File uploadés dans les play functions.
const SAMPLE_PNG_BYTES = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAYAAAH7+ZcAAAAASUVORK5CYII='
  ),
  (c) => c.charCodeAt(0)
)

/** Fabrique un File image pour le sélecteur de fichiers. */
function pngFile(name: string): File {
  return new File([SAMPLE_PNG_BYTES], name, { type: 'image/png' })
}

const meta: Meta<typeof FeedbackSheet> = {
  title: 'Organisms/FeedbackSheet',
  component: FeedbackSheet,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    currentRoute: '/portefeuille · 18.04',
    onOpenChange: fn(),
    // Résout par défaut → mène à l'état success.
    onSubmit: fn(async () => {}),
  },
}
export default meta
type Story = StoryObj<typeof FeedbackSheet>

// Les play functions ciblent le body (Radix porte la Content dans un Portal).
const body = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body)

/** Input file caché (type="file") — pas de rôle accessible, ciblé par sélecteur. */
const fileInput = (canvasElement: HTMLElement): HTMLInputElement => {
  const input = canvasElement.ownerDocument.body.querySelector('input[type="file"]')
  if (!input) throw new Error('file input introuvable')
  return input as HTMLInputElement
}

const thumbCount = (canvasElement: HTMLElement) =>
  canvasElement.ownerDocument.body.querySelectorAll('img[alt=""]').length

/** Idle : en-tête + 3 pills + textarea + encart route + CTA. Type par défaut = Idée. */
export const Idle: Story = {
  play: async ({ canvasElement }) => {
    const c = body(canvasElement)
    await expect(c.getByRole('dialog')).toBeInTheDocument()
    await expect(c.getByText('Un retour à partager ?')).toBeInTheDocument()
    await expect(c.getByRole('button', { name: 'Idée' })).toHaveAttribute('aria-pressed', 'true')
    await expect(c.getByText('/portefeuille · 18.04')).toBeInTheDocument()
    // Bouton joindre des images présent (input file dans le DOM).
    await expect(
      c.getByRole('button', { name: 'Joindre des images (optionnel)' })
    ).toBeInTheDocument()
    // Vide → CTA désactivé.
    await expect(c.getByRole('button', { name: 'Envoyer →' })).toBeDisabled()
  },
}

/** Sélection de type : le clic change aria-pressed et le placeholder. */
export const SelectType: Story = {
  play: async ({ canvasElement }) => {
    const c = body(canvasElement)
    await userEvent.click(c.getByRole('button', { name: 'Bug' }))
    await expect(c.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true')
    await expect(c.getByPlaceholderText('Décris ce que tu as constaté…')).toBeInTheDocument()
    await userEvent.click(c.getByRole('button', { name: 'Question' }))
    await expect(c.getByPlaceholderText('Pose ta question…')).toBeInTheDocument()
  },
}

/** Images jointes : upload de 2 images via l'input file → 2 vignettes + retrait d'une. */
export const WithImages: Story = {
  play: async ({ canvasElement }) => {
    const c = body(canvasElement)
    await userEvent.upload(fileInput(canvasElement), [pngFile('1.png'), pngFile('2.png')])
    await waitFor(() => expect(thumbCount(canvasElement)).toBe(2))
    // Mention vie privée plurielle, honnête (pas de claim « floutées »).
    await expect(
      c.getByText('Ces images seront partagées uniquement avec l’équipe technique.')
    ).toBeInTheDocument()
    await expect(c.getByText('2/3')).toBeInTheDocument()
    // Retirer la 1ʳᵉ image → 1 vignette restante.
    await userEvent.click(c.getByRole('button', { name: 'Retirer l’image 1' }))
    await waitFor(() => expect(thumbCount(canvasElement)).toBe(1))
  },
}

/** Cap à 3 : un 4ᵉ fichier est ignoré ; le bouton joindre laisse place au hint « max ». */
export const MaxImages: Story = {
  play: async ({ canvasElement }) => {
    const c = body(canvasElement)
    await userEvent.upload(fileInput(canvasElement), [
      pngFile('1.png'),
      pngFile('2.png'),
      pngFile('3.png'),
      pngFile('4.png'),
    ])
    await waitFor(() => expect(thumbCount(canvasElement)).toBe(3))
    await expect(
      c.queryByRole('button', { name: 'Joindre des images (optionnel)' })
    ).not.toBeInTheDocument()
    await expect(c.getByText('3 images maximum')).toBeInTheDocument()
  },
}

/** Submit désactivé pendant le loading : onSubmit lent garde le sheet figé. */
export const Loading: Story = {
  args: {
    onSubmit: fn(() => new Promise<void>(() => {})), // ne résout jamais → reste en loading
  },
  play: async ({ canvasElement }) => {
    const c = body(canvasElement)
    await userEvent.type(c.getByLabelText('Ton message'), 'Un retour en cours d’envoi')
    const cta = c.getByRole('button', { name: 'Envoyer →' })
    await userEvent.click(cta)
    // Pendant l'envoi : bouton aria-busy + désactivé, libellé « Envoi… ».
    await waitFor(() => expect(c.getByRole('button', { name: /Envoi/ })).toBeDisabled())
    await expect(c.getByRole('button', { name: /Envoi/ })).toHaveAttribute('aria-busy', 'true')
  },
}

/** Success : onSubmit résout → écran de remerciement + CTA Fermer. */
export const Success: Story = {
  play: async ({ args, canvasElement }) => {
    const c = body(canvasElement)
    await userEvent.type(c.getByLabelText('Ton message'), 'Super produit, bravo !')
    await userEvent.click(c.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => expect(c.getByText('Merci pour ton retour.')).toBeInTheDocument())
    await expect(c.getByText('Vérifie ta boîte mail')).toBeInTheDocument()
    await userEvent.click(c.getByRole('button', { name: 'Fermer' }))
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

/** Error : onSubmit rejette → bandeau d'erreur + Réessayer (re-rempli). */
export const ErrorState: Story = {
  args: {
    onSubmit: fn(async () => {
      throw new globalThis.Error('network')
    }),
  },
  play: async ({ canvasElement }) => {
    const c = body(canvasElement)
    await userEvent.click(c.getByRole('button', { name: 'Bug' }))
    await userEvent.type(c.getByLabelText('Ton message'), 'Ça plante au reload')
    await userEvent.click(c.getByRole('button', { name: 'Envoyer →' }))
    await waitFor(() => expect(c.getByRole('alert')).toHaveTextContent("L'envoi a échoué."))
    // Réessayer → idle, données préservées.
    await userEvent.click(c.getByRole('button', { name: 'Réessayer' }))
    await expect(c.getByLabelText('Ton message')).toHaveValue('Ça plante au reload')
    await expect(c.getByRole('button', { name: 'Bug' })).toHaveAttribute('aria-pressed', 'true')
  },
}

/** Variante sombre : data-theme="dark" sur un wrapper. */
export const Dark: Story = {
  decorators: [
    (Story) => (
      <div data-theme="dark" className="min-h-[640px] bg-bg-page">
        <Story />
      </div>
    ),
  ],
}

/** Libellés EN via props (i18n côté app). */
export const English: Story = {
  args: {
    labels: {
      title: 'Got feedback?',
      subtitle: 'Bug, idea or question — we read every message.',
      types: { bug: 'Bug', feature: 'Idea', question: 'Question' },
      messageLabel: 'Your message',
      placeholders: {
        bug: 'Describe what you saw…',
        feature: 'Describe your idea…',
        question: 'Ask your question…',
      },
      attach: 'Attach images (optional)',
      attachMax: '3 images max',
      attached: 'Attached image',
      remove: 'Remove',
      removeImage: 'Remove image {n}',
      privacyNote: 'These images will be shared only with the tech team.',
      submit: 'Send →',
      contextLabel: 'Captured route',
      success: {
        title: 'Thanks for your feedback.',
        subtitle: "We got it. We'll email you if we need a detail.",
        pill: 'Check your inbox',
        close: 'Close',
      },
      error: { title: 'Sending failed.', retry: 'Try again' },
    },
  },
  play: async ({ canvasElement }) => {
    const c = body(canvasElement)
    await expect(c.getByText('Got feedback?')).toBeInTheDocument()
    await expect(c.getByLabelText('Your message')).toBeInTheDocument()
    await expect(c.getByRole('button', { name: 'Attach images (optional)' })).toBeInTheDocument()
  },
}

/** Démo contrôlée : ouvre/ferme le sheet via un bouton (open/onOpenChange réels). */
export const Controlled: Story = {
  render: (args: FeedbackSheetProps) => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-6">
        <button
          type="button"
          className="rounded-[var(--r-md)] bg-accent px-4 py-2 text-[14px] font-semibold text-accent-ink"
          onClick={() => setOpen(true)}
        >
          Donner un retour
        </button>
        <FeedbackSheet {...args} open={open} onOpenChange={setOpen} />
      </div>
    )
  },
}
