import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'

import { PollBanner } from './PollBanner'

const meta: Meta<typeof PollBanner> = {
  title: 'Molecules/PollBanner',
  component: PollBanner,
  tags: ['autodocs'],
  args: {
    title: 'Faut-il diversifier vers les SCPI ?',
    type: 'Choix unique',
    deadline: 'Clôture 20 juin',
    onVote: fn(),
    onViewAll: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl bg-bg-page p-4">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof PollBanner>

/** 1 vote ouvert : titre + méta + CTA « Voter ». Le clic déclenche onVote. */
export const Single: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const cta = canvas.getByRole('button', { name: /Voter/ })
    await userEvent.click(cta)
    await expect(args.onVote).toHaveBeenCalled()
  },
}

/** Variante agrégée (≥ 3 votes) : « X votes en attente → Voir tous ». */
export const Aggregate: Story = {
  args: {
    variant: 'aggregate',
    count: 4,
    aggregateSubtitle: 'Échéances entre le 18 et le 30 juin',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('4 votes en attente de votre réponse')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: /Voir tous/ }))
    await expect(args.onViewAll).toHaveBeenCalled()
  },
}

/** Deux bannières empilées (cas « 2 votes ouverts »). */
export const Stacked: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <PollBanner {...args} />
      <PollBanner
        {...args}
        title="Êtes-vous disponible pour l'AG de septembre ?"
        type="Oui / Non"
        deadline="Clôture 28 juin"
      />
    </div>
  ),
}
