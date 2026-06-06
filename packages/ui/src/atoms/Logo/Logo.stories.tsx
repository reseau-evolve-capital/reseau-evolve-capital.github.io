import type { Meta, StoryObj } from '@storybook/react'
import { Logo } from './Logo'

const meta: Meta<typeof Logo> = {
  title: 'Atoms/Logo',
  component: Logo,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['full', 'mark'] },
  },
}
export default meta
type Story = StoryObj<typeof Logo>

export const Full: Story = {
  args: { variant: 'full' },
}

export const Mark: Story = {
  args: { variant: 'mark' },
}

export const SurFondSombre: Story = {
  render: () => (
    <div
      data-theme="dark"
      style={{
        padding: 24,
        background: 'var(--color-bg)',
        borderRadius: 8,
        display: 'inline-flex',
        gap: 24,
      }}
    >
      <Logo variant="full" />
      <Logo variant="mark" />
    </div>
  ),
}
