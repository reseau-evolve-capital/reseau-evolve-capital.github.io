import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './Text'

const meta: Meta<typeof Text> = {
  title: 'Atoms/Text',
  component: Text,
  tags: ['autodocs'],
  args: { children: "Texte d'exemple" },
}
export default meta
type Story = StoryObj<typeof Text>

export const BodyDefault: Story = {
  args: { children: 'Corps du texte — Plus Jakarta Sans 14px', variant: 'body' },
}

export const BodyLg: Story = {
  args: { children: 'Grand corps 16px', variant: 'body-lg' },
}

export const Caption: Story = {
  args: { children: 'CAPTION UPPERCASE 12PX', variant: 'caption' },
}

export const Mono: Story = {
  args: { children: 'MONO 10PX TRACKING', variant: 'mono' },
}

export const Secondary: Story = {
  args: { children: 'Texte secondaire', variant: 'body', color: 'text-sec' },
}

export const Tertiary: Story = {
  args: { children: 'Texte tertiaire', variant: 'body', color: 'text-ter' },
}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
      <Text variant="body-lg">Body LG — 16px Plus Jakarta Sans</Text>
      <Text variant="body">Body — 14px Plus Jakarta Sans</Text>
      <Text variant="caption">CAPTION — 12PX UPPERCASE</Text>
      <Text variant="mono">MONO — 12PX TRACKING</Text>
      <Text variant="body" color="text-sec">
        Secondaire
      </Text>
      <Text variant="body" color="text-ter">
        Tertiaire
      </Text>
    </div>
  ),
}
