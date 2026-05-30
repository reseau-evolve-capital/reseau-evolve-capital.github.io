import type { Meta, StoryObj } from '@storybook/react'
import { Pill } from './Pill'

const meta: Meta<typeof Pill> = {
  title: 'Atoms/Pill',
  component: Pill,
  tags: ['autodocs'],
  args: { children: 'Statut' },
}
export default meta
type Story = StoryObj<typeof Pill>

export const CotisationOk: Story = {
  args: { status: 'cotisation-ok', children: 'Régulière' },
}

export const CotisationLate: Story = {
  args: { status: 'cotisation-late', children: 'En retard' },
}

export const CotisationPending: Story = {
  args: { status: 'cotisation-pending', children: 'En attente' },
}

export const CotisationExempt: Story = {
  args: { status: 'cotisation-exempt', children: 'Exempté' },
}

export const AllStatuts: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 16 }}>
      <Pill status="cotisation-ok">Régulière</Pill>
      <Pill status="cotisation-late">En retard</Pill>
      <Pill status="cotisation-pending">En attente</Pill>
      <Pill status="cotisation-exempt">Exempté</Pill>
    </div>
  ),
}
