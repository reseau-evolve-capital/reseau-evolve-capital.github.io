import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { AvatarUpload } from './AvatarUpload'

// Petit data-URI PNG 1×1 px pour la prévisualisation
const PREVIEW_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

const meta: Meta<typeof AvatarUpload> = {
  title: 'Atoms/AvatarUpload',
  component: AvatarUpload,
  tags: ['autodocs'],
  args: {
    onFileSelected: fn(),
  },
}
export default meta
type Story = StoryObj<typeof AvatarUpload>

export const Empty: Story = {
  args: {},
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const btn = canvas.getByRole('button', { name: /ajouter une photo/i })

    // Récupère l'input file masqué et simule l'upload d'un fichier
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!
    const fichier = new File(['pixel'], 'avatar.png', { type: 'image/png' })
    await userEvent.upload(input, fichier)

    // Vérifie que le callback onFileSelected a bien été appelé
    await expect(args.onFileSelected).toHaveBeenCalledWith(fichier)
    await expect(btn).toBeInTheDocument()
  },
}

export const WithPreview: Story = {
  args: { previewUrl: PREVIEW_URI },
}

export const WithError: Story = {
  args: { error: 'Format non supporté. Utilisez JPEG, PNG ou WebP.' },
}

export const Uploading: Story = {
  args: { isUploading: true },
}
