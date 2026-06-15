import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { useState } from 'react'
import { SegmentedToggle, type SegmentedToggleProps } from './SegmentedToggle'

const meta: Meta<typeof SegmentedToggle> = {
  title: 'Molecules/SegmentedToggle',
  component: SegmentedToggle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 16, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof SegmentedToggle>

/** Bascule contrôlée (état local de démo) — wrapper pour voir la pill bouger. */
function Controlled({ initial, onChange, ...rest }: SegmentedToggleProps & { initial: string }) {
  const [value, setValue] = useState(initial)
  return (
    <SegmentedToggle
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

/** Cas portefeuille : « Par secteur » / « Par titre ». La bascule déplace la pill active. */
export const SecteurTitre: Story = {
  args: {
    options: [
      { value: 'sector', label: 'Par secteur' },
      { value: 'title', label: 'Par titre' },
    ],
    value: 'sector',
    onChange: fn(),
    ariaLabel: 'Mode de répartition',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const sector = canvas.getByRole('button', { name: 'Par secteur' })
    const title = canvas.getByRole('button', { name: 'Par titre' })
    expect(sector).toHaveAttribute('aria-pressed', 'true')
    expect(title).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(title)
    expect(args.onChange).toHaveBeenCalledWith('title')
    // Focus visible au clavier
    await userEvent.tab()
    expect(sector).toHaveFocus()
  },
}

/** Bascule réellement contrôlée — l'aria-pressed suit l'état après clic. */
export const Interactive: Story = {
  render: (args) => <Controlled {...args} initial="title" />,
  args: {
    options: [
      { value: 'sector', label: 'Par secteur' },
      { value: 'title', label: 'Par titre' },
    ],
    value: 'title',
    ariaLabel: 'Mode de répartition',
    onChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sector = canvas.getByRole('button', { name: 'Par secteur' })
    expect(sector).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(sector)
    expect(sector).toHaveAttribute('aria-pressed', 'true')
  },
}

/** Cas période (réf dashboard) — options secondaires masquées en mobile. */
export const Periodes: Story = {
  args: {
    options: [
      { value: '7d', label: '7J' },
      { value: '30d', label: '30J' },
      { value: '90d', label: '90J', mobileHidden: true },
      { value: '1y', label: '1A', mobileHidden: true },
      { value: 'max', label: 'MAX' },
    ],
    value: '30d',
    onChange: fn(),
    ariaLabel: 'Période',
  },
}

/** Variante sombre (data-theme="dark"). */
export const Dark: Story = {
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ padding: 16, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    options: [
      { value: 'sector', label: 'Par secteur' },
      { value: 'title', label: 'Par titre' },
    ],
    value: 'title',
    onChange: fn(),
    ariaLabel: 'Mode de répartition',
  },
}
