import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { OperationsTable } from './OperationsTable'
import type { OperationListItemData } from '../../molecules/OperationListItem'

expect.extend(toHaveNoViolations)

const OPS: OperationListItemData[] = [
  {
    id: 'OP-318',
    type: 'contribution',
    label: 'Éric Lambert',
    meta: 'Cotisation de juin',
    date: '18 juin',
    amount: 300,
    source: 'manual',
    status: 'ok',
  },
  {
    id: 'OP-241',
    type: 'contribution',
    label: 'Doublon',
    meta: "Cotisation d'avril",
    date: '18 avr.',
    amount: 300,
    source: 'migrated',
    status: 'cancelled',
  },
]
const FILTERS = [
  { key: 'type', label: 'Type', value: 'Tous' },
  { key: 'period', label: 'Période', value: '6 derniers mois' },
]

describe('OperationsTable', () => {
  it('rend en-tête, filtres et lignes', () => {
    render(<OperationsTable operations={OPS} filters={FILTERS} />)
    expect(screen.getByRole('heading', { name: 'Toutes les opérations' })).toBeInTheDocument()
    expect(screen.getByText('6 derniers mois')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Éric Lambert' })).toBeInTheDocument()
  })

  it('onNewOperation au clic du CTA', () => {
    const onNewOperation = vi.fn()
    render(<OperationsTable operations={OPS} filters={FILTERS} onNewOperation={onNewOperation} />)
    fireEvent.click(screen.getByRole('button', { name: '+ Nouvelle opération' }))
    expect(onNewOperation).toHaveBeenCalled()
  })

  it('onSelectOperation au clic d’une ligne', () => {
    const onSelectOperation = vi.fn()
    render(
      <OperationsTable operations={OPS} filters={FILTERS} onSelectOperation={onSelectOperation} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Éric Lambert' }))
    expect(onSelectOperation).toHaveBeenCalledWith('OP-318')
  })

  it('état empty → encart + CTA première op', () => {
    const onNewOperation = vi.fn()
    render(
      <OperationsTable
        operations={[]}
        filters={FILTERS}
        state="empty"
        onNewOperation={onNewOperation}
      />
    )
    expect(screen.getByText('Aucune opération enregistrée')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ Enregistrer la première' }))
    expect(onNewOperation).toHaveBeenCalled()
  })

  it('état error → Réessayer', () => {
    const onRetry = vi.fn()
    render(<OperationsTable operations={[]} filters={FILTERS} state="error" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('état loading → aria-busy, pas de ligne cliquable', () => {
    const { container } = render(
      <OperationsTable operations={[]} filters={FILTERS} state="loading" />
    )
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Éric Lambert' })).not.toBeInTheDocument()
  })

  it('pagination « Voir plus » conditionnelle', () => {
    const onLoadMore = vi.fn()
    render(<OperationsTable operations={OPS} filters={FILTERS} hasMore onLoadMore={onLoadMore} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir plus' }))
    expect(onLoadMore).toHaveBeenCalled()
  })

  it('libellés surchargeables (i18n)', () => {
    render(
      <OperationsTable
        operations={OPS}
        filters={FILTERS}
        labels={{ title: 'All operations', newOperation: '+ New' }}
      />
    )
    expect(screen.getByRole('heading', { name: 'All operations' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New' })).toBeInTheDocument()
  })

  it('aucune violation a11y (ready)', async () => {
    const { container } = render(<OperationsTable operations={OPS} filters={FILTERS} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('aucune violation a11y (empty)', async () => {
    const { container } = render(
      <OperationsTable operations={[]} filters={FILTERS} state="empty" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
