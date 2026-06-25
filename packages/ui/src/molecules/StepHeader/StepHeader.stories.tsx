import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { StepHeader } from './StepHeader'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof StepHeader> = {
  title: 'Molecules/StepHeader',
  component: StepHeader,
  tags: ['autodocs'],
  args: { step: 1, total: 3 },
}
export default meta
type Story = StoryObj<typeof StepHeader>

export const Step1: Story = {
  args: { step: 1 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Nouvelle opération')).toBeTruthy()
    await expect(canvasElement.textContent).toContain('Étape 1 / 3')
  },
}

export const Step2: Story = { args: { step: 2 } }

export const Step3: Story = {
  args: { step: 3 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain('Étape 3 / 3')
  },
}

export const English: Story = {
  args: {
    step: 2,
    title: 'New operation',
    backLabel: 'Operations',
    stepLabelTemplate: 'Step {n} / {total}',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain('Step 2 / 3')
  },
}

export const Dark: Story = {
  decorators: [withDarkTheme],
  args: { step: 2 },
}
