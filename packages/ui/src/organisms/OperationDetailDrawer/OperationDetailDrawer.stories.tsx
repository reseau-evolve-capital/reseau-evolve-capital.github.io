import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { OperationDetailDrawer, type OperationDetail } from './OperationDetailDrawer'
import { withDarkTheme } from '../../test/darkDecorator'

const OK: OperationDetail = {
  id: 'OP-310',
  type: 'buy',
  label: 'NASDAQ:NVDA',
  meta: '160 titres @ 155 €',
  date: '10 juin 2026',
  amount: -24800,
  ref: 'BD-NVDA-0610',
  source: 'manual',
  status: 'ok',
}
const SETTLED: OperationDetail = {
  id: 'OP-298',
  type: 'contribution',
  label: 'Sofia Rossi',
  meta: 'Cotisation de mai · 150 parts',
  date: '16 mai 2026',
  amount: 300,
  ref: 'VIR-2026-0516',
  source: 'manual',
  status: 'settled',
}
const CANCELLED: OperationDetail = {
  id: 'OP-241',
  type: 'contribution',
  label: 'Éric Lambert',
  meta: "Cotisation d'avril",
  date: '18 avr. 2026',
  amount: 300,
  ref: null,
  source: 'migrated',
  status: 'cancelled',
  cancelReason: 'Doublon de saisie lors de la migration de la matrice.',
}

function Harness({ op, ...rest }: { op: OperationDetail; onCancelRequest?: () => void }) {
  const [open, setOpen] = React.useState(true)
  return (
    <div style={{ minHeight: 600, background: 'var(--bg)' }}>
      <OperationDetailDrawer open={open} onOpenChange={setOpen} operation={op} {...rest} />
    </div>
  )
}

const meta: Meta<typeof OperationDetailDrawer> = {
  title: 'Organisms/OperationDetailDrawer',
  component: OperationDetailDrawer,
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof OperationDetailDrawer>

export const Annulable: Story = {
  render: () => <Harness op={OK} onCancelRequest={fn()} />,
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body
    await waitFor(() => expect(within(body).getByRole('dialog')).toBeInTheDocument())
    await expect(within(body).getByRole('button', { name: "Annuler l'opération" })).toBeEnabled()
    await expect(within(body).getByText('−24 800 €')).toBeInTheDocument()
  },
}

export const Settled: Story = {
  render: () => <Harness op={SETTLED} />,
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body
    await waitFor(() => expect(within(body).getByRole('dialog')).toBeInTheDocument())
    const btn = within(body).getByRole('button', { name: "Annuler l'opération" })
    await expect(btn).toBeDisabled()
    await expect(within(body).getByText(/passe par une correction/)).toBeInTheDocument()
  },
}

export const Annulee: Story = {
  render: () => <Harness op={CANCELLED} />,
  play: async ({ canvasElement }) => {
    const body = canvasElement.ownerDocument.body
    await waitFor(() => expect(within(body).getByRole('dialog')).toBeInTheDocument())
    await expect(within(body).getByText(/conservée pour l’historique/)).toBeInTheDocument()
    await expect(within(body).getByText(/Doublon de saisie/)).toBeInTheDocument()
  },
}

export const CancelRequest: Story = {
  render: (args) => <Harness op={OK} onCancelRequest={args.onCancelRequest} />,
  args: { onCancelRequest: fn() },
  play: async ({ canvasElement, args }) => {
    const body = canvasElement.ownerDocument.body
    await waitFor(() => expect(within(body).getByRole('dialog')).toBeInTheDocument())
    await userEvent.click(within(body).getByRole('button', { name: "Annuler l'opération" }))
    await expect(args.onCancelRequest).toHaveBeenCalled()
  },
}

export const DarkAnnulable: Story = {
  decorators: [withDarkTheme],
  render: () => <Harness op={OK} onCancelRequest={fn()} />,
}
export const DarkAnnulee: Story = {
  decorators: [withDarkTheme],
  render: () => <Harness op={CANCELLED} />,
}
