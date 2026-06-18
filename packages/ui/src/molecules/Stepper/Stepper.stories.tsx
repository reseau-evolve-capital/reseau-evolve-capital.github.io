import type { Meta, StoryObj } from '@storybook/react'
import { within, expect } from 'storybook/test'
import { Stepper, type StepperStep } from './Stepper'

const STEPS: StepperStep[] = [
  { id: 'infos', label: 'Infos' },
  { id: 'matrice', label: 'Matrice' },
  { id: 'import', label: 'Import' },
]

const meta: Meta<typeof Stepper> = {
  title: 'Molecules/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  args: { steps: STEPS, ariaLabel: 'Étapes de l’assistant' },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, maxWidth: 720, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof Stepper>

/** Étape 1 active (aucune complétée). */
export const Step1: Story = {
  args: { current: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const items = canvas.getAllByRole('listitem')
    await expect(items[0]).toHaveAttribute('aria-current', 'step')
    await expect(canvas.getByText('Matrice')).toBeVisible()
  },
}

/** Étape 2 active : « Infos » est complétée (check). */
export const Step2: Story = {
  args: { current: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const items = canvas.getAllByRole('listitem')
    await expect(items[1]).toHaveAttribute('aria-current', 'step')
    await expect(items[0]).not.toHaveAttribute('aria-current')
  },
}

/** Dernière étape active : « Infos » et « Matrice » complétées. */
export const Step3: Story = {
  args: { current: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const items = canvas.getAllByRole('listitem')
    await expect(items[2]).toHaveAttribute('aria-current', 'step')
  },
}
