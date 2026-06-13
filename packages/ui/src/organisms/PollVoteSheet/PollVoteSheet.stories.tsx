import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect, waitFor } from 'storybook/test'

import { PollVoteSheet } from './PollVoteSheet'

const OPTIONS = [
  { id: 'tech', label: 'Technologie' },
  { id: 'immo', label: 'Immobilier' },
  { id: 'energie', label: 'Énergie renouvelable' },
  { id: 'sante', label: 'Santé' },
]

const meta: Meta<typeof PollVoteSheet> = {
  title: 'Organisms/PollVoteSheet',
  component: PollVoteSheet,
  tags: ['autodocs'],
  args: {
    open: true,
    onOpenChange: fn(),
    title: 'Faut-il diversifier vers les SCPI ?',
    description: 'Le comité propose d’allouer 8 % du portefeuille à des SCPI de rendement.',
    questionType: 'yes_no',
    closesAtLabel: '20 juin',
    onSubmit: fn(async () => {}),
  },
}
export default meta
type Story = StoryObj<typeof PollVoteSheet>

const dialog = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body)

/** Oui / Non — sélection « Oui », mention définitive apparaît, submit actif. */
export const YesNo: Story = {
  play: async ({ canvasElement }) => {
    const body = dialog(canvasElement)
    const submit = body.getByRole('button', { name: /Confirmer mon vote/i })
    await expect(submit).toBeDisabled()
    await userEvent.click(body.getByRole('radio', { name: 'Oui' }))
    await expect(body.getByText(/Votre réponse est définitive/)).toBeVisible()
    await expect(submit).toBeEnabled()
  },
}

/** Choix unique — radio exclusif. */
export const SingleChoice: Story = {
  args: {
    questionType: 'single_choice',
    options: OPTIONS,
    title: 'Quel secteur prioriser pour Q3 ?',
  },
  play: async ({ canvasElement }) => {
    const body = dialog(canvasElement)
    await userEvent.click(body.getByRole('radio', { name: 'Énergie renouvelable' }))
    await expect(body.getByRole('radio', { name: 'Énergie renouvelable' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  },
}

/** Choix multiple — checkbox group, note multiple. */
export const MultipleChoice: Story = {
  args: {
    questionType: 'multiple_choice',
    options: OPTIONS,
    title: 'Quels thèmes souhaitez-vous aborder en AG ?',
  },
  play: async ({ canvasElement }) => {
    const body = dialog(canvasElement)
    await expect(body.getByText('Vous pouvez sélectionner plusieurs réponses.')).toBeVisible()
    await userEvent.click(body.getByRole('checkbox', { name: 'Technologie' }))
    await userEvent.click(body.getByRole('checkbox', { name: 'Santé' }))
    await expect(body.getByRole('checkbox', { name: 'Santé' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  },
}

/** Réponse courte — note anonymat + compteur. */
export const ShortText: Story = {
  args: { questionType: 'short_text', title: 'Une remarque à formuler sur la stratégie ?' },
  play: async ({ canvasElement }) => {
    const body = dialog(canvasElement)
    await expect(body.getByText('0/280')).toBeVisible()
    await userEvent.type(body.getByRole('textbox'), 'Renforcer la transparence sur les frais.')
    await expect(body.getByRole('button', { name: /Confirmer mon vote/i })).toBeEnabled()
  },
}

/** État succès — after_close. */
export const SuccessAfterClose: Story = {
  play: async ({ canvasElement, args }) => {
    const body = dialog(canvasElement)
    await userEvent.click(body.getByRole('radio', { name: 'Oui' }))
    await userEvent.click(body.getByRole('button', { name: /Confirmer mon vote/i }))
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalled())
    await waitFor(() => expect(body.getByText('Vote enregistré')).toBeVisible())
  },
}
