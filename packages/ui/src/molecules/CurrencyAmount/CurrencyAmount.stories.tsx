import type { Meta, StoryObj } from '@storybook/react'
import { CurrencyAmount } from './CurrencyAmount'

const meta: Meta<typeof CurrencyAmount> = {
  title: 'Molecules/CurrencyAmount',
  component: CurrencyAmount,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof CurrencyAmount>

/** Rendu : "1 234,56 €" */
export const Default: Story = {
  args: {
    amount: 1234.56,
  },
}

/** Rendu : "−1 234,56 €" (signe moins U+2212, NBSP comme séparateur milliers) */
export const Negative: Story = {
  args: {
    amount: -1234.56,
  },
}

/** Rendu : "+1 234,56 €" (signe explicite positif) */
export const PositiveWithSign: Story = {
  args: {
    amount: 1234.56,
    showSign: true,
  },
}

/** Rendu : "—" (NaN → fallback tiret cadratin) */
export const Invalid: Story = {
  args: {
    amount: NaN,
  },
}

/** Taille xl — pour le héros du dashboard */
export const Xl: Story = {
  args: {
    amount: 65574.87,
    size: 'xl',
  },
}

/** Taille sm */
export const Sm: Story = {
  args: {
    amount: 1234.56,
    size: 'sm',
  },
}

/** Taille lg */
export const Lg: Story = {
  args: {
    amount: 1234.56,
    size: 'lg',
  },
}
