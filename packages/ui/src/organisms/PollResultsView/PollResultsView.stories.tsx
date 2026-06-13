import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from 'storybook/test'

import { PollResultsView } from './PollResultsView'

const meta: Meta<typeof PollResultsView> = {
  title: 'Organisms/PollResultsView',
  component: PollResultsView,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-xl bg-bg-page p-4">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof PollResultsView>

/** Oui / Non — barre majoritaire dorée + point, secondaires en opacity réduite, total 100 %. */
export const YesNo: Story = {
  args: {
    title: 'Faut-il diversifier vers les SCPI ?',
    questionType: 'yes_no',
    rows: [
      { label: 'Oui', pct: 67 },
      { label: 'Non', pct: 25 },
      { label: 'Abstention', pct: 8 },
    ],
    participation: '12/12 membres ont voté (100 %)',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole('progressbar')).toHaveLength(3)
    await expect(canvas.getByText('12/12 membres ont voté (100 %)')).toBeVisible()
    // Une seule option majoritaire marquée.
    await expect(canvas.getAllByText(/Option majoritaire/i)).toHaveLength(1)
  },
}

/** Choix multiple — somme > 100 %, note explicative. */
export const MultipleChoice: Story = {
  args: {
    title: 'Quels thèmes souhaitez-vous aborder en AG ?',
    questionType: 'multiple_choice',
    rows: [
      { label: 'Gouvernance', pct: 91 },
      { label: 'Bilan annuel', pct: 82 },
      { label: 'Politique d’investissement', pct: 64 },
      { label: 'Nouveaux membres', pct: 45 },
    ],
    participation: '11/12 membres ont voté (92 %)',
  },
}

/** Réponse courte — liste de réponses anonymes + « … N autres réponses ». */
export const ShortText: Story = {
  args: {
    title: 'Une remarque à formuler sur la stratégie ?',
    questionType: 'short_text',
    textResponses: [
      'Renforcer la transparence sur les frais et publier un comparatif net de fiscalité.',
      'Maintenir le cap : éviter l’empressement, privilégier les positions de long terme.',
      'Présenter un point de risque trimestriel avant chaque arbitrage important.',
      'Réponse 4',
      'Réponse 5',
      'Réponse 6',
      'Réponse 7',
      'Réponse 8',
      'Réponse 9',
    ],
    participation: '9/12 membres ont voté (75 %)',
  },
}

/** État vide. */
export const Empty: Story = {
  args: { title: 'Vote sans réponse', questionType: 'yes_no', rows: [] },
}
