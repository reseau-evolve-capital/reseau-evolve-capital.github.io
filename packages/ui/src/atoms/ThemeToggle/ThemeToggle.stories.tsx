import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from 'storybook/test'
import { ThemeToggle } from './ThemeToggle'

const meta: Meta<typeof ThemeToggle> = {
  title: 'Atoms/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-card p-4">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof ThemeToggle>

/** Bascule clair / sombre. Le clic met à jour `data-theme` sur `<html>` et `aria-pressed`. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole('button')
    const before = button.getAttribute('aria-pressed')
    await userEvent.click(button)
    // L'état aria-pressed s'inverse après le clic.
    expect(button.getAttribute('aria-pressed')).not.toBe(before)
  },
}
