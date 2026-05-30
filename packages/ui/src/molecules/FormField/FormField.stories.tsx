import type { Meta, StoryObj } from '@storybook/react'
import { FormField } from './FormField'
import { Input } from '../../atoms/Input'

const meta: Meta<typeof FormField> = {
  title: 'Molecules/FormField',
  component: FormField,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof FormField>

export const Default: Story = {
  render: () => (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <FormField label="Email" helpText="Votre adresse email professionnelle">
        {(props) => <Input {...props} placeholder="alice@club.fr" type="email" />}
      </FormField>
    </div>
  ),
}

export const Required: Story = {
  render: () => (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <FormField label="Email" required helpText="Ce champ est obligatoire">
        {(props) => <Input {...props} placeholder="alice@club.fr" type="email" />}
      </FormField>
    </div>
  ),
}

export const WithError: Story = {
  render: () => (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <FormField label="Email" error="Email invalide — veuillez vérifier le format" required>
        {(props) => <Input {...props} defaultValue="pas-un-email" type="email" />}
      </FormField>
    </div>
  ),
}

export const NoHelpText: Story = {
  render: () => (
    <div style={{ padding: 16, maxWidth: 400 }}>
      <FormField label="Nom complet">
        {(props) => <Input {...props} placeholder="Sophie Renard" />}
      </FormField>
    </div>
  ),
}
