import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'

import { PollCard } from './PollCard'

const meta: Meta<typeof PollCard> = {
  title: 'Molecules/PollCard',
  component: PollCard,
  tags: ['autodocs'],
  args: { onVote: fn(), onViewResults: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-bg-page p-4">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof PollCard>

/** À voter : badge doré + CTA Voter. */
export const ToVote: Story = {
  args: {
    title: 'Faut-il diversifier vers les SCPI ?',
    status: 'to_vote',
    type: 'Choix unique',
    deadline: 'Clôture 20 juin',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Voter/ }))
    await expect(args.onVote).toHaveBeenCalled()
  },
}

/** Voté : badge vert + hint résultats à la clôture. */
export const Voted: Story = {
  args: {
    title: "Êtes-vous disponible pour l'AG de septembre ?",
    status: 'voted',
    type: 'Oui / Non',
    deadline: 'Clôture 28 juin',
  },
}

/** Clôturé : participation + lien Voir résultats. */
export const Closed: Story = {
  args: {
    title: 'Quel secteur prioriser pour Q3 ?',
    status: 'closed',
    closedAt: 'Clos le 31 mai',
    participation: '10/12 membres ont voté (83 %)',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Voir résultats/ }))
    await expect(args.onViewResults).toHaveBeenCalled()
  },
}
