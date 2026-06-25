import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CashBalanceCard } from './CashBalanceCard'
import { withDarkTheme } from '../../test/darkDecorator'

const meta: Meta<typeof CashBalanceCard> = {
  title: 'Molecules/CashBalanceCard',
  component: CashBalanceCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { balance: 86260, computedAtLabel: 'Calculé il y a 3 min' },
}
export default meta
type Story = StoryObj<typeof CashBalanceCard>

export const Ok: Story = {
  args: {
    balance: 86260,
    computedAtLabel: 'Calculé il y a 3 min',
    brokerReconciliation: { consistent: true, brokerName: 'Bourse Direct', onOpen: fn() },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText(/86/)).toBeTruthy()
    await expect(c.getByText('Solde espèces')).toBeTruthy()
  },
}

export const BrokerReconciliationClick: Story = {
  args: {
    balance: 86260,
    brokerReconciliation: { consistent: true, brokerName: 'Bourse Direct', onOpen: fn() },
  },
  play: async ({ canvasElement, args }) => {
    const btn = canvasElement.querySelector('[role="button"]') as HTMLElement
    await expect(btn).toBeTruthy()
    await userEvent.click(btn)
    await expect(args.brokerReconciliation!.onOpen).toHaveBeenCalled()
  },
}

export const Negative: Story = {
  args: { balance: -4200, computedAtLabel: 'Calculé il y a 1 min' },
  play: async ({ canvasElement }) => {
    // Le montant reste NEUTRE (text-text), jamais coloré en rouge.
    const amount = canvasElement.querySelector('[aria-live="polite"]') as HTMLElement
    await expect(amount.className).toContain('text-text')
    await expect(amount.className).not.toContain('data-negative')
  },
}

export const Empty: Story = {
  args: { balance: null, state: 'empty' },
  play: async ({ canvasElement }) => {
    const amount = canvasElement.querySelector('[aria-live="polite"]') as HTMLElement
    await expect(amount.textContent).toBe('—')
  },
}

export const Loading: Story = { args: { balance: null, state: 'loading' } }

export const Error: Story = {
  args: { balance: null, state: 'error', onRetry: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement)
    const retry = c.getByText('Réessayer')
    await userEvent.click(retry)
    await expect(args.onRetry).toHaveBeenCalled()
  },
}

/** Thème sombre — posé sur <html> par le décorateur global (requis pour que les
 *  tokens `@theme` Tailwind v4 basculent ; cf. note OpChip). */
export const Dark: Story = {
  decorators: [withDarkTheme],
  args: {
    balance: 86260,
    computedAtLabel: 'Calculé il y a 3 min',
    brokerReconciliation: { consistent: true, brokerName: 'Bourse Direct', onOpen: fn() },
  },
}
