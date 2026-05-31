import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { AuthCard } from './AuthCard'

const meta: Meta<typeof AuthCard> = {
  title: 'Organisms/AuthCard',
  component: AuthCard,
  tags: ['autodocs'],
  args: {
    email: '',
    onEmailChange: fn(),
    onSubmit: fn(),
    onRetry: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-screen items-center justify-center bg-bg-page p-4">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof AuthCard>

/** État initial — champ email vide */
export const Idle: Story = {
  args: {
    state: 'idle',
    email: '',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole('textbox', { name: /email/i })
    // Saisit un email
    await userEvent.type(input, 'alice@evolve.fr')
    // Soumet le formulaire
    const button = canvas.getByRole('button', { name: /recevoir le lien magique/i })
    await userEvent.click(button)
    expect(args.onSubmit).toHaveBeenCalled()
  },
}

/** Envoi en cours — bouton en état chargement */
export const Loading: Story = {
  args: {
    state: 'loading',
    email: 'alice@evolve.fr',
  },
}

/** Erreur — message d'erreur sous le champ + bouton Réessayer */
export const Error: Story = {
  args: {
    state: 'error',
    email: 'alice@evolve.fr',
    errorMessage: "Email non reconnu. Vérifie l'adresse saisie.",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Le message d'erreur doit être visible
    const errorMsg = canvas.getByText(/email non reconnu/i)
    expect(errorMsg).toBeTruthy()
    // L'input doit être aria-invalid
    const input = canvas.getByRole('textbox', { name: /email/i })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    // aria-describedby doit pointer vers le message d'erreur
    const describedById = input.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    const errorEl = canvasElement.querySelector(`#${describedById}`)
    expect(errorEl).toBeTruthy()
  },
}

/** Succès — confirmation de l'envoi du lien magique */
export const Success: Story = {
  args: {
    state: 'success',
    email: 'alice@evolve.fr',
  },
}
