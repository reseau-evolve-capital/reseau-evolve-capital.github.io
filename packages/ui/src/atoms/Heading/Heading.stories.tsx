import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './Heading'

const meta: Meta<typeof Heading> = {
  title: 'Atoms/Heading',
  component: Heading,
  tags: ['autodocs'],
  args: { children: 'Titre exemple' },
}
export default meta
type Story = StoryObj<typeof Heading>

export const DisplayXL: Story = {
  args: { level: 'display-xl', children: 'Display XL — 72px Tommy Soft Black' },
}

export const DisplayL: Story = {
  args: { level: 'display-l', children: 'Display L — 56px Tommy Soft Black' },
}

export const H1: Story = {
  args: { level: 'h1', children: 'H1 — 32px Tommy Soft Bold' },
}

export const H2: Story = {
  args: { level: 'h2', children: 'H2 — 24px Tommy Soft Bold' },
}

export const H3: Story = {
  args: { level: 'h3', children: 'H3 — 20px Tommy Soft Semibold' },
}

export const AllLevels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <Heading level="display-xl">Display XL — 72px Tommy Soft Black</Heading>
      <Heading level="display-l">Display L — 56px Tommy Soft Black</Heading>
      <Heading level="h1">H1 — 32px Tommy Soft Bold</Heading>
      <Heading level="h2">H2 — 24px Tommy Soft Bold</Heading>
      <Heading level="h3">H3 — 20px Tommy Soft Semibold</Heading>
    </div>
  ),
}
