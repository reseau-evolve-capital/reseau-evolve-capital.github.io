import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { OperationField } from './OperationField'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof OperationField> = {
  title: 'Molecules/OperationField',
  component: OperationField,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof OperationField>

export const Input: Story = {
  args: { label: 'Référence virement', placeholder: 'ex. VIR-2026-0618' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByLabelText('Référence virement')).toBeTruthy()
  },
}

export const Required: Story = {
  args: { label: 'Membre', required: true, hint: 'Cotisation mensuelle : 300 €.' },
}

export const Amount: Story = {
  args: { variant: 'amount', label: 'Montant', required: true, defaultValue: '300' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain('€')
  },
}

export const WithError: Story = {
  args: {
    variant: 'amount',
    label: 'Montant',
    required: true,
    defaultValue: '40',
    error: 'Montant sous le minimum de 100 €.',
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByRole('alert')).toBeTruthy()
  },
}

export const SelectField: Story = {
  render: () => (
    <OperationField variant="select" label="Membre" required>
      <option value="">Sélectionner un membre</option>
      <option value="m1">Sofia Rossi</option>
      <option value="m2">Éric Lambert</option>
    </OperationField>
  ),
}

export const Textarea: Story = {
  args: { variant: 'textarea', label: 'Notes', placeholder: 'Optionnel' },
}

const Panel = () => (
  <div style={{ background: 'var(--bg)', padding: 24, display: 'grid', gap: 16, maxWidth: 360 }}>
    <OperationField label="Titre" required placeholder="ex. NASDAQ:NVDA" />
    <OperationField variant="amount" label="Prix unitaire" required defaultValue="154,97" />
    <OperationField
      variant="amount"
      label="Montant"
      required
      defaultValue="40"
      error="Montant sous le minimum de 100 €."
    />
  </div>
)

export const AllStates: Story = { render: () => <Panel /> }
export const AllStatesDark: Story = { decorators: [withDarkTheme], render: () => <Panel /> }
