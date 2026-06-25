import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { OperationsTable } from './OperationsTable'
import type { OperationListItemData } from '../../molecules/OperationListItem'
import { withDarkTheme } from '../../test/darkDecorator'

const OPS: OperationListItemData[] = [
  {
    id: 'OP-318',
    type: 'contribution',
    label: 'Éric Lambert',
    meta: 'Cotisation de juin',
    date: '18 juin 2026',
    amount: 300,
    source: 'manual',
    status: 'ok',
  },
  {
    id: 'OP-317',
    type: 'contribution',
    label: 'Mehdi Brahimi',
    meta: 'Cotisation de juin',
    date: '17 juin 2026',
    amount: 300,
    source: 'manual',
    status: 'ok',
  },
  {
    id: 'OP-316',
    type: 'dividend_cash',
    label: 'Sanofi',
    meta: 'Dividende en espèces',
    date: '16 juin 2026',
    amount: 1240,
    source: 'manual',
    status: 'ok',
  },
  {
    id: 'OP-314',
    type: 'sell',
    label: 'LVMH',
    meta: '8 titres @ 672,50 €',
    date: '12 juin 2026',
    amount: 5380,
    source: 'manual',
    status: 'ok',
  },
  {
    id: 'OP-313',
    type: 'fee',
    label: 'Frais de courtage',
    meta: 'Bourse Direct',
    date: '12 juin 2026',
    amount: -18,
    source: 'manual',
    status: 'ok',
  },
  {
    id: 'OP-310',
    type: 'buy',
    label: 'NASDAQ:NVDA',
    meta: '160 titres @ 155 €',
    date: '10 juin 2026',
    amount: -24800,
    source: 'manual',
    status: 'ok',
  },
  {
    id: 'OP-298',
    type: 'contribution',
    label: 'Sofia Rossi',
    meta: 'Cotisation de mai · 150 parts',
    date: '16 mai 2026',
    amount: 300,
    source: 'manual',
    status: 'settled',
  },
  {
    id: 'OP-274',
    type: 'buy',
    label: 'ASML',
    meta: '20 titres @ 620 €',
    date: '2 mai 2026',
    amount: -12400,
    source: 'migrated',
    status: 'ok',
  },
  {
    id: 'OP-241',
    type: 'contribution',
    label: 'Éric Lambert',
    meta: "Cotisation d'avril",
    date: '18 avr. 2026',
    amount: 300,
    source: 'migrated',
    status: 'cancelled',
  },
  {
    id: 'OP-238',
    type: 'dividend_cash',
    label: 'TotalEnergies',
    meta: 'Dividende en espèces',
    date: '12 avr. 2026',
    amount: 860,
    source: 'migrated',
    status: 'ok',
  },
]

const FILTERS = [
  { key: 'type', label: 'Type', value: 'Tous' },
  { key: 'member', label: 'Membre', value: 'Tous' },
  { key: 'period', label: 'Période', value: '6 derniers mois' },
]

const meta: Meta<typeof OperationsTable> = {
  title: 'Organisms/OperationsTable',
  component: OperationsTable,
  parameters: { layout: 'fullscreen' },
  args: {
    operations: OPS,
    filters: FILTERS,
    onSelectOperation: fn(),
    onNewOperation: fn(),
    onFilterClick: fn(),
    onRetry: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--bg)', padding: 32 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Story />
        </div>
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof OperationsTable>

export const Ready: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Toutes les opérations')).toBeInTheDocument()
    await userEvent.click(canvas.getAllByRole('button', { name: 'Sanofi' })[0]!)
    await expect(args.onSelectOperation).toHaveBeenCalledWith('OP-316')
  },
}

export const NewOperation: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '+ Nouvelle opération' }))
    await expect(args.onNewOperation).toHaveBeenCalled()
  },
}

export const Empty: Story = {
  args: { state: 'empty', operations: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('Aucune opération enregistrée')
    ).toBeInTheDocument()
  },
}

export const Loading: Story = { args: { state: 'loading' } }

export const ErrorState: Story = {
  args: { state: 'error' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Réessayer' }))
    await expect(args.onRetry).toHaveBeenCalled()
  },
}

export const WithPagination: Story = {
  args: { hasMore: true, onLoadMore: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Voir plus' }))
    await expect(args.onLoadMore).toHaveBeenCalled()
  },
}

export const Dark: Story = { decorators: [withDarkTheme] }
export const DarkEmpty: Story = {
  args: { state: 'empty', operations: [] },
  decorators: [withDarkTheme],
}
