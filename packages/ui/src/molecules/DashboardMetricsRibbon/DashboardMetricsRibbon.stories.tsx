import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from 'storybook/test'
import { DashboardMetricsRibbon } from './DashboardMetricsRibbon'

const meta: Meta<typeof DashboardMetricsRibbon> = {
  title: 'Molecules/DashboardMetricsRibbon',
  component: DashboardMetricsRibbon,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 420, padding: 16, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof DashboardMetricsRibbon>

/** Trois métriques nominales du dashboard. */
export const Default: Story = {
  args: {
    items: [
      { label: 'Investi', value: '12 400 €' },
      { label: 'Plus-value', value: '+2 854 €' },
      { label: 'Cotisé', value: '9 600 €' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const terms = canvas.getAllByRole('term')
    expect(terms).toHaveLength(3)
    expect(canvas.getByText('Plus-value')).toBeInTheDocument()
    expect(canvas.getByText('+2 854 €')).toBeInTheDocument()
  },
}

/** Labels longs — troncature des libellés, valeurs sans retour à la ligne. */
export const ValeursLongues: Story = {
  args: {
    items: [
      { label: 'Capital investi cumulé', value: '1 245 320,50 €' },
      { label: 'Plus-value latente totale', value: '+128 540,25 €' },
      { label: 'Cotisations versées', value: '986 600,00 €' },
    ],
  },
}

/** Variante sombre (data-theme="dark"). */
export const Dark: Story = {
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        style={{ width: 420, padding: 16, background: 'var(--color-bg-page)' }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    items: [
      { label: 'Investi', value: '12 400 €' },
      { label: 'Plus-value', value: '+2 854 €' },
      { label: 'Cotisé', value: '9 600 €' },
    ],
  },
}
