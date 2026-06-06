import type { Meta, StoryObj } from '@storybook/react'
import { SparklineMini } from './SparklineMini'

const meta: Meta<typeof SparklineMini> = {
  title: 'Molecules/SparklineMini',
  component: SparklineMini,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 240, height: 40 }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof SparklineMini>

/** Sparkline 30 points croissants — cas nominal */
export const Default: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => 100 + i * 5 + Math.sin(i) * 10),
  },
}

/** Moins de 2 points → rendu nul (le caller gère l'état vide) */
export const Short: Story = {
  args: {
    data: [42],
  },
}

/** Couleur token data-positive (variation positive) */
export const CustomColor: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => 100 + i * 3),
    color: 'var(--color-data-positive)',
  },
}
