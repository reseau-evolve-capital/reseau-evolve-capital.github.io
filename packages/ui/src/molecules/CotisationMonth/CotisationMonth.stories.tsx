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
    tooltip: 'Avril 2026 — en retard — 100 € dus',
    'aria-label': 'Avril 2026 en retard',
    size: 'md',
  },
}

export const Pending: Story = {
  args: {
    variant: 'pending',
    tooltip: 'Juin 2026 — en attente',
    'aria-label': 'Juin 2026 en attente',
    size: 'md',
  },
}

export const Exempt: Story = {
  args: {
    variant: 'exempt',
    tooltip: 'Exempté',
    'aria-label': 'Exempté',
    size: 'md',
  },
}

const MONTHS = [
  { variant: 'paid', label: 'Jan' },
  { variant: 'paid', label: 'Fév' },
  { variant: 'paid', label: 'Mar' },
  { variant: 'late', label: 'Avr' },
  { variant: 'pending', label: 'Mai' },
  { variant: 'paid', label: 'Jun' },
  { variant: 'exempt', label: 'Jul' },
  { variant: 'paid', label: 'Aoû' },
  { variant: 'paid', label: 'Sep' },
  { variant: 'paid', label: 'Oct' },
  { variant: 'paid', label: 'Nov' },
  { variant: 'pending', label: 'Déc' },
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
