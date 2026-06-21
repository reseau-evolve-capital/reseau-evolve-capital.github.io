import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { RegulariserList, type RegulariserListItem } from './RegulariserList'

const LABELS = {
  title: 'À régulariser',
  emptyTitle: 'Tout le monde est à jour',
  emptyDesc: "Aucun membre n'a de cotisation en retard.",
  relancer: 'Relancer',
  lateMonthsLabel: (count: number) => `${count} mois en retard`,
  amountDueAriaLabel: 'Montant dû',
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const THREE_ITEMS: RegulariserListItem[] = [
  {
    membershipId: 'mem-001',
    fullName: 'Alice Durand',
    lateMonthsCount: 5,
    amountDue: 500,
  },
  {
    membershipId: 'mem-002',
    fullName: 'Bernard Martin',
    lateMonthsCount: 3,
    amountDue: 300,
  },
  {
    membershipId: 'mem-003',
    fullName: 'Claire Petit',
    lateMonthsCount: 1,
    amountDue: 100,
  },
]

const meta: Meta<typeof RegulariserList> = {
  title: 'Organisms/RegulariserList',
  component: RegulariserList,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof RegulariserList>

export const WithItems: Story = {
  args: {
    items: THREE_ITEMS,
    onRelancer: fn(),
    onMemberClick: fn(),
    labels: LABELS,
    formatAmount,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    // Verify first item is rendered
    expect(canvas.getByText('Alice Durand')).toBeInTheDocument()
    expect(canvas.getByText('Bernard Martin')).toBeInTheDocument()
    expect(canvas.getByText('Claire Petit')).toBeInTheDocument()

    // Click Relancer on the first item (Alice Durand)
    const relancerBtn = canvas.getByRole('button', { name: 'Relancer – Alice Durand' })
    await userEvent.click(relancerBtn)
    expect(args.onRelancer).toHaveBeenCalledWith('mem-001')

    // Verify the row click does NOT propagate when clicking Relancer
    expect(args.onMemberClick).not.toHaveBeenCalled()
  },
}

export const Empty: Story = {
  args: {
    items: [],
    onRelancer: fn(),
    onMemberClick: fn(),
    labels: LABELS,
    formatAmount,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify EmptyState renders with correct title
    expect(canvas.getByText('Tout le monde est à jour')).toBeInTheDocument()
    expect(canvas.getByText("Aucun membre n'a de cotisation en retard.")).toBeInTheDocument()
  },
}
