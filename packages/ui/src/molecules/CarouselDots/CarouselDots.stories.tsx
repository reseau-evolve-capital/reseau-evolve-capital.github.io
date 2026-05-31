import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { CarouselDots } from './CarouselDots'

const meta: Meta<typeof CarouselDots> = {
  title: 'Molecules/CarouselDots',
  component: CarouselDots,
  tags: ['autodocs'],
  args: {
    onSelect: fn(),
  },
}
export default meta
type Story = StoryObj<typeof CarouselDots>

export const ThreeDotsFirstActive: Story = {
  args: {
    count: 3,
    active: 0,
  },
}

export const SecondActive: Story = {
  args: {
    count: 3,
    active: 1,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Clique sur le point 2 (index 1) — déjà actif, mais on vérifie le callback
    const dot2 = canvas.getByRole('button', { name: 'Aller à la slide 2' })
    await userEvent.click(dot2)
    expect(args.onSelect).toHaveBeenCalledWith(1)
  },
}
