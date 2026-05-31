import type { Meta, StoryObj } from '@storybook/react'
import { SlideCard } from './SlideCard'

const meta: Meta<typeof SlideCard> = {
  title: 'Molecules/SlideCard',
  component: SlideCard,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof SlideCard>

export const Default: Story = {
  args: {
    imageSrc: 'https://placehold.co/240x160/F5C842/1A1A1A?text=Evolve+Capital',
    imageAlt: 'Illustration de bienvenue',
    title: 'Bienvenue dans votre espace membre',
    body: 'Suivez vos investissements, consultez vos cotisations et restez informé des actualités du club.',
  },
}
