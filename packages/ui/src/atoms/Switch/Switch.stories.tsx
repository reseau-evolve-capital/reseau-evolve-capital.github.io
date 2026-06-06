import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from './Switch'

const meta: Meta<typeof Switch> = {
  title: 'Atoms/Switch',
  component: Switch,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Switch>

export const Off: Story = {
  args: { 'aria-label': 'Désactivé' },
}

export const On: Story = {
  args: { defaultChecked: true, 'aria-label': 'Activé' },
}

export const Disabled: Story = {
  args: { disabled: true, 'aria-label': 'Désactivé (non interactif)' },
}

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16 }}>
      <Switch aria-label="Off" />
      <Switch defaultChecked aria-label="On" />
      <Switch disabled aria-label="Désactivé" />
    </div>
  ),
}
