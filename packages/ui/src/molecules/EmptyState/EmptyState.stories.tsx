import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { EmptyState } from './EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="flex min-h-screen items-center justify-center bg-bg-page p-8">
        <div className="w-full max-w-md">
          <Story />
        </div>
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof EmptyState>

/** État vide — pas encore de données synchronisées */
export const NoData: Story = {
  args: {
    icon: 'Calendar',
    title: 'Données non disponibles',
    description:
      "Tes données ne sont pas encore disponibles. Le trésorier doit d'abord synchroniser la matrice.",
    action: {
      label: 'En savoir plus',
      onClick: fn(),
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button', { name: /en savoir plus/i })
    await userEvent.click(button)
    expect(args.action?.onClick).toHaveBeenCalled()
  },
}

/** État d'erreur — chargement impossible */
export const ErrorState: Story = {
  args: {
    title: "On n'a pas pu charger tes données. Réessaie ?",
    description: 'Tes données restent en sécurité.',
    action: {
      label: 'Réessayer',
      onClick: fn(),
    },
  },
}

/** Minimal — titre seul, sans icône ni action */
export const Minimal: Story = {
  args: {
    title: 'Rien à afficher pour le moment.',
  },
}

/** Landmark `region` nommé explicitement via `aria-label` (sinon le `title` sert de nom). */
export const WithAriaLabel: Story = {
  args: {
    icon: 'ChartPie',
    title: 'Aucune position',
    description: "Ton club n'a pas encore de position ouverte.",
    'aria-label': 'Portefeuille vide',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByRole('region', { name: 'Portefeuille vide' })).toBeInTheDocument()
  },
}
