import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent, expect } from 'storybook/test'
import { LocaleSwitcher } from './LocaleSwitcher'

const LOCALES = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' },
]

const meta: Meta<typeof LocaleSwitcher> = {
  title: 'Atoms/LocaleSwitcher',
  component: LocaleSwitcher,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-bg-page p-4">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof LocaleSwitcher>

/** Contrôle segmenté FR / EN — la locale active porte la pastille jaune + aria-pressed. */
export const Default: Story = {
  render: function Render() {
    const [current, setCurrent] = React.useState('fr')
    return <LocaleSwitcher locales={LOCALES} current={current} onSelect={setCurrent} />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const en = canvas.getByRole('button', { name: 'EN' })
    expect(en).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(en)
    // Le clic met à jour l'état contrôlé → EN devient actif.
    expect(en).toHaveAttribute('aria-pressed', 'true')
  },
}
