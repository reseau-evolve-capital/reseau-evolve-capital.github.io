import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { OperationForm } from './OperationForm'
import { withDarkTheme } from '../../test/darkDecorator'

const MEMBERS = [
  { id: 'm1', label: 'Sofia Rossi' },
  { id: 'm2', label: 'Éric Lambert' },
  { id: 'm3', label: 'Mehdi Brahimi' },
]

const meta: Meta<typeof OperationForm> = {
  title: 'Organisms/OperationForm',
  component: OperationForm,
  parameters: { layout: 'fullscreen' },
  args: { members: MEMBERS, minContribution: 100, balanceBefore: 86260, onSubmit: fn() },
}
export default meta
type Story = StoryObj<typeof OperationForm>

/** Étape 1 — sélecteur de type. */
export const Step1Selector: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Quelle opération veux-tu enregistrer ?')).toBeTruthy()
    await expect(
      c.getAllByText(/Cotisation|Achat|Vente|Dividende|Frais|Pénalité/).length
    ).toBeGreaterThan(0)
  },
}

/** Étape 2 — cotisation pré-sélectionnée. */
export const Step2Contribution: Story = {
  args: { initialType: 'contribution' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByLabelText(/Membre/)).toBeTruthy()
    await expect(c.getByText("Enregistrer l'opération")).toBeTruthy()
  },
}

/** Étape 2 — achat (libellés canoniques Titre/Quantité/Prix unitaire + impact négatif). */
export const Step2Buy: Story = {
  args: { initialType: 'buy' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.type(c.getByLabelText(/^Titre/), 'NASDAQ:NVDA')
    await userEvent.type(c.getByLabelText(/Quantité/), '1505')
    await userEvent.type(c.getByLabelText(/Prix unitaire/), '154')
    // Impact cash négatif (1505 × 154 = 231 770).
    await expect(canvasElement.textContent).toContain('−')
  },
}

/** Avertissement cotisation < minimum (NON bloquant). */
export const ContributionUnderMin: Story = {
  args: { initialType: 'contribution', minContribution: 100 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.type(c.getByLabelText(/Montant/), '40')
    await expect(canvasElement.textContent).toContain('Sous la cotisation minimale')
    // Le submit reste autorisé (le bouton n'est pas désactivé).
    await expect(c.getByText("Enregistrer l'opération")).toBeEnabled()
  },
}

/** Flux complet jusqu'à la confirmation (étape 3). */
export const FullFlow: Story = {
  args: { initialType: 'contribution', balanceBefore: 86260, onSubmit: fn() },
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement)
    await userEvent.selectOptions(c.getByLabelText(/Membre/), 'm1')
    await userEvent.type(c.getByLabelText(/Montant/), '300')
    await userEvent.type(c.getByLabelText(/Date/), '2026-06-22')
    await userEvent.click(c.getByText("Enregistrer l'opération"))
    await expect(args.onSubmit).toHaveBeenCalled()
    await expect(c.getByText('Opération enregistrée')).toBeTruthy()
    // Transition de solde : 86 260 → 86 560.
    await expect(canvasElement.textContent).toContain('86 560')
  },
}

export const EnglishStep1: Story = {
  args: {
    labels: {
      title: 'New operation',
      back: 'Operations',
      step1Title: 'Which operation do you want to record?',
    },
  },
}

export const Step1Dark: Story = { decorators: [withDarkTheme] }
export const Step2Dark: Story = { decorators: [withDarkTheme], args: { initialType: 'buy' } }
