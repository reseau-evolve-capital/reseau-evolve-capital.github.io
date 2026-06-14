import type { Meta, StoryObj } from '@storybook/react'
import { within, expect, userEvent } from 'storybook/test'
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
  variant: 'paid' | 'pending' | 'late' | 'future' | 'not_applicable' = 'paid'
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Affichage ascendant : dans 2026, Mars (3) précède Avril (4).
    const firstCell = canvas.getByRole('button', { name: 'Mars 2026 payé' })
    const secondCell = canvas.getByRole('button', { name: 'Avril 2026 en attente' })
    // Cliquer sur la première cellule pour lui donner le focus
    await userEvent.click(firstCell)
    expect(firstCell).toHaveFocus()
    // Simuler ArrowRight — le focus doit se déplacer sur la cellule suivante (mois +1)
    await userEvent.keyboard('{ArrowRight}')
    expect(secondCell).toHaveFocus()
  },
}

export const HistoriqueLong: Story = {
  args: { years: [full(2026), full(2025), full(2024), full(2023), full(2022)] },
}

/** Les 5 états de cellule côte à côte sur une même année. */
export const CinqEtats: Story = {
  args: {
    years: [
      {
        year: 2026,
        months: [
          {
            month: 1,
            variant: 'paid',
            tooltip: 'Janvier 2026 : payé.',
            ariaLabel: 'Janvier 2026 payé',
          },
          {
            month: 2,
            variant: 'paid',
            tooltip: 'Février 2026 : payé.',
            ariaLabel: 'Février 2026 payé',
          },
          {
            month: 3,
            variant: 'late',
            tooltip: 'Mars 2026 : à régler.',
            ariaLabel: 'Mars 2026 en retard',
          },
          {
            month: 4,
            variant: 'paid',
            tooltip: 'Avril 2026 : payé.',
            ariaLabel: 'Avril 2026 payé',
          },
          {
            month: 5,
            variant: 'pending',
            tooltip: 'Mai 2026 : en cours.',
            ariaLabel: 'Mai 2026 en cours',
          },
          {
            month: 6,
            variant: 'future',
            tooltip: 'Juin 2026 : à venir.',
            ariaLabel: 'Juin 2026 à venir',
          },
          {
            month: 7,
            variant: 'future',
            tooltip: 'Juillet 2026 : à venir.',
            ariaLabel: 'Juillet 2026 à venir',
          },
          {
            month: 8,
            variant: 'future',
            tooltip: 'Août 2026 : à venir.',
            ariaLabel: 'Août 2026 à venir',
          },
          {
            month: 9,
            variant: 'future',
            tooltip: 'Septembre 2026 : à venir.',
            ariaLabel: 'Septembre 2026 à venir',
          },
          {
            month: 10,
            variant: 'future',
            tooltip: 'Octobre 2026 : à venir.',
            ariaLabel: 'Octobre 2026 à venir',
          },
          {
            month: 11,
            variant: 'future',
            tooltip: 'Novembre 2026 : à venir.',
            ariaLabel: 'Novembre 2026 à venir',
          },
          {
            month: 12,
            variant: 'future',
            tooltip: 'Décembre 2026 : à venir.',
            ariaLabel: 'Décembre 2026 à venir',
          },
        ],
      },
    ],
  },
}

/** Membre arrivé en cours de route : les mois avant l'adhésion sont en « not_applicable ». */
export const ArriveEnCoursDeRoute: Story = {
  args: {
    years: [
      {
        year: 2025,
        // Adhésion en juillet 2025 → janvier–juin en not_applicable, juillet–décembre payés.
        months: Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const variant = month < 7 ? ('not_applicable' as const) : ('paid' as const)
          return {
            month,
            variant,
            tooltip:
              variant === 'not_applicable'
                ? `Mois ${month}/2025 : avant ton arrivée dans le club.`
                : `Mois ${month}/2025 : payé.`,
            ariaLabel: `Mois ${month} 2025 ${variant}`,
          }
        }),
      },
    ],
  },
}

export const Vide: Story = { args: { years: [] } }

export const Chargement: Story = { args: { years: [], isLoading: true } }
