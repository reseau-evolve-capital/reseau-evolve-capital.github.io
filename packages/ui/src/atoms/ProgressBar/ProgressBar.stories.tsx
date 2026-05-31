import type { Meta, StoryObj } from '@storybook/react'
import { ProgressBar } from './ProgressBar'

const meta: Meta<typeof ProgressBar> = {
  title: 'Atoms/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
}
export default meta
type Story = StoryObj<typeof ProgressBar>

export const Step1of3: Story = {
  args: { value: 33, label: 'Étape 1 sur 3' },
}

export const Step2of3: Story = {
  args: { value: 66, label: 'Étape 2 sur 3' },
}

export const Complete: Story = {
  args: { value: 100, label: 'Étape 3 sur 3 — terminé' },
}

export const ToutesLesEtapes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, maxWidth: 320 }}>
      <ProgressBar value={33} label="Étape 1 sur 3" />
      <ProgressBar value={66} label="Étape 2 sur 3" />
      <ProgressBar value={100} label="Étape 3 sur 3 — terminé" />
    </div>
  ),
}
