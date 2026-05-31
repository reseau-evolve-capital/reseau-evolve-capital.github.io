import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { CarouselSlider } from './CarouselSlider'

const meta: Meta<typeof CarouselSlider> = {
  title: 'Organisms/CarouselSlider',
  component: CarouselSlider,
  tags: ['autodocs'],
  args: {
    onActiveChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof CarouselSlider>

const sampleSlides = [
  <div key="1" className="rounded-lg bg-card-sub p-8 text-center">
    <p className="font-body text-text">Slide 1 — Bienvenue</p>
  </div>,
  <div key="2" className="rounded-lg bg-card-sub p-8 text-center">
    <p className="font-body text-text">Slide 2 — Votre club</p>
  </div>,
  <div key="3" className="rounded-lg bg-card-sub p-8 text-center">
    <p className="font-body text-text">Slide 3 — Démarrer</p>
  </div>,
]

/** Rendu avec trois slides, état contrôlé en local */
export const ThreeSlides: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [active, setActive] = useState(0)
    return (
      <div className="max-w-[480px] p-4">
        <CarouselSlider
          {...args}
          slides={sampleSlides}
          active={active}
          onActiveChange={(i) => {
            setActive(i)
            args.onActiveChange(i)
          }}
        />
      </div>
    )
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    // Clique sur le point 2 (index 1) → onActiveChange(1)
    const dot2 = canvas.getByRole('tab', { name: 'Aller à la slide 2' })
    await userEvent.click(dot2)
    expect(args.onActiveChange).toHaveBeenCalledWith(1)

    // Focus sur le carrousel puis appuie sur ArrowRight → onActiveChange(2)
    const carousel = canvas.getByRole('region', { name: 'Présentation' })
    carousel.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(args.onActiveChange).toHaveBeenCalledWith(2)
  },
}
