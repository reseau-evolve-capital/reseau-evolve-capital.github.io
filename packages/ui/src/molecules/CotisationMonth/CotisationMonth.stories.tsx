import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from 'storybook/test'
import { CotisationMonth } from './CotisationMonth'

const meta: Meta<typeof CotisationMonth> = {
  title: 'Molecules/CotisationMonth',
  component: CotisationMonth,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof CotisationMonth>

export const Paid: Story = {
  args: {
    variant: 'paid',
    tooltip: 'Mai 2026 — payé le 03/05',
    'aria-label': 'Mai 2026 payé',
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const cell = canvas.getByRole('button', { name: 'Mai 2026 payé' })
    // « Payé » = jaune Evolve plein (accent de marque), jamais le vert data-positive.
    expect(cell.className).toContain('bg-brand-yellow')
    expect(cell.className).not.toContain('bg-data-positive')
  },
}

export const Late: Story = {
  args: {
    variant: 'late',
    tooltip: 'Avril 2026 : 100 € à régler.',
    'aria-label': 'Avril 2026 en retard',
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const cell = canvas.getByRole('button', { name: 'Avril 2026 en retard' })
    // « Retard » = ROUGE dataviz data-negative PLEIN (jamais le tint pâle data-negative-50,
    // jamais l'ambre data-warning, jamais le rouge brand #E93E3A réservé au branding).
    expect(cell.className).toContain('bg-data-negative')
    expect(cell.className).not.toContain('bg-data-negative-50')
    expect(cell.className).not.toContain('bg-data-warning')
    // Cible tactile : padding mobile (≥44px) replié sur sm (rendu compact 24px).
    expect(cell.className).toContain('p-2.5')
  },
}

export const Pending: Story = {
  args: {
    variant: 'pending',
    tooltip: 'Juin 2026 : cotisation en cours ce mois-ci.',
    'aria-label': 'Juin 2026 en attente',
    size: 'md',
  },
}

export const Future: Story = {
  args: {
    variant: 'future',
    tooltip: 'Juillet 2026 : à venir.',
    'aria-label': 'Juillet 2026 à venir',
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const cell = canvas.getByRole('button', { name: 'Juillet 2026 à venir' })
    // « À venir » = fond n-50 + anneau pointillé n-400 (overlay interne en md), jamais un fill plein.
    expect(cell.className).toContain('bg-neutral-50')
    expect(cell.querySelector('.border-dashed')).not.toBeNull()
  },
}

export const NotApplicable: Story = {
  args: {
    variant: 'not_applicable',
    tooltip: 'Janvier 2020 : avant ton arrivée dans le club.',
    'aria-label': 'Janvier 2020 avant ton arrivée',
    size: 'md',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const cell = canvas.getByRole('button', { name: 'Janvier 2020 avant ton arrivée' })
    // « Avant ton arrivée » = fond n-100 atténué + glyphe tiret.
    expect(cell.className).toContain('bg-neutral-100')
    expect(cell.textContent).toContain('–')
  },
}

const MONTHS = [
  { variant: 'not_applicable', label: 'Jan' },
  { variant: 'not_applicable', label: 'Fév' },
  { variant: 'paid', label: 'Mar' },
  { variant: 'late', label: 'Avr' },
  { variant: 'pending', label: 'Mai' },
  { variant: 'paid', label: 'Jun' },
  { variant: 'future', label: 'Jul' },
  { variant: 'future', label: 'Aoû' },
  { variant: 'future', label: 'Sep' },
  { variant: 'future', label: 'Oct' },
  { variant: 'future', label: 'Nov' },
  { variant: 'future', label: 'Déc' },
] as const

export const Calendar12Months: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {MONTHS.map(({ variant, label }) => (
          <CotisationMonth
            key={label}
            variant={variant}
            tooltip={`${label} 2026 — ${variant}`}
            aria-label={`${label} 2026 — ${variant}`}
            size="md"
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {MONTHS.map(({ variant, label }) => (
          <CotisationMonth
            key={label}
            variant={variant}
            tooltip={`${label} 2026 — ${variant}`}
            aria-label={`${label} 2026 (petit) — ${variant}`}
            size="sm"
          />
        ))}
      </div>
    </div>
  ),
}
