import type { Meta, StoryObj } from '@storybook/react'
import { Divider } from './Divider'

const meta: Meta<typeof Divider> = {
  title: 'Atoms/Divider',
  component: Divider,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Divider>

export const Horizontal: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <p style={{ marginBottom: 12 }}>Contenu au-dessus</p>
      <Divider />
      <p style={{ marginTop: 12 }}>Contenu en-dessous</p>
    </div>
  ),
}

export const Strong: Story = {
  render: () => (
    <div style={{ padding: 16 }}>
      <p style={{ marginBottom: 12 }}>Contenu au-dessus</p>
      <Divider strong />
      <p style={{ marginTop: 12 }}>Contenu en-dessous</p>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, height: 48 }}>
      <span>Gauche</span>
      <Divider orientation="vertical" />
      <span>Droite</span>
    </div>
  ),
}
