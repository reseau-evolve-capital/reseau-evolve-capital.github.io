import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { OperationForm } from './OperationForm'

expect.extend(toHaveNoViolations)

const MEMBERS = [
  { id: 'm1', label: 'Sofia Rossi' },
  { id: 'm2', label: 'Éric Lambert' },
]

function setup(props = {}) {
  const onSubmit = vi.fn()
  const utils = render(<OperationForm members={MEMBERS} onSubmit={onSubmit} {...props} />)
  return { onSubmit, ...utils }
}

describe('OperationForm — étape 1', () => {
  it('affiche le titre et 6 cartes de type', () => {
    setup()
    expect(screen.getByText('Quelle opération veux-tu enregistrer ?')).toBeInTheDocument()
    expect(screen.getByText('Étape 1 / 3')).toBeInTheDocument()
  })

  it('sélection d’un type passe à l’étape 2', async () => {
    const u = userEvent.setup()
    setup()
    await u.click(screen.getByText('Cotisation'))
    expect(screen.getByText('Étape 2 / 3')).toBeInTheDocument()
    expect(screen.getByLabelText(/Membre/)).toBeInTheDocument()
  })
})

describe('OperationForm — étape 2 adaptative', () => {
  it('cotisation : membre + montant + date + réf virement + notes', () => {
    setup({ initialType: 'contribution' })
    expect(screen.getByLabelText(/Membre/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Montant/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Référence virement/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument()
  })

  it('achat : libellés canoniques Titre / Quantité / Prix unitaire', () => {
    setup({ initialType: 'buy' })
    expect(screen.getByLabelText(/^Titre/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Quantité/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Prix unitaire/)).toBeInTheDocument()
    // Pas de libellés interdits.
    expect(screen.queryByLabelText(/Actif/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Parts/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/PRU/)).not.toBeInTheDocument()
  })

  it('frais : pas de champ membre', () => {
    setup({ initialType: 'fee' })
    expect(screen.queryByLabelText(/Membre/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Montant/)).toBeInTheDocument()
  })

  it('« Changer de type » revient à l’étape 1', async () => {
    const u = userEvent.setup()
    setup({ initialType: 'contribution' })
    await u.click(screen.getByText('Changer de type'))
    expect(screen.getByText('Étape 1 / 3')).toBeInTheDocument()
  })
})

describe('OperationForm — impact cash en direct', () => {
  it('achat → impact négatif (qty × prix), MINUS U+2212', async () => {
    const u = userEvent.setup()
    const { container } = setup({ initialType: 'buy' })
    await u.type(screen.getByLabelText(/Quantité/), '160')
    await u.type(screen.getByLabelText(/Prix unitaire/), '155')
    // 160 × 155 = 24 800 → −24 800 (NBSP comme séparateur de milliers).
    expect(container.textContent).toContain('−')
    expect(container.textContent).toMatch(/24\s800/)
  })

  it('vente → impact positif', async () => {
    const u = userEvent.setup()
    const { container } = setup({ initialType: 'sell' })
    await u.type(screen.getByLabelText(/Quantité/), '8')
    await u.type(screen.getByLabelText(/Prix unitaire/), '672')
    expect(container.textContent).toMatch(/\+5\s?376|5 376/)
  })

  it('champ vide → impact « — », jamais NaN', () => {
    const { container } = setup({ initialType: 'buy' })
    expect(container.textContent).toContain('—')
    expect(container.textContent).not.toContain('NaN')
  })
})

describe('OperationForm — cotisation sous le minimum (warn, jamais reject)', () => {
  it('hint d’avertissement affiché, submit toujours possible', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <OperationForm
        members={MEMBERS}
        onSubmit={onSubmit}
        initialType="contribution"
        minContribution={100}
      />
    )
    await u.selectOptions(screen.getByLabelText(/Membre/), 'm1')
    await u.type(screen.getByLabelText(/Montant/), '40')
    await u.type(screen.getByLabelText(/Date/), '2026-06-22')
    expect(screen.getByText(/Sous la cotisation minimale du club/)).toBeInTheDocument()
    // Le bouton n'est pas désactivé : la soumission passe.
    await u.click(screen.getByText("Enregistrer l'opération"))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('OperationForm — validation requise', () => {
  it('submit sans champs requis → erreurs, pas de payload', async () => {
    const u = userEvent.setup()
    const { onSubmit } = setup({ initialType: 'contribution' })
    await u.click(screen.getByText("Enregistrer l'opération"))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })
})

describe('OperationForm — étape 3 confirmation', () => {
  it('payload métier complet + transition de solde', async () => {
    const u = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <OperationForm
        members={MEMBERS}
        onSubmit={onSubmit}
        initialType="contribution"
        balanceBefore={86260}
      />
    )
    await u.selectOptions(screen.getByLabelText(/Membre/), 'm1')
    await u.type(screen.getByLabelText(/Montant/), '300')
    await u.type(screen.getByLabelText(/Date/), '2026-06-22')
    await u.click(screen.getByText("Enregistrer l'opération"))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0]![0]
    expect(payload).toMatchObject({
      type: 'contribution',
      cashDelta: 300,
      membershipId: 'm1',
      operationDate: '2026-06-22',
    })
    expect(screen.getByText('Opération enregistrée')).toBeInTheDocument()
    // 86 260 → 86 560.
    expect(screen.getByText(/86 560/)).toBeInTheDocument()
  })

  it('« Nouvelle opération » réinitialise vers l’étape 1', async () => {
    const u = userEvent.setup()
    render(<OperationForm members={MEMBERS} initialType="fee" onSubmit={vi.fn()} />)
    await u.type(screen.getByLabelText(/Montant/), '18')
    await u.type(screen.getByLabelText(/Date/), '2026-06-12')
    await u.click(screen.getByText("Enregistrer l'opération"))
    await u.click(screen.getByRole('button', { name: /Nouvelle opération/ }))
    expect(screen.getByText('Étape 1 / 3')).toBeInTheDocument()
  })
})

describe('OperationForm — i18n & a11y', () => {
  it('libellés via props (EN)', () => {
    render(
      <OperationForm
        members={MEMBERS}
        onSubmit={vi.fn()}
        labels={{ title: 'New operation', step1Title: 'Which operation?' }}
      />
    )
    expect(screen.getByText('New operation')).toBeInTheDocument()
    expect(screen.getByText('Which operation?')).toBeInTheDocument()
  })

  it('jamais de rouge brand en dur', () => {
    const { container } = setup({ initialType: 'penalty' })
    expect(container.innerHTML).not.toMatch(/E93E3A/i)
  })

  it('aucune violation a11y (étape 1)', async () => {
    const { container } = setup()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('aucune violation a11y (étape 2 achat)', async () => {
    const { container } = setup({ initialType: 'buy' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
