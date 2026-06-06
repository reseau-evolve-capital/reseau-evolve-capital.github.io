import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AuthCard } from './AuthCard'

expect.extend(toHaveNoViolations)

const baseProps = {
  email: '',
  onEmailChange: () => undefined,
  onSubmit: () => undefined,
}

// --- Accessibilité sur les 4 états ---

describe('AuthCard — accessibilité (jest-axe)', () => {
  it('état idle : pas de violations axe', async () => {
    const { container } = render(<AuthCard {...baseProps} state="idle" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('état loading : pas de violations axe', async () => {
    const { container } = render(
      <AuthCard {...baseProps} state="loading" email="alice@evolve.fr" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('état error : pas de violations axe', async () => {
    const { container } = render(
      <AuthCard
        {...baseProps}
        state="error"
        email="alice@evolve.fr"
        errorMessage="Email non reconnu."
        onRetry={() => undefined}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('état success : pas de violations axe', async () => {
    const { container } = render(
      <AuthCard {...baseProps} state="success" email="alice@evolve.fr" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

// --- Règle brand-red : les erreurs utilisent data-negative, jamais brand-red ---

describe('AuthCard — règle brand-red (CLAUDE.md)', () => {
  it("l'état error ne contient JAMAIS #E93E3A (brand-red)", () => {
    const { container } = render(
      <AuthCard
        {...baseProps}
        state="error"
        email="alice@evolve.fr"
        errorMessage="Erreur de test"
        onRetry={() => undefined}
      />
    )
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
    expect(container.innerHTML).not.toContain('brand-red')
  })
})

// --- Rendu des 4 états ---

describe('AuthCard — rendu', () => {
  it('état idle : affiche le bouton de soumission', () => {
    const { getByRole } = render(<AuthCard {...baseProps} state="idle" />)
    expect(getByRole('button', { name: /recevoir le lien magique/i })).toBeTruthy()
  })

  it('état loading : le bouton est désactivé (aria-busy)', () => {
    const { getByRole } = render(
      <AuthCard {...baseProps} state="loading" email="alice@evolve.fr" />
    )
    // En état loading, le bouton affiche uniquement le spinner — on le retrouve via aria-label
    const button = getByRole('button', { name: /envoi en cours/i })
    expect(button).toBeDisabled()
  })

  it("état error : le message d'erreur est visible", () => {
    const { getByText } = render(
      <AuthCard
        {...baseProps}
        state="error"
        email="alice@evolve.fr"
        errorMessage="Email non reconnu."
        onRetry={() => undefined}
      />
    )
    expect(getByText('Email non reconnu.')).toBeTruthy()
  })

  it("état error : l'input est aria-invalid", () => {
    const { getByRole } = render(
      <AuthCard
        {...baseProps}
        state="error"
        email="alice@evolve.fr"
        errorMessage="Email non reconnu."
      />
    )
    const input = getByRole('textbox', { name: /email/i })
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('état error avec onRetry : le bouton Réessayer est présent', () => {
    const { getByRole } = render(
      <AuthCard
        {...baseProps}
        state="error"
        email="alice@evolve.fr"
        errorMessage="Erreur"
        onRetry={() => undefined}
      />
    )
    expect(getByRole('button', { name: /réessayer/i })).toBeTruthy()
  })

  it('état success : affiche le message de confirmation', () => {
    const { getByText } = render(
      <AuthCard {...baseProps} state="success" email="alice@evolve.fr" />
    )
    expect(getByText(/vérifie ta boîte email/i)).toBeTruthy()
  })
})
