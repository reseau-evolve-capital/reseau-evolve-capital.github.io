import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within, waitFor } from 'storybook/test'
import * as React from 'react'

import {
  IosInstallInstructions,
  type IosInstallInstructionsCopy,
  type IosInstallStep,
} from './IosInstallInstructions'

// Copy d'exemple (spec §5). Présentationnel : aucune string codée en dur dans le composant.
const COPY: IosInstallInstructionsCopy = {
  step1Title: 'Appuie sur Partager',
  step1Body:
    "L'icône Partager, en bas de Safari. Au centre de la barre d'outils. Appuie dessus pour ouvrir le menu de partage.",
  step1Caption: 'En bas de Safari',
  step2Title: "« Sur l'écran d'accueil »",
  step2Body:
    "Dans le menu, descends puis choisis cette option. Evolve s'ajoute à ton écran d'accueil.",
  step2Caption: '5e du haut',
  step2HighlightLabel: "Sur l'écran d'accueil",
  next: 'Étape suivante',
  done: "C'est fait",
  close: 'Fermer',
  stepLabel: (current: IosInstallStep, total: number) => `Étape ${current} sur ${total}`,
}

const meta: Meta<typeof IosInstallInstructions> = {
  title: 'Organisms/IosInstallInstructions',
  component: IosInstallInstructions,
  tags: ['autodocs'],
  args: {
    open: true,
    device: 'iphone',
    onClose: fn(),
    onStepView: fn(),
    copy: COPY,
  },
}
export default meta
type Story = StoryObj<typeof IosInstallInstructions>

/** Étape 1 — iPhone : icône Partager en bas-centre de Safari. */
export const Step1Iphone: Story = {
  args: { device: 'iphone' },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByRole('dialog')).toBeInTheDocument()
    await expect(body.getByText(COPY.step1Title)).toBeInTheDocument()
    await expect(body.getByText('Étape 1 sur 2')).toBeInTheDocument()
  },
}

/** Étape 1 — iPad : icône Partager en haut-droite de la barre d'adresse. */
export const Step1Ipad: Story = {
  args: { device: 'ipad' },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await expect(body.getByText(COPY.step1Title)).toBeInTheDocument()
  },
}

/** Variante sombre (data-theme="dark"). */
export const Dark: Story = {
  args: { device: 'iphone' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="min-h-[200px] bg-bg-page p-4">
        <Story />
      </div>
    ),
  ],
}

/**
 * Parcours complet : ouvre → étape 1 → « Étape suivante » → étape 2 → Escape ferme.
 * `open` contrôlé pour refléter la fermeture (onClose).
 */
export const FullFlow: Story = {
  render: (args) => {
    const [open, setOpen] = React.useState(true)
    return (
      <IosInstallInstructions
        {...args}
        open={open}
        onClose={() => {
          args.onClose?.()
          setOpen(false)
        }}
      />
    )
  },
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body)
    // Étape 1.
    await expect(body.getByText(COPY.step1Title)).toBeInTheDocument()
    // Avance à l'étape 2.
    await userEvent.click(body.getByRole('button', { name: COPY.next }))
    await waitFor(() => expect(body.getByText(COPY.step2Title)).toBeInTheDocument())
    await expect(body.getByText('Étape 2 sur 2')).toBeInTheDocument()
    await expect(args.onStepView).toHaveBeenCalledWith(2)
    // Escape ferme la modale (Radix) → onClose.
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}
