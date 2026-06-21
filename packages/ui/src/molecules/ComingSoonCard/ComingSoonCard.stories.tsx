import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from 'storybook/test'
import { ComingSoonCard } from './ComingSoonCard'

const meta: Meta<typeof ComingSoonCard> = {
  title: 'Molecules/ComingSoonCard',
  component: ComingSoonCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="flex min-h-screen items-start justify-center bg-bg-page p-8">
        <div className="w-full max-w-2xl">
          <Story />
        </div>
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof ComingSoonCard>

/** Panneau « Synthèse IA » de la console feedbacks (NET-019) — skeleton estompé, aucun faux contenu. */
export const SyntheseIA: Story = {
  args: {
    title: 'Synthèse IA',
    description:
      'Le digest IA agrégé des retours (thèmes récurrents, sentiment, priorités) arrive bientôt. En attendant, l’analyse IA par retour reste disponible dans le détail de chaque ligne.',
    withSkeleton: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Le panneau est exposé comme une région nommée par son titre.
    expect(canvas.getByRole('region', { name: 'Synthèse IA' })).toBeInTheDocument()
    // Badge « Bientôt » présent.
    expect(canvas.getByText('Bientôt')).toBeInTheDocument()
  },
}

/** Variante compacte (sans skeleton). */
export const Compact: Story = {
  args: {
    title: 'Intelligence réseau',
    description: 'Les suggestions de synergies cross-club seront disponibles prochainement.',
  },
}

/** Badge personnalisé (i18n). */
export const CustomBadge: Story = {
  args: {
    title: 'AI summary',
    description: 'The aggregated AI digest of member feedback is coming soon.',
    badgeLabel: 'Soon',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText('Soon')).toBeInTheDocument()
  },
}
