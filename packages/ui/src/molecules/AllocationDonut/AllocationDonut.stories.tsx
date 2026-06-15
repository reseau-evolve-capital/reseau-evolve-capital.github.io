import type { Meta, StoryObj } from '@storybook/react'
import { AllocationDonut } from './AllocationDonut'

const meta: Meta<typeof AllocationDonut> = {
  title: 'Molecules/AllocationDonut',
  component: AllocationDonut,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof AllocationDonut>

export const ParSecteur: Story = {
  args: {
    totalValue: 25000,
    data: [
      { label: 'Technologie', value: 18000, percentage: 0.72 },
      { label: 'Santé', value: 3750, percentage: 0.15 },
      { label: 'Autres', value: 3250, percentage: 0.13 },
    ],
  },
}

export const CinqSecteurs: Story = {
  args: {
    totalValue: 50000,
    data: [
      { label: 'Technologie', value: 20000, percentage: 0.4 },
      { label: 'Santé', value: 12500, percentage: 0.25 },
      { label: 'Finance', value: 7500, percentage: 0.15 },
      { label: 'Énergie', value: 5000, percentage: 0.1 },
      { label: 'Autres', value: 5000, percentage: 0.1, isOther: true },
    ],
  },
}

// RT-11 : libellés EN avec flag `isOther` → le bucket « Other » reste en token neutre,
// indépendamment de la langue (le flag remplace le match de string FR).
export const RegroupementEN: Story = {
  args: {
    totalLabel: 'Total value',
    data: [
      { label: 'Technology', value: 20000, percentage: 0.5 },
      { label: 'Healthcare', value: 12500, percentage: 0.3125 },
      { label: 'Other', value: 7500, percentage: 0.1875, isOther: true },
    ],
    totalValue: 40000,
  },
}
