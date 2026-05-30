import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'Atoms/Input',
  component: Input,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { placeholder: 'Votre email…', type: 'email' },
}

export const WithValue: Story = {
  args: { defaultValue: 'alice@club.fr', type: 'email' },
}

export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'pas-un-email', type: 'email', placeholder: 'Email' },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'désactivé' },
}

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, maxWidth: 360 }}>
      <Input placeholder="État par défaut" />
      <Input defaultValue="Avec valeur" />
      <Input aria-invalid={true} defaultValue="invalide@" />
      <Input disabled defaultValue="Désactivé" />
    </div>
  ),
}
