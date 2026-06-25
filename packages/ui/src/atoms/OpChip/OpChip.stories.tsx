import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { OpChip } from './OpChip'
import { OPERATION_TYPE_ORDER } from '../OperationType/operationTypes'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof OpChip> = {
  title: 'Atoms/OpChip',
  component: OpChip,
  tags: ['autodocs'],
  args: { type: 'contribution', size: 40 },
}
export default meta
type Story = StoryObj<typeof OpChip>

export const Cotisation: Story = { args: { type: 'contribution' } }
export const Dividende: Story = { args: { type: 'dividend_cash' } }
export const Penalite: Story = { args: { type: 'penalty' } }

export const Drawer: Story = {
  args: { type: 'buy', size: 48 },
  play: async ({ canvasElement }) => {
    const span = canvasElement.querySelector('span[aria-hidden="true"]') as HTMLElement
    await expect(span).toBeTruthy()
    await expect(span.style.width).toBe('48px')
  },
}

export const Cancelled: Story = {
  args: { type: 'sell', cancelled: true },
  play: async ({ canvasElement }) => {
    const span = canvasElement.querySelector('span[aria-hidden="true"]') as HTMLElement
    await expect(span.className).toContain('grayscale')
  },
}

const Row = () => (
  <div style={{ background: 'var(--bg)', padding: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    {OPERATION_TYPE_ORDER.map((t) => (
      <OpChip key={t} type={t} />
    ))}
  </div>
)

/** 6 types — thème clair. */
export const AllTypes: Story = {
  render: () => <Row />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chips = canvasElement.querySelectorAll('span[aria-hidden="true"]')
    await expect(chips.length).toBe(6)
    await expect(canvas).toBeTruthy()
  },
}

/** 6 types — thème sombre (vérifie le piège dividende `.op-chip-div`).
 *  NB : le thème est posé sur <html> par le décorateur global (mécanisme requis
 *  pour que les tokens `@theme` Tailwind v4 basculent ; un wrapper `data-theme`
 *  imbriqué ne suffit pas car les vars `--color-*` sont résolues au :root). */
export const AllTypesDark: Story = {
  decorators: [withDarkTheme],
  render: () => <Row />,
}
