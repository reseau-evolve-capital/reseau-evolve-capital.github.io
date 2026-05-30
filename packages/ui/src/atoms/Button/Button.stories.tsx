import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
}
export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { children: 'Bouton principal', variant: 'primary' } }
export const Secondary: Story = { args: { children: 'Secondaire', variant: 'secondary' } }
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } }
export const Danger: Story = { args: { children: 'Supprimer', variant: 'danger' } }
export const Loading: Story = { args: { children: 'Chargement', isLoading: true } }
export const Disabled: Story = { args: { children: 'Désactivé', disabled: true } }

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
}
