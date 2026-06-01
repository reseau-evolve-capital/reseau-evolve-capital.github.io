import type { Meta, StoryObj } from '@storybook/react'
import { ContributionsTimeline, type TimelineYear } from './ContributionsTimeline'

const meta: Meta<typeof ContributionsTimeline> = {
  title: 'Organisms/ContributionsTimeline',
  component: ContributionsTimeline,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof ContributionsTimeline>

function full(
  year: number,
  variant: 'paid' | 'late' | 'pending' | 'exempt' = 'paid'
): TimelineYear {
  return {
    year,
    months: Array.from({ length: 12 }, (_, i) => 12 - i).map((month) => ({
      month,
      variant,
      tooltip: `Mois ${month}/${year} — ${variant}`,
      ariaLabel: `Mois ${month} ${year} ${variant}`,
    })),
  }
}

export const DeuxAnnees: Story = {
  args: {
    years: [
      {
        year: 2026,
        months: [
          {
            month: 4,
            variant: 'pending',
            tooltip: 'Avril 2026 — en attente',
            ariaLabel: 'Avril 2026 en attente',
          },
          {
            month: 3,
            variant: 'paid',
            tooltip: 'Mars 2026 — payé 100 € le 05/03/2026',
            ariaLabel: 'Mars 2026 payé',
          },
          {
            month: 2,
            variant: 'paid',
            tooltip: 'Février 2026 — payé',
            ariaLabel: 'Février 2026 payé',
          },
          {
            month: 1,
            variant: 'paid',
            tooltip: 'Janvier 2026 — payé',
            ariaLabel: 'Janvier 2026 payé',
          },
        ],
      },
      full(2025),
    ],
  },
}

export const HistoriqueLong: Story = {
  args: { years: [full(2026), full(2025), full(2024), full(2023), full(2022)] },
}

export const Vide: Story = { args: { years: [] } }

export const Chargement: Story = { args: { years: [], isLoading: true } }
