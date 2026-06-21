import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { AvatarCropModal, type AvatarCropModalProps } from './AvatarCropModal'

// Petite image SVG data URL (pas de réseau) à recadrer en démo.
const DEMO_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFCE00"/><stop offset="1" stop-color="#1A1A1A"/>
      </linearGradient></defs>
      <rect width="400" height="400" fill="url(#g)"/>
      <circle cx="200" cy="170" r="70" fill="#fff" opacity="0.85"/>
    </svg>`
  )

const meta: Meta<typeof AvatarCropModal> = {
  title: 'Organisms/AvatarCropModal',
  component: AvatarCropModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: { open: true, imageSrc: DEMO_IMAGE, onConfirm: fn(), onOpenChange: fn(), onCancel: fn() },
}
export default meta
type Story = StoryObj<typeof AvatarCropModal>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('dialog')).toBeInTheDocument()
    await expect(body.getByText('Ajuster ta photo')).toBeInTheDocument()
    await expect(body.getByRole('button', { name: 'Utiliser cette photo' })).toBeInTheDocument()
  },
}

export const English: Story = {
  args: {
    labels: {
      title: 'Adjust your photo',
      description: 'Drag and zoom to frame your face inside the circle.',
      cancel: 'Cancel',
      confirm: 'Use this photo',
      zoomLabel: 'Zoom',
      close: 'Close',
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByText('Adjust your photo')).toBeInTheDocument()
    await expect(body.getByRole('button', { name: 'Use this photo' })).toBeInTheDocument()
  },
}

export const Cancel: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(body.getByRole('button', { name: 'Annuler' }))
    await expect(args.onCancel).toHaveBeenCalled()
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
  },
}

/** Démo contrôlée : ouvre la modale via un bouton (état réel open/onOpenChange). */
export const Controlled: Story = {
  render: (args: AvatarCropModalProps) => {
    const [open, setOpen] = React.useState(false)
    return (
      <div className="p-6">
        <button
          type="button"
          className="rounded-md bg-brand-yellow px-4 py-2 text-[14px] font-semibold text-accent-ink"
          onClick={() => setOpen(true)}
        >
          Recadrer une photo
        </button>
        <AvatarCropModal {...args} open={open} onOpenChange={setOpen} />
      </div>
    )
  },
}
