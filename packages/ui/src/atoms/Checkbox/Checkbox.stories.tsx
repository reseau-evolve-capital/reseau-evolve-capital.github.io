import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from './Checkbox'

const meta: Meta<typeof Checkbox> = {
  title: 'Atoms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof Checkbox>

export const Unchecked: Story = {
  args: { 'aria-label': 'Option non cochée' },
}

export const Checked: Story = {
  args: { defaultChecked: true, 'aria-label': 'Option cochée' },
}

export const Disabled: Story = {
  args: { disabled: true, 'aria-label': 'Option désactivée' },
}

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true, 'aria-label': 'Option désactivée et cochée' },
}

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16 }}>
      <Checkbox aria-label="Non coché" />
      <Checkbox defaultChecked aria-label="Coché" />
      <Checkbox disabled aria-label="Désactivé" />
      <Checkbox disabled defaultChecked aria-label="Désactivé coché" />
    </div>
  ),
}
