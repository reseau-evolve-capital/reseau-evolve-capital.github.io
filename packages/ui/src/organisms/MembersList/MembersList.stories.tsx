import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { MembersList, type MemberRow } from './MembersList'

const MEMBERS: MemberRow[] = [
  {
    id: '1',
    fullName: 'AFOUDAH Ruben',
    email: 'ruben@x.fr',
    role: 'treasurer',
    totalContributed: 4200,
    detentionPct: 0.18,
    monthsCount: 24,
    status: 'ok',
  },
  {
    id: '2',
    fullName: 'BAMBA Inès',
    email: 'ines@x.fr',
    role: 'member',
    totalContributed: 1200,
    detentionPct: 0.05,
    monthsCount: 12,
    status: 'late',
  },
  {
    id: '3',
    fullName: 'COLY Marc',
    email: 'marc@x.fr',
    role: 'member',
    totalContributed: 800,
    detentionPct: 0.03,
    monthsCount: 8,
    status: 'pending',
  },
]

const meta: Meta<typeof MembersList> = {
  title: 'Organisms/MembersList',
  component: MembersList,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-6 bg-bg-page min-h-screen">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof MembersList>

export const Default: Story = {
  args: { members: MEMBERS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 3 lignes membres
    const rows = canvas.getAllByTestId('member-row')
    await expect(rows).toHaveLength(3)

    // Présence de « En retard » (statut BAMBA Inès)
    await expect(canvas.getByText('En retard')).toBeInTheDocument()

    // Clic sur l'en-tête « Membre » → tri croissant par nom
    const membreHeader = canvas.getByRole('columnheader', { name: /Membre/i })
    const sortBtn = within(membreHeader).getByRole('button')
    await userEvent.click(sortBtn)

    // Après tri croissant : AFOUDAH doit être en premier
    const updatedRows = canvas.getAllByTestId('member-row')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await expect(within(updatedRows[0]!).getByText('AFOUDAH Ruben')).toBeInTheDocument()
  },
}

export const Loading: Story = {
  args: { members: [], isLoading: true },
}

export const Empty: Story = {
  args: { members: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Aucun membre')).toBeInTheDocument()
  },
}
