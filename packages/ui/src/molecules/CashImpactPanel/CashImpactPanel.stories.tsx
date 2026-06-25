import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { CashImpactPanel } from './CashImpactPanel'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof CashImpactPanel> = {
  title: 'Molecules/CashImpactPanel',
  component: CashImpactPanel,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof CashImpactPanel>

export const Inflow: Story = {
  args: { value: 300, note: 'Cotisation encaissée → entre au solde espèces.' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText(/\+300/)).toBeTruthy()
  },
}

export const Outflow: Story = {
  args: { value: -233229, note: '1 505 titres × 154,97 € — sort du solde espèces.' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain('−')
  },
}

export const Empty: Story = {
  args: { value: null, note: 'Quantité × prix unitaire — sort du solde espèces.' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain('—')
  },
}

const Panel = () => (
  <div style={{ background: 'var(--bg)', padding: 24, display: 'grid', gap: 16, maxWidth: 480 }}>
    <CashImpactPanel value={300} note="Cotisation encaissée → entre au solde espèces." />
    <CashImpactPanel value={-18} note="Frais débités → sortent du solde espèces." />
    <CashImpactPanel value={null} note="Quantité × prix unitaire — sort du solde espèces." />
  </div>
)

export const AllStates: Story = { render: () => <Panel /> }
export const AllStatesDark: Story = { decorators: [withDarkTheme], render: () => <Panel /> }
