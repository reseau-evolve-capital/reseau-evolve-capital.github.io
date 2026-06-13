import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'

import { PollCreateForm } from './PollCreateForm'

const meta: Meta<typeof PollCreateForm> = {
  title: 'Organisms/PollCreateForm',
  component: PollCreateForm,
  tags: ['autodocs'],
  args: { onSubmit: fn() },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg-page p-6">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof PollCreateForm>

/** Step 1 : intitulé + type-cards. Continuer s'active une fois le titre saisi. */
export const Step1: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const next = canvas.getByRole('button', { name: /Continuer/ })
    await expect(next).toBeDisabled()
    await userEvent.type(
      canvas.getByLabelText('Intitulé du vote'),
      'Quel secteur prioriser pour Q3 ?'
    )
    await userEvent.click(canvas.getByRole('radio', { name: /Choix unique/ }))
    await expect(next).toBeEnabled()
  },
}

/** Parcours complet jusqu'au step 2 (options + paramètres) et publication. */
export const PublishFlow: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Intitulé du vote'), 'Quel secteur prioriser ?')
    await userEvent.click(canvas.getByRole('radio', { name: /Choix unique/ }))
    await userEvent.click(canvas.getByRole('button', { name: /Continuer/ }))
    const opts = canvas.getAllByLabelText(/Options de réponse \d/)
    await userEvent.type(opts[0]!, 'Technologie')
    await userEvent.type(opts[1]!, 'Santé')
    await userEvent.click(canvas.getByRole('button', { name: 'Publier' }))
    await expect(args.onSubmit).toHaveBeenCalled()
  },
}
